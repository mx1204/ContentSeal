import { randomUUID } from "node:crypto";
import { readFile, rm } from "node:fs/promises";
import sharp from "sharp";
import { firebaseServices, useFirebaseBackend } from "./firebase-admin";
import {
  deleteProofReceipt,
  findReceiptByHash,
  getAllReceiptPHashes,
  getAsset,
  getReceipt,
  insertDetectionSignals,
  insertMediaAnalysis,
  insertMediaAsset,
  insertPHashVariants,
  insertProofReceipt,
  insertTrustCard,
  insertVerification,
  listReceipts,
  withDbTransaction,
  type DeleteProofReceiptResult,
  type DetectionSignalInput,
  type MediaAssetRecord,
  type ProofReceiptRecord,
  type StoredPHash
} from "./db";
import type {
  AiUsageDeclaration,
  C2paStatus,
  ClassifierStatus,
  CreatorTrustLevel,
  MediaAnalysis,
  MetadataStatus,
  PHashResult,
  ProofStatus,
  RedactedMetadata,
  TrustBadge,
  TrustCard,
  TrustLabel,
  WatermarkStatus
} from "./types";

type FirestoreRecord = Record<string, unknown>;
type StoredMediaAssetRecord = MediaAssetRecord & {
  previewDataUrl?: string;
  storageError?: string;
  storageProvider?: "firebase_storage" | "firestore_preview";
};

export interface StoreMediaAnalysisInput {
  buffer: Buffer;
  extension: string;
  storagePath: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  width?: number;
  height?: number;
  metadataStatus: MetadataStatus;
  metadata: RedactedMetadata;
  ocrText: string;
  pHashes: PHashResult[];
  analysisId: string;
  c2paStatus: C2paStatus;
  watermarkStatus: WatermarkStatus;
  classifierStatus: ClassifierStatus;
  classifierConfidence?: number;
  ocrStatus: MediaAnalysis["ocrStatus"];
  createdAt: string;
  detectionSignals: DetectionSignalInput[];
}

export interface ProofReceiptInput {
  title: string;
  creatorClaim: string;
  creatorTrustLevel?: CreatorTrustLevel;
  aiUsageDeclaration?: AiUsageDeclaration;
  organisationName?: string;
  officialSourceUrl?: string;
  intendedChannel?: string;
  intendedAudience?: string;
  expiryDate?: string;
  versionNumber?: string;
  warningNote?: string;
  proofStatus?: ProofStatus;
  mediaId: string;
}

export interface VerificationStorageInput {
  analysisId: string;
  matchedReceiptId: string | null;
  exactHashMatch: boolean;
  similarityScore: number | null;
  trustLabel: TrustLabel;
  badges: TrustBadge[];
  evidence: unknown;
  card: TrustCard;
}

function cleanForFirestore(value: unknown): unknown {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(cleanForFirestore).filter((item) => item !== undefined);
  }

  const output: FirestoreRecord = {};
  for (const [key, child] of Object.entries(value as FirestoreRecord)) {
    const cleaned = cleanForFirestore(child);
    if (cleaned !== undefined) {
      output[key] = cleaned;
    }
  }
  return output;
}

function asFirestoreRecord(value: FirestoreRecord) {
  return cleanForFirestore(value) as FirestoreRecord;
}

function isFirebaseStore() {
  return useFirebaseBackend();
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value ? value : fallback;
}

function optionalText(value: unknown) {
  return typeof value === "string" && value ? value : undefined;
}

function optionalNumber(value: unknown) {
  return value == null ? undefined : Number(value);
}

function metadataFallback(data: FirestoreRecord): RedactedMetadata {
  return {
    status: (data.metadataStatus as MetadataStatus) ?? "missing",
    sizeBytes: Number(data.sizeBytes ?? 0),
    hasExif: false,
    redactedFields: [],
    publicFields: {}
  };
}

