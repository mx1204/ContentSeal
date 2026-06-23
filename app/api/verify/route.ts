import { NextResponse } from "next/server";
import {
  analyseAndStoreMedia,
  EmptyMediaError,
  InvalidImageError,
  MediaTooLargeError,
  uploadFileToBuffer,
  UnsupportedMediaError
} from "@/lib/analysis";
import { verifyAnalysis } from "@/lib/verification";

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
    const verification = await verifyAnalysis(analysis);

    return NextResponse.json(verification);
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
    const message = error instanceof Error ? error.message : "Failed to verify media.";
    return jsonError(message, 500);
  }
}
