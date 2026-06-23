import { rm } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const targets = [path.join(root, "data"), path.join(root, "storage")];

for (const target of targets) {
  const relative = path.relative(root, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to remove path outside workspace: ${target}`);
  }
}

for (const target of targets) {
  await rm(target, { recursive: true, force: true });
}

console.log("ContentSeal runtime data cleared.");
