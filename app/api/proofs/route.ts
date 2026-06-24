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
import type { AiUsageDeclaration, CreatorTrustLevel, ProofStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function optionalText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || undefined;
}

function enumValue<T extends string>(formData: FormData, key: string, allowed: readonly T[], fallback: T) {
  const value = String(formData.get(key) ?? "").trim();
  return allowed.includes(value as T) ? (value as T) : fallback;
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
    const creatorTrustLevel = enumValue<CreatorTrustLevel>(
      formData,
      "creator_trust_level",
      ["self_declared", "email_verified", "domain_verified", "team_co_signed", "organisation_verified"],
      "self_declared"
    );
    const aiUsageDeclaration = enumValue<AiUsageDeclaration>(
      formData,
      "ai_usage_declaration",
      ["human_created", "ai_assisted", "ai_generated_human_review", "fully_ai_generated", "unknown"],
      "unknown"
    );
    const proofStatus = enumValue<ProofStatus>(
      formData,
      "proof_status",
      ["active", "expired", "revoked", "disputed", "updated_version_available"],
      "active"
    );
    const analysis = await analyseAndStoreMedia({
      buffer: await uploadFileToBuffer(file),
      mimeType: file.type,
      originalName: file.name
    });
    const receiptId = insertProofReceipt({
      title,
      creatorClaim,
      creatorTrustLevel,
      aiUsageDeclaration,
      organisationName: optionalText(formData, "organisation_name"),
      officialSourceUrl: optionalText(formData, "official_source_url"),
      intendedChannel: optionalText(formData, "intended_channel"),
      intendedAudience: optionalText(formData, "intended_audience"),
      expiryDate: optionalText(formData, "expiry_date"),
      versionNumber: optionalText(formData, "version_number"),
      warningNote: optionalText(formData, "warning_note"),
      proofStatus,
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
