import { NextResponse } from "next/server";
import { readStoredMediaBuffer } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const storedMedia = await readStoredMediaBuffer(id);
  if (!storedMedia) {
    return NextResponse.json({ error: "Media asset not found." }, { status: 404 });
  }

  return new Response(new Uint8Array(storedMedia.buffer), {
    headers: {
      "Content-Type": storedMedia.mimeType,
      "Content-Length": String(storedMedia.buffer.byteLength),
      "Cache-Control": "private, max-age=3600"
    }
  });
}
