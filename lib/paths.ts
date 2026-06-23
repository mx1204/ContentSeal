import path from "node:path";
import { mkdir } from "node:fs/promises";

export const rootDir = process.cwd();
export const dataDir = path.join(rootDir, "data");
export const storageDir = path.join(rootDir, "storage");
export const mediaStorageDir = path.join(storageDir, "media");

export async function ensureRuntimeDirs() {
  await mkdir(dataDir, { recursive: true });
  await mkdir(mediaStorageDir, { recursive: true });
}

export function sqlitePath() {
  return path.join(dataDir, "contentseal.sqlite");
}

export function mediaPathFor(id: string, extension: string) {
  const safeExtension = extension.replace(/[^a-z0-9]/gi, "").toLowerCase() || "bin";
  return path.join(mediaStorageDir, `${id}.${safeExtension}`);
}
