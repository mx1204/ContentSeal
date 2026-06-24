import { existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { dataDir, mediaStorageDir, sqlitePath } from "./paths";
import type {
  C2paStatus,
  AiUsageDeclaration,
  ClassifierStatus,
  CreatorTrustLevel,
  DetectionSignalType,
  MetadataStatus,
  PHashResult,
  ProofStatus,
  ReceiptSummary,
  RedactedMetadata,
  TrustBadge,
  TrustCard,
  TrustLabel,
  WatermarkStatus
} from "./types";

type DatabaseSyncType = import("node:sqlite").DatabaseSync;

const require = createRequire(import.meta.url);
const { DatabaseSync } = require("node:sqlite") as typeof import("node:sqlite");

let db: DatabaseSyncType | null = null;
let transactionCounter = 0;

export interface MediaAssetRecord {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  sha256: string;
  width: number | null;
  height: number | null;
  metadataStatus: MetadataStatus;
  metadata: RedactedMetadata;
  ocrText: string;
  createdAt: string;
}

export interface DetectionSignalInput {
  analysisId: string;
  signalType: DetectionSignalType;
  signalValue: string;
  confidence?: number | null;
  explanation: string;
}

export interface ProofReceiptRecord extends ReceiptSummary {
  metadata: RedactedMetadata;
}

export interface DeleteProofReceiptResult {
  deleted: boolean;
  mediaId?: string;
  removedMediaFile: boolean;
}

function removeStoredMediaFile(storagePath: string | null | undefined) {
  if (!storagePath) {
    return false;
  }

  const resolvedStorageRoot = path.resolve(mediaStorageDir);
  const resolvedStoragePath = path.resolve(storagePath);
  const staysInsideStorage =
    resolvedStoragePath.startsWith(`${resolvedStorageRoot}${path.sep}`) &&
    resolvedStoragePath !== resolvedStorageRoot;

  if (!staysInsideStorage || !existsSync(resolvedStoragePath)) {
    return false;
  }

  rmSync(resolvedStoragePath, { force: true });
  return true;
}

function ensureColumn(table: string, column: string, definition: string) {
  const columns = getDb()
    .prepare(`PRAGMA table_info(${table})`)
    .all() as Array<{ name: string }>;

  if (!columns.some((existing) => existing.name === column)) {
    getDb().exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

export interface StoredPHash {
  mediaId: string;
  receiptId?: string;
  variant: PHashResult["variant"];
  phash: string;
  width: number;
  height: number;
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) {
    return fallback;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function getDb() {
  if (!db) {
    mkdirSync(dataDir, { recursive: true });
    db = new DatabaseSync(sqlitePath());
    db.exec("PRAGMA foreign_keys = ON");
    db.exec(`
      CREATE TABLE IF NOT EXISTS media_assets (
        id TEXT PRIMARY KEY,
        original_name TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        storage_path TEXT NOT NULL,
        sha256 TEXT NOT NULL,
        width INTEGER,
        height INTEGER,
        metadata_status TEXT NOT NULL,
        metadata_json TEXT NOT NULL,
        ocr_text TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_media_assets_sha256
        ON media_assets (sha256);

      CREATE TABLE IF NOT EXISTS proof_receipts (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        creator_claim TEXT NOT NULL,
        creator_trust_level TEXT NOT NULL DEFAULT 'self_declared',
        ai_usage_declaration TEXT NOT NULL DEFAULT 'unknown',
        organisation_name TEXT,
        official_source_url TEXT,
        intended_channel TEXT,
        intended_audience TEXT,
        expiry_date TEXT,
        version_number TEXT,
        warning_note TEXT,
        proof_status TEXT NOT NULL DEFAULT 'active',
        original_media_id TEXT NOT NULL,
        proof_created_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (original_media_id) REFERENCES media_assets(id)
      );

      CREATE INDEX IF NOT EXISTS idx_proof_receipts_media
        ON proof_receipts (original_media_id);

      CREATE TABLE IF NOT EXISTS phash_variants (
        id TEXT PRIMARY KEY,
        media_id TEXT NOT NULL,
        variant TEXT NOT NULL,
        phash TEXT NOT NULL,
        width INTEGER NOT NULL,
        height INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (media_id) REFERENCES media_assets(id)
      );

      CREATE INDEX IF NOT EXISTS idx_phash_variants_media
        ON phash_variants (media_id);

      CREATE TABLE IF NOT EXISTS media_analyses (
        id TEXT PRIMARY KEY,
        media_id TEXT NOT NULL,
        file_hash TEXT NOT NULL,
        perceptual_hash_json TEXT NOT NULL,
        metadata_status TEXT NOT NULL,
        c2pa_status TEXT NOT NULL,
        watermark_status TEXT NOT NULL,
        classifier_status TEXT NOT NULL,
        classifier_confidence REAL,
        ocr_status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (media_id) REFERENCES media_assets(id)
      );

      CREATE TABLE IF NOT EXISTS detection_signals (
        signal_id TEXT PRIMARY KEY,
        analysis_id TEXT NOT NULL,
        signal_type TEXT NOT NULL,
        signal_value TEXT NOT NULL,
        confidence REAL,
        explanation TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (analysis_id) REFERENCES media_analyses(id)
      );

      CREATE TABLE IF NOT EXISTS verifications (
        id TEXT PRIMARY KEY,
        analysis_id TEXT NOT NULL,
        matched_receipt_id TEXT,
        exact_hash_match INTEGER NOT NULL,
        similarity_score REAL,
        trust_label TEXT NOT NULL,
        badges_json TEXT NOT NULL,
        evidence_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (analysis_id) REFERENCES media_analyses(id),
        FOREIGN KEY (matched_receipt_id) REFERENCES proof_receipts(id)
      );

      CREATE TABLE IF NOT EXISTS trust_cards (
        trust_card_id TEXT PRIMARY KEY,
        verification_id TEXT NOT NULL,
        trust_label TEXT NOT NULL,
        summary TEXT NOT NULL,
        verified_points_json TEXT NOT NULL,
        unverified_points_json TEXT NOT NULL,
        recommended_action TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (verification_id) REFERENCES verifications(id)
      );

      CREATE TABLE IF NOT EXISTS receipt_events (
        event_id TEXT PRIMARY KEY,
        receipt_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        event_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (receipt_id) REFERENCES proof_receipts(id)
      );
    `);

    ensureColumn("proof_receipts", "creator_trust_level", "TEXT NOT NULL DEFAULT 'self_declared'");
    ensureColumn("proof_receipts", "ai_usage_declaration", "TEXT NOT NULL DEFAULT 'unknown'");
    ensureColumn("proof_receipts", "organisation_name", "TEXT");
    ensureColumn("proof_receipts", "official_source_url", "TEXT");
    ensureColumn("proof_receipts", "intended_channel", "TEXT");
    ensureColumn("proof_receipts", "intended_audience", "TEXT");
    ensureColumn("proof_receipts", "expiry_date", "TEXT");
    ensureColumn("proof_receipts", "version_number", "TEXT");
    ensureColumn("proof_receipts", "warning_note", "TEXT");
    ensureColumn("proof_receipts", "proof_status", "TEXT NOT NULL DEFAULT 'active'");
  }
  return db;
}

export function withDbTransaction<T>(callback: () => T): T {
  const database = getDb();
  transactionCounter += 1;
  const savepoint = `contentseal_tx_${transactionCounter}`;
  database.exec(`SAVEPOINT ${savepoint}`);
  try {
    const result = callback();
    database.exec(`RELEASE SAVEPOINT ${savepoint}`);
    return result;
  } catch (error) {
    database.exec(`ROLLBACK TO SAVEPOINT ${savepoint}`);
    database.exec(`RELEASE SAVEPOINT ${savepoint}`);
    throw error;
  }
}

export function resetDatabaseForTests() {
  if (process.env.NODE_ENV !== "test" && process.env.VITEST !== "true") {
    throw new Error("resetDatabaseForTests can only be used from tests.");
  }

  const database = getDb();
  database.exec("PRAGMA foreign_keys = OFF");
  database.exec(`
    DELETE FROM trust_cards;
    DELETE FROM verifications;
    DELETE FROM detection_signals;
    DELETE FROM media_analyses;
    DELETE FROM receipt_events;
    DELETE FROM phash_variants;
    DELETE FROM proof_receipts;
    DELETE FROM media_assets;
  `);
  database.exec("PRAGMA foreign_keys = ON");
}

export function insertMediaAsset(input: {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  sha256: string;
  width?: number;
  height?: number;
  metadataStatus: MetadataStatus;
  metadata: RedactedMetadata;
  ocrText: string;
}) {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO media_assets (
        id, original_name, mime_type, size_bytes, storage_path, sha256,
        width, height, metadata_status, metadata_json, ocr_text, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      input.originalName,
      input.mimeType,
      input.sizeBytes,
      input.storagePath,
      input.sha256,
      input.width ?? null,
      input.height ?? null,
      input.metadataStatus,
      JSON.stringify(input.metadata),
      input.ocrText,
      createdAt
    );
  return id;
}

export function insertPHashVariants(mediaId: string, variants: PHashResult[]) {
  const statement = getDb().prepare(
    `INSERT INTO phash_variants (
      id, media_id, variant, phash, width, height, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const createdAt = new Date().toISOString();
  for (const variant of variants) {
    statement.run(
      randomUUID(),
      mediaId,
      variant.variant,
      variant.hash,
      variant.width,
      variant.height,
      createdAt
    );
  }
}

export function insertMediaAnalysis(input: {
  mediaId: string;
  analysisId: string;
  fileHash: string;
  pHashes: PHashResult[];
  metadataStatus: MetadataStatus;
  c2paStatus: C2paStatus;
  watermarkStatus: WatermarkStatus;
  classifierStatus: ClassifierStatus;
  classifierConfidence?: number;
  ocrStatus: string;
  createdAt: string;
}) {
  getDb()
    .prepare(
      `INSERT INTO media_analyses (
        id, media_id, file_hash, perceptual_hash_json, metadata_status,
        c2pa_status, watermark_status, classifier_status, classifier_confidence,
        ocr_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.analysisId,
      input.mediaId,
      input.fileHash,
      JSON.stringify(input.pHashes),
      input.metadataStatus,
      input.c2paStatus,
      input.watermarkStatus,
      input.classifierStatus,
      input.classifierConfidence ?? null,
      input.ocrStatus,
      input.createdAt
    );
}

export function insertDetectionSignals(signals: DetectionSignalInput[]) {
  if (signals.length === 0) {
    return;
  }
  const statement = getDb().prepare(
    `INSERT INTO detection_signals (
      signal_id, analysis_id, signal_type, signal_value, confidence,
      explanation, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const createdAt = new Date().toISOString();
  for (const signal of signals) {
    statement.run(
      randomUUID(),
      signal.analysisId,
      signal.signalType,
      signal.signalValue,
      signal.confidence ?? null,
      signal.explanation,
      createdAt
    );
  }
}

export function insertProofReceipt(input: {
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
}) {
  return withDbTransaction(() => {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    getDb()
      .prepare(
        `INSERT INTO proof_receipts (
          id, title, creator_claim, creator_trust_level, ai_usage_declaration,
          organisation_name, official_source_url, intended_channel, intended_audience,
          expiry_date, version_number, warning_note, proof_status,
          original_media_id, proof_created_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        input.title,
        input.creatorClaim,
        input.creatorTrustLevel ?? "self_declared",
        input.aiUsageDeclaration ?? "unknown",
        input.organisationName?.trim() || null,
        input.officialSourceUrl?.trim() || null,
        input.intendedChannel?.trim() || null,
        input.intendedAudience?.trim() || null,
        input.expiryDate?.trim() || null,
        input.versionNumber?.trim() || null,
        input.warningNote?.trim() || null,
        input.proofStatus ?? "active",
        input.mediaId,
        createdAt,
        createdAt
      );

    getDb()
      .prepare(
        `INSERT INTO receipt_events (
          event_id, receipt_id, event_type, event_json, created_at
        ) VALUES (?, ?, ?, ?, ?)`
      )
      .run(
        randomUUID(),
        id,
        "created",
        JSON.stringify({
          mediaId: input.mediaId,
          creatorTrustLevel: input.creatorTrustLevel ?? "self_declared",
          aiUsageDeclaration: input.aiUsageDeclaration ?? "unknown",
          proofStatus: input.proofStatus ?? "active"
        }),
        createdAt
      );

    return id;
  });
}

function receiptFromRow(row: Record<string, unknown>): ProofReceiptRecord {
  const metadata = parseJson<RedactedMetadata>(row.metadata_json as string, {
    status: row.metadata_status as MetadataStatus,
    sizeBytes: Number(row.size_bytes),
    hasExif: false,
    redactedFields: [],
    publicFields: {}
  });

  return {
    id: String(row.id),
    title: String(row.title),
    creatorClaim: String(row.creator_claim),
    creatorTrustLevel: (row.creator_trust_level as CreatorTrustLevel) ?? "self_declared",
    aiUsageDeclaration: (row.ai_usage_declaration as AiUsageDeclaration) ?? "unknown",
    organisationName: row.organisation_name ? String(row.organisation_name) : undefined,
    officialSourceUrl: row.official_source_url ? String(row.official_source_url) : undefined,
    intendedChannel: row.intended_channel ? String(row.intended_channel) : undefined,
    intendedAudience: row.intended_audience ? String(row.intended_audience) : undefined,
    expiryDate: row.expiry_date ? String(row.expiry_date) : undefined,
    versionNumber: row.version_number ? String(row.version_number) : undefined,
    warningNote: row.warning_note ? String(row.warning_note) : undefined,
    proofStatus: (row.proof_status as ProofStatus) ?? "active",
    proofCreatedAt: String(row.proof_created_at),
    mediaId: String(row.original_media_id),
    sha256: String(row.sha256),
    metadataStatus: row.metadata_status as MetadataStatus,
    width: row.width == null ? undefined : Number(row.width),
    height: row.height == null ? undefined : Number(row.height),
    metadata
  };
}

export function getReceipt(id: string) {
  const row = getDb()
    .prepare(
      `SELECT
        r.id, r.title, r.creator_claim, r.proof_created_at, r.original_media_id,
        r.creator_trust_level, r.ai_usage_declaration, r.organisation_name,
        r.official_source_url, r.intended_channel, r.intended_audience,
        r.expiry_date, r.version_number, r.warning_note, r.proof_status,
        m.sha256, m.metadata_status, m.width, m.height, m.metadata_json, m.size_bytes
      FROM proof_receipts r
      JOIN media_assets m ON m.id = r.original_media_id
      WHERE r.id = ?`
    )
    .get(id) as Record<string, unknown> | undefined;

  return row ? receiptFromRow(row) : null;
}

export function deleteProofReceipt(id: string): DeleteProofReceiptResult {
  const row = getDb()
    .prepare(
      `SELECT r.original_media_id, m.storage_path
      FROM proof_receipts r
      JOIN media_assets m ON m.id = r.original_media_id
      WHERE r.id = ?`
    )
    .get(id) as { original_media_id: string; storage_path: string } | undefined;

  if (!row) {
    return { deleted: false, removedMediaFile: false };
  }

  withDbTransaction(() => {
    getDb()
      .prepare(
        `DELETE FROM trust_cards
        WHERE verification_id IN (
          SELECT v.id
          FROM verifications v
          LEFT JOIN media_analyses a ON a.id = v.analysis_id
          WHERE v.matched_receipt_id = ? OR a.media_id = ?
        )`
      )
      .run(id, row.original_media_id);

    getDb()
      .prepare(
        `DELETE FROM verifications
        WHERE matched_receipt_id = ?
          OR analysis_id IN (
            SELECT id FROM media_analyses WHERE media_id = ?
          )`
      )
      .run(id, row.original_media_id);

    getDb()
      .prepare(
        `DELETE FROM detection_signals
        WHERE analysis_id IN (
          SELECT id FROM media_analyses WHERE media_id = ?
        )`
      )
      .run(row.original_media_id);

    getDb().prepare("DELETE FROM media_analyses WHERE media_id = ?").run(row.original_media_id);
    getDb().prepare("DELETE FROM receipt_events WHERE receipt_id = ?").run(id);
    getDb().prepare("DELETE FROM proof_receipts WHERE id = ?").run(id);
    getDb().prepare("DELETE FROM phash_variants WHERE media_id = ?").run(row.original_media_id);
    getDb().prepare("DELETE FROM media_assets WHERE id = ?").run(row.original_media_id);
  });

  return {
    deleted: true,
    mediaId: row.original_media_id,
    removedMediaFile: removeStoredMediaFile(row.storage_path)
  };
}

export function listReceipts() {
  const rows = getDb()
    .prepare(
      `SELECT
        r.id, r.title, r.creator_claim, r.proof_created_at, r.original_media_id,
        r.creator_trust_level, r.ai_usage_declaration, r.organisation_name,
        r.official_source_url, r.intended_channel, r.intended_audience,
        r.expiry_date, r.version_number, r.warning_note, r.proof_status,
        m.sha256, m.metadata_status, m.width, m.height, m.metadata_json, m.size_bytes
      FROM proof_receipts r
      JOIN media_assets m ON m.id = r.original_media_id
      ORDER BY r.proof_created_at DESC`
    )
    .all() as Record<string, unknown>[];

  return rows.map(receiptFromRow);
}

export function findReceiptByHash(sha: string) {
  const row = getDb()
    .prepare(
      `SELECT
        r.id, r.title, r.creator_claim, r.proof_created_at, r.original_media_id,
        r.creator_trust_level, r.ai_usage_declaration, r.organisation_name,
        r.official_source_url, r.intended_channel, r.intended_audience,
        r.expiry_date, r.version_number, r.warning_note, r.proof_status,
        m.sha256, m.metadata_status, m.width, m.height, m.metadata_json, m.size_bytes
      FROM proof_receipts r
      JOIN media_assets m ON m.id = r.original_media_id
      WHERE m.sha256 = ?
      ORDER BY r.proof_created_at DESC
      LIMIT 1`
    )
    .get(sha) as Record<string, unknown> | undefined;

  return row ? receiptFromRow(row) : null;
}

export function getAllReceiptPHashes() {
  const rows = getDb()
    .prepare(
      `SELECT
        p.media_id, p.variant, p.phash, p.width, p.height, r.id AS receipt_id
      FROM phash_variants p
      JOIN proof_receipts r ON r.original_media_id = p.media_id`
    )
    .all() as Record<string, unknown>[];

  return rows.map((row) => ({
    mediaId: String(row.media_id),
    receiptId: String(row.receipt_id),
    variant: row.variant as PHashResult["variant"],
    phash: String(row.phash),
    width: Number(row.width),
    height: Number(row.height)
  }));
}

export function getAsset(id: string) {
  const row = getDb()
    .prepare("SELECT * FROM media_assets WHERE id = ?")
    .get(id) as Record<string, unknown> | undefined;

  if (!row) {
    return null;
  }

  return {
    id: String(row.id),
    originalName: String(row.original_name),
    mimeType: String(row.mime_type),
    sizeBytes: Number(row.size_bytes),
    storagePath: String(row.storage_path),
    sha256: String(row.sha256),
    width: row.width == null ? null : Number(row.width),
    height: row.height == null ? null : Number(row.height),
    metadataStatus: row.metadata_status as MetadataStatus,
    metadata: parseJson<RedactedMetadata>(row.metadata_json as string, {
      status: row.metadata_status as MetadataStatus,
      sizeBytes: Number(row.size_bytes),
      hasExif: false,
      redactedFields: [],
      publicFields: {}
    }),
    ocrText: String(row.ocr_text ?? ""),
    createdAt: String(row.created_at)
  } satisfies MediaAssetRecord;
}

export function insertVerification(input: {
  analysisId: string;
  matchedReceiptId: string | null;
  exactHashMatch: boolean;
  similarityScore: number | null;
  trustLabel: TrustLabel;
  badges: TrustBadge[];
  evidence: unknown;
}) {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO verifications (
        id, analysis_id, matched_receipt_id, exact_hash_match, similarity_score,
        trust_label, badges_json, evidence_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      input.analysisId,
      input.matchedReceiptId,
      input.exactHashMatch ? 1 : 0,
      input.similarityScore,
      input.trustLabel,
      JSON.stringify(input.badges),
      JSON.stringify(input.evidence),
      createdAt
    );
  return id;
}

export function insertTrustCard(input: {
  verificationId: string;
  trustLabel: TrustLabel;
  card: TrustCard;
}) {
  const createdAt = new Date().toISOString();
  const id = randomUUID();
  getDb()
    .prepare(
      `INSERT INTO trust_cards (
        trust_card_id, verification_id, trust_label, summary,
        verified_points_json, unverified_points_json, recommended_action, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      input.verificationId,
      input.trustLabel,
      input.card.summary,
      JSON.stringify(input.card.what_we_verified),
      JSON.stringify(input.card.what_we_could_not_verify),
      input.card.recommended_action,
      createdAt
    );
  return id;
}
