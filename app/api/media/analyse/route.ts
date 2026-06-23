import { NextResponse } from "next/server";
import {
  analyseAndStoreMedia,
  EmptyMediaError,
  InvalidImageError,
  MediaTooLargeError,
  uploadFileToBuffer,
  UnsupportedMediaError
} from "@/lib/analysis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return jsonError("A media file is required.");
    }

    const analysis = await analyseAndStoreMedia({
      buffer: await uploadFileToBuffer(file),
      mimeType: file.type,
      originalName: file.name
    });

    return NextResponse.json({
      analysis_id: analysis.id,
      media_id: analysis.mediaId,
      file_hash: analysis.sha256,
      perceptual_hash: analysis.pHashes[0]?.hash ?? null,
      perceptual_hashes: analysis.pHashes,
      metadata_status: analysis.metadata.status,
      c2pa_status: analysis.c2pa.status,
      watermark_status: analysis.watermark.status,
      classifier_result: analysis.classifier.status,
      metadata: analysis.metadata
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
    const message = error instanceof Error ? error.message : "Failed to analyse media.";
    return jsonError(message, 500);
  }
}
