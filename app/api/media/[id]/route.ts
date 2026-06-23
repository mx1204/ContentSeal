import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { getAsset } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const asset = getAsset(id);
  if (!asset) {
    return NextResponse.json({ error: "Media asset not found." }, { status: 404 });
  }

  const buffer = await readFile(asset.storagePath);
  return new Response(buffer, {
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Length": String(buffer.byteLength),
      "Cache-Control": "private, max-age=3600"
    }
  });
}
