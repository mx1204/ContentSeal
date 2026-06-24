import { randomUUID } from "node:crypto";
import { lookup } from "node:dns/promises";
import { rm, writeFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import type { DetectionSignalInput } from "./db";
import { sha256 } from "./hash";
import { extractRedactedMetadata, hasEditSoftwareSignal } from "./metadata";
import { extractOcrText } from "./ocr";
import { ensureRuntimeDirs, mediaPathFor } from "./paths";
import { computePHashVariants } from "./phash";
import { inspectAiClassifier } from "./providers/classifier";
import { inspectC2pa } from "./providers/c2pa";
import { inspectWatermark } from "./providers/watermark";
import {
  SUPPORTED_IMAGE_MIME_TYPES,
  type MediaAnalysis,
  type SupportedImageMimeType
} from "./types";
import { storeMediaAnalysis } from "./store";

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

const EXTENSIONS_BY_MIME: Record<SupportedImageMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif"
};

const MIME_BY_SHARP_FORMAT: Record<string, SupportedImageMimeType> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif"
};

export class UnsupportedMediaError extends Error {
  constructor(mimeType: string) {
    super(
      `Unsupported media type "${mimeType}". ContentSeal currently supports JPEG, PNG, WebP, and AVIF images.`
    );
    this.name = "UnsupportedMediaError";
  }
}

export class MediaTooLargeError extends Error {
  constructor(sizeBytes: number) {
    super(
      `File is ${Math.ceil(sizeBytes / (1024 * 1024))} MB. ContentSeal currently accepts images up to 20 MB.`
    );
    this.name = "MediaTooLargeError";
  }
}

export class EmptyMediaError extends Error {
  constructor() {
    super("Uploaded media file is empty.");
    this.name = "EmptyMediaError";
  }
}

export class InvalidImageError extends Error {
  constructor() {
    super("Uploaded file could not be decoded as a supported image.");
    this.name = "InvalidImageError";
  }
}

export class UnsafeRemoteUrlError extends Error {
  constructor(message = "Remote image URL is not allowed.") {
    super(message);
    this.name = "UnsafeRemoteUrlError";
  }
}

export class RemoteMediaFetchError extends Error {
  constructor(message = "Could not fetch the remote image URL.") {
    super(message);
    this.name = "RemoteMediaFetchError";
  }
}

export function assertSupportedImageMime(mimeType: string): asserts mimeType is SupportedImageMimeType {
  if (!SUPPORTED_IMAGE_MIME_TYPES.includes(mimeType as SupportedImageMimeType)) {
    throw new UnsupportedMediaError(mimeType || "unknown");
  }
}

function mimeTypeForDecodedFormat(format: string | undefined) {
  return format ? MIME_BY_SHARP_FORMAT[format] : undefined;
}

export async function inspectImageContent(buffer: Buffer) {
  let metadata: Awaited<ReturnType<typeof extractRedactedMetadata>>;
  try {
    metadata = await extractRedactedMetadata(buffer, buffer.byteLength);
  } catch {
    throw new InvalidImageError();
  }

  const decodedMimeType = mimeTypeForDecodedFormat(metadata.format);
  if (!decodedMimeType) {
    throw new UnsupportedMediaError(metadata.format ?? "unknown");
  }

  return { metadata, decodedMimeType };
}

export function assertSupportedUpload(file: File) {
  assertSupportedImageMime(file.type);
  if (file.size === 0) {
    throw new EmptyMediaError();
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new MediaTooLargeError(file.size);
  }
}

export async function uploadFileToBuffer(file: File) {
  assertSupportedUpload(file);
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }

  const [first, second] = parts;
  return (
    first === 10 ||
    first === 127 ||
    first === 0 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

function isPrivateIpv6(hostname: string) {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  );
}

export function isBlockedRemoteHostname(hostname: string) {
  const normalized = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!normalized || normalized === "localhost" || normalized.endsWith(".localhost")) {
    return true;
  }
  if (net.isIP(normalized) === 4) {
    return isPrivateIpv4(normalized);
  }
  if (net.isIP(normalized) === 6) {
    return isPrivateIpv6(normalized);
  }
  return false;
}

async function assertRemoteUrlIsSafe(url: URL) {
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new UnsafeRemoteUrlError("Only http and https image URLs can be scanned.");
  }
  if (url.username || url.password) {
    throw new UnsafeRemoteUrlError("Image URLs with embedded credentials are not allowed.");
  }
  if (isBlockedRemoteHostname(url.hostname)) {
    throw new UnsafeRemoteUrlError("Local, private, or loopback image URLs are not allowed.");
  }

  const resolved = await lookup(url.hostname, { all: true, verbatim: true }).catch(() => []);
  if (resolved.some((entry) => isBlockedRemoteHostname(entry.address))) {
    throw new UnsafeRemoteUrlError("Image URL resolves to a private or loopback address.");
  }
}

function filenameFromRemoteUrl(url: URL) {
  const basename = path.basename(url.pathname) || "remote-image";
  return basename.includes(".") ? basename : `${basename}.image`;
}

