import { readFileSync } from "node:fs";
import {
  getAsset,
  findReceiptByHash,
  getAllReceiptPHashes,
  getReceipt,
  insertTrustCard,
  insertVerification,
  withDbTransaction
} from "./db";
import { buildDecision } from "./decision";
import { computePHash, phashSimilarity } from "./phash";
import { generateTrustCard } from "./trust-card";
import type { MediaAnalysis, SimilarityMatch, VerificationResult } from "./types";

function receiptAspectRatio(match: SimilarityMatch) {
  const width = match.receipt.width;
  const height = match.receipt.height;
  return width && height && height > 0 ? width / height : null;
}

async function improveWithReceiptAspectCrop(
  analysis: MediaAnalysis,
  best: SimilarityMatch | null
): Promise<SimilarityMatch | null> {
  if (!best || !analysis.mediaId) {
    return best;
  }

  const aspectRatio = receiptAspectRatio(best);
  if (!aspectRatio || best.score >= 0.95) {
    return best;
  }

  const uploadedAsset = getAsset(analysis.mediaId);
  if (!uploadedAsset) {
    return best;
  }

  try {
    const uploadedBuffer = readFileSync(uploadedAsset.storagePath);
    const cropped = await computePHash(uploadedBuffer, "center_crop", aspectRatio);
    const storedReceiptHashes = getAllReceiptPHashes().filter(
      (storedHash) => storedHash.receiptId === best.receipt.id
    );
    return storedReceiptHashes.reduce<SimilarityMatch>((currentBest, storedHash) => {
      const score = phashSimilarity(cropped.hash, storedHash.phash);
      if (score > currentBest.score) {
        return {
          receipt: best.receipt,
          score,
          uploadedVariant: "center_crop",
          receiptVariant: storedHash.variant
        };
      }
      return currentBest;
    }, best);
  } catch {
    return best;
  }
}

export async function findBestVisualMatch(analysis: MediaAnalysis): Promise<SimilarityMatch | null> {
  let best: SimilarityMatch | null = null;
  const receiptHashes = getAllReceiptPHashes();

  for (const uploadedHash of analysis.pHashes) {
    for (const storedHash of receiptHashes) {
      const receipt = storedHash.receiptId ? getReceipt(storedHash.receiptId) : null;
      if (!receipt) {
        continue;
      }
      const score = phashSimilarity(uploadedHash.hash, storedHash.phash);
      if (!best || score > best.score) {
        best = {
          receipt,
          score,
          uploadedVariant: uploadedHash.variant,
          receiptVariant: storedHash.variant
        };
      }
    }
  }

  return improveWithReceiptAspectCrop(analysis, best);
}

export async function verifyAnalysis(analysis: MediaAnalysis): Promise<VerificationResult> {
  const exactReceipt = findReceiptByHash(analysis.sha256);
  const visualMatch = exactReceipt ? null : await findBestVisualMatch(analysis);
  const decision = buildDecision({ analysis, exactReceipt, visualMatch });
  const card = generateTrustCard(decision.evidence);
  const verificationId = withDbTransaction(() => {
    const insertedVerificationId = insertVerification({
      analysisId: analysis.id,
      matchedReceiptId: decision.evidence.matchedReceipt?.id ?? null,
      exactHashMatch: decision.evidence.exactHashMatch,
      similarityScore: decision.evidence.visualSimilarityScore,
      trustLabel: decision.trustLabel,
      badges: decision.badges,
      evidence: decision.evidence
    });

    insertTrustCard({
      verificationId: insertedVerificationId,
      trustLabel: decision.trustLabel,
      card
    });

    return insertedVerificationId;
  });

  return {
    id: verificationId,
    trust_label: decision.trustLabel,
    matched_receipt_id: decision.evidence.matchedReceipt?.id ?? null,
    exact_hash_match: decision.evidence.exactHashMatch,
    similarity_score: decision.evidence.visualSimilarityScore,
    badges: decision.badges,
    evidence: decision.evidence,
    ai_trust_card: card,
    analysis
  };
}
