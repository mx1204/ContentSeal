import { randomUUID } from "node:crypto";
import { rm, writeFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import {
  EmptyMediaError,
  InvalidImageError,
  inspectImageContent,
  MediaTooLargeError,
  uploadFileToBuffer,
  UnsupportedMediaError
} from "@/lib/analysis";
import { sha256 } from "@/lib/hash";
import { ensureRuntimeDirs, mediaPathFor } from "@/lib/paths";
import { inspectC2pa } from "@/lib/providers/c2pa";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function extensionForMime(mimeType: string) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/avif") return "avif";
  return "bin";
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let temporaryPath: string | null = null;
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return jsonError("A media file is required.");
    }
    await ensureRuntimeDirs();
    const buffer = await uploadFileToBuffer(file);
    const { decodedMimeType } = await inspectImageContent(buffer);
    temporaryPath = mediaPathFor(randomUUID(), extensionForMime(decodedMimeType));
    await writeFile(temporaryPath, buffer);
    const result = await inspectC2pa({
      sha256: sha256(buffer),
      filePath: temporaryPath
    });

    return NextResponse.json({
      c2pa_status: result.status,
      claim_generator: result.claimGenerator,
      actions: result.actions,
      signature_status: result.signatureStatus,
      summary: result.summary,
      raw: result.raw
    });
  } catch (error) {
    if (error instanceof UnsupportedMediaError) {
      return jsonError(error.message, 415);
    }
    if (error instanceof InvalidImageError) {
      return jsonError(error.message, 415);
    }
    if (error instanceof EmptyMediaError) {
      return jsonError(error.message, 400);
    }
    if (error instanceof MediaTooLargeError) {
      return jsonError(error.message, 413);
    }
    const message = error instanceof Error ? error.message : "Failed to inspect C2PA.";
    return jsonError(message, 500);
  } finally {
    if (temporaryPath) {
      await rm(temporaryPath, { force: true });
    }
  }
}