function receiptFromFirebase(data: FirestoreRecord): ProofReceiptRecord {
  const metadata =
    data.metadata && typeof data.metadata === "object"
      ? (data.metadata as RedactedMetadata)
      : metadataFallback(data);

  return {
    id: text(data.id),
    title: text(data.title, "Untitled proof"),
    creatorClaim: text(data.creatorClaim, "Unspecified creator claim"),
    creatorTrustLevel: (data.creatorTrustLevel as CreatorTrustLevel) ?? "self_declared",
    aiUsageDeclaration: (data.aiUsageDeclaration as AiUsageDeclaration) ?? "unknown",
    organisationName: optionalText(data.organisationName),
    officialSourceUrl: optionalText(data.officialSourceUrl),
    intendedChannel: optionalText(data.intendedChannel),
    intendedAudience: optionalText(data.intendedAudience),
    expiryDate: optionalText(data.expiryDate),
    versionNumber: optionalText(data.versionNumber),
    warningNote: optionalText(data.warningNote),
    proofStatus: (data.proofStatus as ProofStatus) ?? "active",
    proofCreatedAt: text(data.proofCreatedAt),
    mediaId: text(data.mediaId),
    sha256: text(data.sha256),
    metadataStatus: (data.metadataStatus as MetadataStatus) ?? metadata.status,
    width: optionalNumber(data.width),
    height: optionalNumber(data.height),
    metadata
  };
}

function assetFromFirebase(data: FirestoreRecord): StoredMediaAssetRecord {
  const metadata =
    data.metadata && typeof data.metadata === "object"
      ? (data.metadata as RedactedMetadata)
      : metadataFallback(data);

  return {
    id: text(data.id),
    originalName: text(data.originalName, "uploaded-media"),
    mimeType: text(data.mimeType, "application/octet-stream"),
    sizeBytes: Number(data.sizeBytes ?? 0),
    storagePath: text(data.storagePath),
    sha256: text(data.sha256),
    width: data.width == null ? null : Number(data.width),
    height: data.height == null ? null : Number(data.height),
    metadataStatus: (data.metadataStatus as MetadataStatus) ?? metadata.status,
    metadata,
    ocrText: text(data.ocrText),
    createdAt: text(data.createdAt),
    previewDataUrl: optionalText(data.previewDataUrl),
    storageError: optionalText(data.storageError),
    storageProvider: data.storageProvider as StoredMediaAssetRecord["storageProvider"]
  } satisfies StoredMediaAssetRecord;
}

function phashFromFirebase(data: FirestoreRecord): StoredPHash | null {
  const receiptId = optionalText(data.receiptId);
  if (!receiptId) {
    return null;
  }

  return {
    mediaId: text(data.mediaId),
    receiptId,
    variant: data.variant as PHashResult["variant"],
    phash: text(data.phash),
    width: Number(data.width),
    height: Number(data.height)
  };
}

function objectNameForMedia(mediaId: string, extension: string) {
  const safeExtension = extension.replace(/[^a-z0-9]/gi, "").toLowerCase() || "bin";
  return `media/${mediaId}.${safeExtension}`;
}

function shouldUseFirebaseStorage() {
  return process.env.CONTENTSEAL_FIREBASE_STORAGE?.toLowerCase() !== "disabled";
}

async function previewDataUrlForFirestore(buffer: Buffer, mimeType: string) {
  try {
    const preview = await sharp(buffer)
      .rotate()
      .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 72 })
      .toBuffer();
    if (preview.byteLength <= 700_000) {
      return `data:image/webp;base64,${preview.toString("base64")}`;
    }
  } catch {
    // Preview is a convenience fallback. Verification still uses hashes and metadata.
  }

  if (buffer.byteLength <= 700_000) {
    return `data:${mimeType};base64,${buffer.toString("base64")}`;
  }

  return undefined;
}

function bufferFromDataUrl(dataUrl: string) {
  const match = /^data:([^;,]+);base64,(.+)$/u.exec(dataUrl);
  if (!match) {
    return null;
  }

  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], "base64")
  };
}

