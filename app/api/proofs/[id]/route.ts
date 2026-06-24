import { NextResponse } from "next/server";
import { deleteProofReceiptStore, getReceiptStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const receipt = await getReceiptStore(id);
  if (!receipt) {
    return NextResponse.json({ error: "Proof receipt not found." }, { status: 404 });
  }

  return NextResponse.json({
    receipt,
    media_url: `/api/media/${receipt.mediaId}`
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const result = await deleteProofReceiptStore(id);

  if (!result.deleted) {
    return NextResponse.json({ error: "Proof receipt not found." }, { status: 404 });
  }

  return NextResponse.json({
    deleted: true,
    media_id: result.mediaId,
    removed_media_file: result.removedMediaFile
  });
}
