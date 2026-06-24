import { NextResponse } from "next/server";
import {
  analyseAndStoreMedia,
  EmptyMediaError,
  fetchRemoteImageToBuffer,
  InvalidImageError,
  MediaTooLargeError,
  RemoteMediaFetchError,
  uploadFileToBuffer,
  UnsafeRemoteUrlError,
  UnsupportedMediaError
} from "@/lib/analysis";
import { verifyAnalysis } from "@/lib/verification";
import type { PortableProofReceipt, PHashResult, ReceiptSummary } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parsePortableProofs(formData: FormData): PortableProofReceipt[] {
  const raw = String(formData.get("client_proofs") ?? "");
  if (!raw || raw.length > 250_000) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.slice(0, 50).flatMap((item) => {
      if (!isRecord(item) || !isRecord(item.receipt) || !Array.isArray(item.pHashes)) {
        return [];
      }

      const receipt = item.receipt;
      const id = String(receipt.id ?? "");
      const title = String(receipt.title ?? "");
      const creatorClaim = String(receipt.creatorClaim ?? "");
      const proofCreatedAt = String(receipt.proofCreatedAt ?? "");
      const mediaId = String(receipt.mediaId ?? "");
      const sha256 = String(receipt.sha256 ?? "");
      const metadataStatus = receipt.metadataStatus;
      if (!id || !title || !creatorClaim || !proofCreatedAt || !mediaId || !sha256) {
        return [];
      }
      if (!["present", "missing", "partial"].includes(String(metadataStatus))) {
        return [];
      }

      const pHashes = item.pHashes.flatMap((hashItem): PHashResult[] => {
        if (!isRecord(hashItem)) {
          return [];
        }
        const variant = String(hashItem.variant);
        const hash = String(hashItem.hash ?? "");
        const width = Number(hashItem.width);
        const height = Number(hashItem.height);
        if (!["full", "trimmed", "center_crop"].includes(variant) || !hash || !width || !height) {
          return [];
        }
        return [{ variant: variant as PHashResult["variant"], hash, width, height }];
      });

      if (pHashes.length === 0) {
        return [];
      }

      return [
        {
          receipt: receipt as unknown as ReceiptSummary,
          pHashes
        }
      ];
    });
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const imageUrl = String(formData.get("image_url") ?? "").trim();
    const hasUpload = file instanceof File && file.size > 0;
    const input = hasUpload
      ? {
          buffer: await uploadFileToBuffer(file),
          mimeType: file.type,
          originalName: file.name
        }
      : imageUrl
        ? await fetchRemoteImageToBuffer(imageUrl)
        : null;

    if (!input) {
      return jsonError("Upload an image file or paste a direct image URL.");
    }

    const analysis = await analyseAndStoreMedia(input);
    const verification = await verifyAnalysis(analysis, parsePortableProofs(formData));

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
    if (error instanceof UnsafeRemoteUrlError) {
      return jsonError(error.message, 400);
    }
    if (error instanceof RemoteMediaFetchError) {
      return jsonError(error.message, 502);
    }
    const message = error instanceof Error ? error.message : "Failed to verify media.";
    return jsonError(message, 500);
  }
}
