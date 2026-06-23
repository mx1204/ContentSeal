import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { dataDir } from "../paths";
import type {
  C2paInspection,
  ClassifierInspection,
  WatermarkInspection
} from "../types";

interface MockSignalRecord {
  c2pa?: Partial<C2paInspection>;
  watermark?: Partial<WatermarkInspection>;
  classifier?: Partial<ClassifierInspection>;
}

let cache: Record<string, MockSignalRecord> | null = null;

export function loadMockSignals() {
  if (cache) {
    return cache;
  }

  const fixturePath = path.join(dataDir, "mock-signals.json");
  if (!existsSync(fixturePath)) {
    cache = {};
    return cache;
  }

  try {
    cache = JSON.parse(readFileSync(fixturePath, "utf8")) as Record<string, MockSignalRecord>;
  } catch {
    cache = {};
  }
  return cache;
}

export function mockSignalFor(sha256: string) {
  return loadMockSignals()[sha256];
}
