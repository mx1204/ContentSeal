import { randomUUID } from "node:crypto";
import { rm, writeFile } from "node:fs/promises";
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
