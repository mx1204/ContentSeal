import { NextResponse } from "next/server";
import {
  analyseAndStoreMedia,
  EmptyMediaError,
  InvalidImageError,
  MediaTooLargeError,
  uploadFileToBuffer,
  UnsupportedMediaError
} from "@/lib/analysis";
import { getReceipt, insertProofReceipt, listReceipts } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  return NextResponse.json({
    receipts: listReceipts()
  });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return jsonError("A media file is required.");
    }

    const title = String(formData.get("title") ?? "").trim() || file.name || "Untitled proof";
    const creatorClaim =
      String(formData.get("creator_claim") ?? "").trim() || "Unspecified creator claim";
    const analysis = await analyseAndStoreMedia({
      buffer: await uploadFileToBuffer(file),
      mimeType: file.type,
      originalName: file.name
    });
    const receiptId = insertProofReceipt({
      title,
      creatorClaim,
      mediaId: analysis.mediaId ?? ""
    });
    const receipt = getReceipt(receiptId);

    return NextResponse.json(
      {
        receipt_id: receiptId,
        proof_url: `/proofs/${receiptId}`,
        file_hash: analysis.sha256,
        metadata_status: analysis.metadata.status,
        perceptual_hashes: analysis.pHashes,
        receipt,
        analysis
      },
      { status: 201 }
    );
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
    const message = error instanceof Error ? error.message : "Failed to create proof receipt.";
    return jsonError(message, 500);
  }
}