export async function fetchRemoteImageToBuffer(imageUrl: string) {
  let currentUrl: URL;
  try {
    currentUrl = new URL(imageUrl);
  } catch {
    throw new UnsafeRemoteUrlError("Enter a valid direct image URL.");
  }

  for (let redirectCount = 0; redirectCount < 4; redirectCount += 1) {
    await assertRemoteUrlIsSafe(currentUrl);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    let response: Response;
    try {
      response = await fetch(currentUrl, {
        redirect: "manual",
        signal: controller.signal
      });
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === "AbortError") {
        throw new RemoteMediaFetchError("Remote image request timed out.");
      }
      throw new RemoteMediaFetchError();
    }
    clearTimeout(timeout);

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        throw new RemoteMediaFetchError("Remote image redirect did not include a target URL.");
      }
      currentUrl = new URL(location, currentUrl);
      continue;
    }

    if (!response.ok) {
      throw new RemoteMediaFetchError(`Remote image returned HTTP ${response.status}.`);
    }

    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? "";
    assertSupportedImageMime(contentType);

    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > MAX_UPLOAD_BYTES) {
      throw new MediaTooLargeError(contentLength);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength === 0) {
      throw new EmptyMediaError();
    }
    if (buffer.byteLength > MAX_UPLOAD_BYTES) {
      throw new MediaTooLargeError(buffer.byteLength);
    }

    return {
      buffer,
      mimeType: contentType,
      originalName: filenameFromRemoteUrl(currentUrl)
    };
  }

  throw new UnsafeRemoteUrlError("Remote image URL redirected too many times.");
}

function signal(input: Omit<DetectionSignalInput, "analysisId">): Omit<DetectionSignalInput, "analysisId"> {
  return input;
}

export async function analyseAndStoreMedia(input: {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
}) {
  assertSupportedImageMime(input.mimeType);
  if (input.buffer.byteLength === 0) {
    throw new EmptyMediaError();
  }
  if (input.buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new MediaTooLargeError(input.buffer.byteLength);
  }
  await ensureRuntimeDirs();

  const fileHash = sha256(input.buffer);
  const analysisId = randomUUID();
  const createdAt = new Date().toISOString();
  const { metadata, decodedMimeType } = await inspectImageContent(input.buffer);

  const aspectRatio =
    metadata.width && metadata.height && metadata.height > 0
      ? metadata.width / metadata.height
      : undefined;
  let pHashes: Awaited<ReturnType<typeof computePHashVariants>>;
  try {
    pHashes = await computePHashVariants(input.buffer, aspectRatio);
  } catch {
    throw new InvalidImageError();
  }

  const mediaIdForPath = randomUUID();
  const extension = EXTENSIONS_BY_MIME[decodedMimeType];
  const storagePath = mediaPathFor(mediaIdForPath, extension);
  await writeFile(storagePath, input.buffer);

  try {
    const c2pa = await inspectC2pa({ sha256: fileHash, filePath: storagePath });
    const watermark = await inspectWatermark({ sha256: fileHash });
    const classifier = await inspectAiClassifier({ sha256: fileHash });
    const ocr = await extractOcrText(input.buffer);

    const signalTemplates = [
      signal({
        signalType: "hash",
        signalValue: fileHash,
        confidence: 1,
        explanation: "SHA-256 hash computed for exact file comparison."
      }),
      signal({
        signalType: "phash",
        signalValue: JSON.stringify(pHashes.map((item) => ({ variant: item.variant, hash: item.hash }))),
        confidence: null,
        explanation: "Perceptual hashes computed for visual similarity matching."
      }),
      signal({
        signalType: "metadata",
        signalValue: metadata.status,
        confidence: hasEditSoftwareSignal(metadata) ? 0.8 : null,
        explanation: metadata.software
          ? `Public metadata reports software: ${metadata.software}.`
          : `Metadata status is ${metadata.status}.`
      }),
      signal({
        signalType: "c2pa",
        signalValue: c2pa.status,
        confidence: c2pa.status === "present" ? 1 : null,
        explanation: c2pa.summary ?? `C2PA status is ${c2pa.status}.`
      }),
      signal({
        signalType: "watermark",
        signalValue: watermark.status,
        confidence: watermark.confidence ?? null,
        explanation: watermark.explanation
      }),
      signal({
        signalType: "classifier",
        signalValue: classifier.status,
        confidence: classifier.confidence ?? null,
        explanation: classifier.limitations
      }),
      signal({
        signalType: "ocr",
        signalValue: ocr.status,
        confidence: ocr.status === "completed" ? 0.7 : null,
        explanation:
          ocr.status === "completed"
            ? "OCR text fingerprint captured for conflict checks."
            : "OCR did not produce a usable text fingerprint."
      })
    ];

    const detectionSignals = signalTemplates.map((item) => ({
      ...item,
      analysisId
    }));

    const mediaId = await storeMediaAnalysis({
      buffer: input.buffer,
      extension,
      storagePath,
      originalName: input.originalName || path.basename(storagePath),
      mimeType: decodedMimeType,
      sizeBytes: input.buffer.byteLength,
      sha256: fileHash,
      width: metadata.width,
      height: metadata.height,
      metadataStatus: metadata.status,
      metadata,
      ocrText: ocr.text,
      pHashes,
      analysisId,
      c2paStatus: c2pa.status,
      watermarkStatus: watermark.status,
      classifierStatus: classifier.status,
      classifierConfidence: classifier.confidence,
      ocrStatus: ocr.status,
      createdAt,
      detectionSignals
    });

    return {
      id: analysisId,
      mediaId,
      sha256: fileHash,
      mimeType: decodedMimeType,
      sizeBytes: input.buffer.byteLength,
      metadata,
      pHashes,
      c2pa,
      watermark,
      classifier,
      ocrText: ocr.text,
      ocrStatus: ocr.status,
      createdAt
    } satisfies MediaAnalysis;
  } catch (error) {
    await rm(storagePath, { force: true });
    throw error;
  }
}