export async function storeMediaAnalysis(input: StoreMediaAnalysisInput) {
  if (!isFirebaseStore()) {
    try {
      return withDbTransaction(() => {
        const insertedMediaId = insertMediaAsset({
          originalName: input.originalName,
          mimeType: input.mimeType,
          sizeBytes: input.sizeBytes,
          storagePath: input.storagePath,
          sha256: input.sha256,
          width: input.width,
          height: input.height,
          metadataStatus: input.metadataStatus,
          metadata: input.metadata,
          ocrText: input.ocrText
        });

        insertPHashVariants(insertedMediaId, input.pHashes);
        insertMediaAnalysis({
          mediaId: insertedMediaId,
          analysisId: input.analysisId,
          fileHash: input.sha256,
          pHashes: input.pHashes,
          metadataStatus: input.metadataStatus,
          c2paStatus: input.c2paStatus,
          watermarkStatus: input.watermarkStatus,
          classifierStatus: input.classifierStatus,
          classifierConfidence: input.classifierConfidence,
          ocrStatus: input.ocrStatus,
          createdAt: input.createdAt
        });

        insertDetectionSignals(input.detectionSignals);
        return insertedMediaId;
      });
    } catch (error) {
      await rm(input.storagePath, { force: true });
      throw error;
    }
  }

  const { firestore, bucket } = firebaseServices();
  const mediaId = randomUUID();
  let storagePath = objectNameForMedia(mediaId, input.extension);
  let storageError: string | undefined;
  let storageProvider: StoredMediaAssetRecord["storageProvider"] = "firebase_storage";
  const createdAt = input.createdAt;

  try {
    if (shouldUseFirebaseStorage()) {
      try {
        await bucket.file(storagePath).save(input.buffer, {
          metadata: {
            contentType: input.mimeType,
            cacheControl: "private, max-age=3600"
          }
        });
      } catch (error) {
        storageError = error instanceof Error ? error.message : "Firebase Storage upload failed.";
        storageProvider = "firestore_preview";
        storagePath = "";
      }
    } else {
      storageError = "Firebase Storage is disabled for this deployment.";
      storageProvider = "firestore_preview";
      storagePath = "";
    }

    const previewDataUrl = await previewDataUrlForFirestore(input.buffer, input.mimeType);

    const batch = firestore.batch();
    batch.set(
      firestore.collection("media_assets").doc(mediaId),
      asFirestoreRecord({
        id: mediaId,
        originalName: input.originalName,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        storagePath,
        storageProvider,
        storageError,
        previewDataUrl,
        sha256: input.sha256,
        width: input.width,
        height: input.height,
        metadataStatus: input.metadataStatus,
        metadata: input.metadata,
        ocrText: input.ocrText,
        createdAt
      })
    );

    for (const pHash of input.pHashes) {
      const id = randomUUID();
      batch.set(
        firestore.collection("phash_variants").doc(id),
        asFirestoreRecord({
          id,
          mediaId,
          receiptId: null,
          variant: pHash.variant,
          phash: pHash.hash,
          width: pHash.width,
          height: pHash.height,
          createdAt
        })
      );
    }

    batch.set(
      firestore.collection("media_analyses").doc(input.analysisId),
      asFirestoreRecord({
        id: input.analysisId,
        mediaId,
        fileHash: input.sha256,
        perceptualHashes: input.pHashes,
        metadataStatus: input.metadataStatus,
        c2paStatus: input.c2paStatus,
        watermarkStatus: input.watermarkStatus,
        classifierStatus: input.classifierStatus,
        classifierConfidence: input.classifierConfidence,
        ocrStatus: input.ocrStatus,
        createdAt
      })
    );

    for (const signal of input.detectionSignals) {
      const id = randomUUID();
      batch.set(
        firestore.collection("detection_signals").doc(id),
        asFirestoreRecord({
          signalId: id,
          analysisId: signal.analysisId,
          signalType: signal.signalType,
          signalValue: signal.signalValue,
          confidence: signal.confidence ?? null,
          explanation: signal.explanation,
          createdAt
        })
      );
    }

    await batch.commit();
    await rm(input.storagePath, { force: true });
    return mediaId;
  } catch (error) {
    if (storagePath) {
      await bucket.file(storagePath).delete().catch(() => undefined);
    }
    await rm(input.storagePath, { force: true });
    throw error;
  }
}

