import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mockSignalFor } from "./mock-signals";
import type { C2paInspection } from "../types";

const execFileAsync = promisify(execFile);

function c2paFromMock(sha256: string): C2paInspection | null {
  const mock = mockSignalFor(sha256)?.c2pa;
  if (!mock) {
    return null;
  }
  return {
    status: mock.status ?? "not_checked",
    claimGenerator: mock.claimGenerator,
    actions: mock.actions ?? [],
    signatureStatus: mock.signatureStatus,
    summary: mock.summary,
    raw: mock.raw
  };
}

export async function inspectC2pa(input: {
  sha256: string;
  filePath?: string;
}): Promise<C2paInspection> {
  const mock = c2paFromMock(input.sha256);
  if (mock) {
    return mock;
  }

  const toolPath =
    process.env.C2PATOOL_PATH ||
    process.env.CONTENTSEAL_C2PATOOL_PATH ||
    process.env.ORIGINSEAL_C2PATOOL_PATH;
  if (!toolPath || !input.filePath) {
    return {
      status: "not_checked",
      actions: [],
      summary: "C2PA inspection is not configured for this environment."
    };
  }

  try {
    const { stdout } = await execFileAsync(toolPath, [input.filePath, "--json"], {
      timeout: 5000,
      maxBuffer: 1024 * 1024 * 4
    });
    const parsed = JSON.parse(stdout) as Record<string, unknown>;
    const manifests = parsed.manifests as Record<string, unknown> | undefined;
    const activeManifest = parsed.active_manifest as string | undefined;
    const manifest =
      manifests && activeManifest && typeof manifests[activeManifest] === "object"
        ? (manifests[activeManifest] as Record<string, unknown>)
        : undefined;

    const assertions = Array.isArray(manifest?.assertions)
      ? (manifest.assertions as Array<Record<string, unknown>>)
      : [];
    const actions = assertions
      .map((assertion) => assertion.label)
      .filter((value): value is string => typeof value === "string");

    return {
      status: "present",
      claimGenerator:
        typeof manifest?.claim_generator === "string" ? manifest.claim_generator : undefined,
      actions,
      signatureStatus: "unknown",
      summary: "Content Credentials were found and parsed.",
      raw: parsed
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown C2PA inspection error";
    return {
      status: "unreadable",
      actions: [],
      signatureStatus: "unknown",
      summary: message
    };
  }
}
