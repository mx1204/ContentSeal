import { NextResponse } from "next/server";
import { getReceipt } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const receipt = getReceipt(id);
  if (!receipt) {
    return NextResponse.json({ error: "Proof receipt not found." }, { status: 404 });
  }

  return NextResponse.json({
    receipt,
    media_url: `/api/media/${receipt.mediaId}`
  });
}