export async function insertProofReceiptStore(input: ProofReceiptInput) {
  if (!isFirebaseStore()) {
    return insertProofReceipt(input);
  }

  const { firestore } = firebaseServices();
  const mediaSnapshot = await firestore.collection("media_assets").doc(input.mediaId).get();
  if (!mediaSnapshot.exists) {
    throw new Error("Media asset not found for proof receipt.");
  }

  const media = assetFromFirebase(mediaSnapshot.data() as FirestoreRecord);
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const pHashSnapshot = await firestore
    .collection("phash_variants")
    .where("mediaId", "==", input.mediaId)
    .get();

  const batch = firestore.batch();
  batch.set(
    firestore.collection("proof_receipts").doc(id),
    asFirestoreRecord({
      id,
      title: input.title,
      creatorClaim: input.creatorClaim,
      creatorTrustLevel: input.creatorTrustLevel ?? "self_declared",
      aiUsageDeclaration: input.aiUsageDeclaration ?? "unknown",
      organisationName: input.organisationName?.trim() || undefined,
      officialSourceUrl: input.officialSourceUrl?.trim() || undefined,
      intendedChannel: input.intendedChannel?.trim() || undefined,
      intendedAudience: input.intendedAudience?.trim() || undefined,
      expiryDate: input.expiryDate?.trim() || undefined,
      versionNumber: input.versionNumber?.trim() || undefined,
      warningNote: input.warningNote?.trim() || undefined,
      proofStatus: input.proofStatus ?? "active",
      mediaId: input.mediaId,
      sha256: media.sha256,
      metadataStatus: media.metadataStatus,
      width: media.width,
      height: media.height,
      sizeBytes: media.sizeBytes,
      metadata: media.metadata,
      proofCreatedAt: createdAt,
      createdAt
    })
  );

  batch.set(
    firestore.collection("receipt_events").doc(randomUUID()),
    asFirestoreRecord({
      receiptId: id,
      eventType: "created",
      event: {
        mediaId: input.mediaId,
        creatorTrustLevel: input.creatorTrustLevel ?? "self_declared",
        aiUsageDeclaration: input.aiUsageDeclaration ?? "unknown",
        proofStatus: input.proofStatus ?? "active"
      },
      createdAt
    })
  );

  pHashSnapshot.docs.forEach((doc) => {
    batch.set(doc.ref, { receiptId: id }, { merge: true });
  });

  await batch.commit();
  return id;
}

export async function getReceiptStore(id: string) {
  if (!isFirebaseStore()) {
    return getReceipt(id);
  }

  const { firestore } = firebaseServices();
  const snapshot = await firestore.collection("proof_receipts").doc(id).get();
  return snapshot.exists ? receiptFromFirebase(snapshot.data() as FirestoreRecord) : null;
}

export async function listReceiptsStore() {
  if (!isFirebaseStore()) {
    return listReceipts();
  }

  const { firestore } = firebaseServices();
  const snapshot = await firestore.collection("proof_receipts").get();
  return snapshot.docs
    .map((doc) => receiptFromFirebase(doc.data() as FirestoreRecord))
    .sort(
      (left, right) =>
        new Date(right.proofCreatedAt).getTime() - new Date(left.proofCreatedAt).getTime()
    );
}

export async function findReceiptByHashStore(sha: string) {
  if (!isFirebaseStore()) {
    return findReceiptByHash(sha);
  }

  const { firestore } = firebaseServices();
  const snapshot = await firestore.collection("proof_receipts").where("sha256", "==", sha).get();
  const receipts = snapshot.docs
    .map((doc) => receiptFromFirebase(doc.data() as FirestoreRecord))
    .sort(
      (left, right) =>
        new Date(right.proofCreatedAt).getTime() - new Date(left.proofCreatedAt).getTime()
    );
  return receipts[0] ?? null;
}

export async function getAllReceiptPHashesStore() {
  if (!isFirebaseStore()) {
    return getAllReceiptPHashes();
  }

  const { firestore } = firebaseServices();
  const snapshot = await firestore.collection("phash_variants").get();
  return snapshot.docs
    .map((doc) => phashFromFirebase(doc.data() as FirestoreRecord))
    .filter((item): item is StoredPHash => item !== null && Boolean(item.phash));
}

export async function getAssetStore(id: string) {
  if (!isFirebaseStore()) {
    return getAsset(id);
  }

  const { firestore } = firebaseServices();
  const snapshot = await firestore.collection("media_assets").doc(id).get();
  return snapshot.exists ? assetFromFirebase(snapshot.data() as FirestoreRecord) : null;
}

export async function readStoredMediaBuffer(id: string) {
  const asset = (await getAssetStore(id)) as StoredMediaAssetRecord | null;
  if (!asset) {
    return null;
  }

  if (!isFirebaseStore()) {
    return {
      asset,
      buffer: await readFile(asset.storagePath),
      mimeType: asset.mimeType
    };
  }

  const { bucket } = firebaseServices();
  if (asset.storagePath) {
    try {
      const [buffer] = await bucket.file(asset.storagePath).download();
      return { asset, buffer, mimeType: asset.mimeType };
    } catch {
      // Fall through to the Firestore preview cache.
    }
  }

  if (asset.previewDataUrl) {
    const preview = bufferFromDataUrl(asset.previewDataUrl);
    if (preview) {
      return { asset, buffer: preview.buffer, mimeType: preview.mimeType };
    }
  }

  return null;
}

async function deleteFirebaseStorageObject(storagePath: string) {
  if (!storagePath) {
    return false;
  }

  const { bucket } = firebaseServices();
  try {
    await bucket.file(storagePath).delete();
    return true;
  } catch {
    return false;
  }
}

export async function deleteProofReceiptStore(id: string): Promise<DeleteProofReceiptResult> {
  if (!isFirebaseStore()) {
    return deleteProofReceipt(id);
  }

  const receipt = await getReceiptStore(id);
  if (!receipt) {
    return { deleted: false, removedMediaFile: false };
  }

  const { firestore } = firebaseServices();
  const asset = await getAssetStore(receipt.mediaId);
  const batch = firestore.batch();

  batch.delete(firestore.collection("proof_receipts").doc(id));
  batch.delete(firestore.collection("media_assets").doc(receipt.mediaId));

  const [pHashes, analyses, receiptEvents, verifications] = await Promise.all([
    firestore.collection("phash_variants").where("mediaId", "==", receipt.mediaId).get(),
    firestore.collection("media_analyses").where("mediaId", "==", receipt.mediaId).get(),
    firestore.collection("receipt_events").where("receiptId", "==", id).get(),
    firestore.collection("verifications").where("matchedReceiptId", "==", id).get()
  ]);

  pHashes.docs.forEach((doc) => batch.delete(doc.ref));
  analyses.docs.forEach((doc) => batch.delete(doc.ref));
  receiptEvents.docs.forEach((doc) => batch.delete(doc.ref));
  verifications.docs.forEach((doc) => batch.delete(doc.ref));

  const analysisIds = analyses.docs.map((doc) => doc.id);
  for (const analysisId of analysisIds) {
    const signals = await firestore
      .collection("detection_signals")
      .where("analysisId", "==", analysisId)
      .get();
    signals.docs.forEach((doc) => batch.delete(doc.ref));
  }

  for (const verification of verifications.docs) {
    const cards = await firestore
      .collection("trust_cards")
      .where("verificationId", "==", verification.id)
      .get();
    cards.docs.forEach((doc) => batch.delete(doc.ref));
  }

  await batch.commit();

  return {
    deleted: true,
    mediaId: receipt.mediaId,
    removedMediaFile: asset ? await deleteFirebaseStorageObject(asset.storagePath) : false
  };
}

export async function insertVerificationWithTrustCardStore(input: VerificationStorageInput) {
  if (!isFirebaseStore()) {
    return withDbTransaction(() => {
      const verificationId = insertVerification({
        analysisId: input.analysisId,
        matchedReceiptId: input.matchedReceiptId,
        exactHashMatch: input.exactHashMatch,
        similarityScore: input.similarityScore,
        trustLabel: input.trustLabel,
        badges: input.badges,
        evidence: input.evidence
      });

      insertTrustCard({
        verificationId,
        trustLabel: input.trustLabel,
        card: input.card
      });

      return verificationId;
    });
  }

  const { firestore } = firebaseServices();
  const verificationId = randomUUID();
  const trustCardId = randomUUID();
  const createdAt = new Date().toISOString();
  const batch = firestore.batch();

  batch.set(
    firestore.collection("verifications").doc(verificationId),
    asFirestoreRecord({
      id: verificationId,
      analysisId: input.analysisId,
      matchedReceiptId: input.matchedReceiptId,
      exactHashMatch: input.exactHashMatch,
      similarityScore: input.similarityScore,
      trustLabel: input.trustLabel,
      badges: input.badges,
      evidence: input.evidence,
      createdAt
    })
  );

  batch.set(
    firestore.collection("trust_cards").doc(trustCardId),
    asFirestoreRecord({
      trustCardId,
      verificationId,
      trustLabel: input.trustLabel,
      summary: input.card.summary,
      verifiedPoints: input.card.what_we_verified,
      unverifiedPoints: input.card.what_we_could_not_verify,
      recommendedAction: input.card.recommended_action,
      createdAt
    })
  );

  await batch.commit();
  return verificationId;
}
