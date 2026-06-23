import sharp from "sharp";
import type { PHashResult, PHashVariant } from "./types";

const SAMPLE_SIZE = 32;
const HASH_SIZE = 8;

function dctCoefficient(values: number[], u: number, v: number) {
  let sum = 0;
  for (let x = 0; x < SAMPLE_SIZE; x += 1) {
    for (let y = 0; y < SAMPLE_SIZE; y += 1) {
      const pixel = values[x * SAMPLE_SIZE + y] ?? 0;
      sum +=
        pixel *
        Math.cos(((2 * x + 1) * u * Math.PI) / (2 * SAMPLE_SIZE)) *
        Math.cos(((2 * y + 1) * v * Math.PI) / (2 * SAMPLE_SIZE));
    }
  }
  const cu = u === 0 ? 1 / Math.sqrt(2) : 1;
  const cv = v === 0 ? 1 / Math.sqrt(2) : 1;
  return 0.25 * cu * cv * sum;
}

function bitsToHex(bits: number[]) {
  let hex = "";
  for (let index = 0; index < bits.length; index += 4) {
    const nibble =
      ((bits[index] ?? 0) << 3) |
      ((bits[index + 1] ?? 0) << 2) |
      ((bits[index + 2] ?? 0) << 1) |
      (bits[index + 3] ?? 0);
    hex += nibble.toString(16);
  }
  return hex.padStart(16, "0");
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
    : sorted[middle] ?? 0;
}

async function normalizeBuffer(buffer: Buffer, variant: PHashVariant, targetAspectRatio?: number) {
  const base = sharp(buffer, { failOn: "none" }).rotate();
  const metadata = await base.metadata();
  const width = metadata.width ?? SAMPLE_SIZE;
  const height = metadata.height ?? SAMPLE_SIZE;

  if (variant === "trimmed") {
    try {
      return await sharp(buffer, { failOn: "none" }).rotate().trim({ threshold: 10 }).toBuffer();
    } catch {
      return buffer;
    }
  }

  if (variant === "center_crop") {
    const aspectRatio = targetAspectRatio ?? 1;
    const currentRatio = width / height;
    let cropWidth = width;
    let cropHeight = height;

    if (currentRatio > aspectRatio) {
      cropWidth = Math.max(1, Math.round(height * aspectRatio));
    } else if (currentRatio < aspectRatio) {
      cropHeight = Math.max(1, Math.round(width / aspectRatio));
    }

    const left = Math.max(0, Math.floor((width - cropWidth) / 2));
    const top = Math.max(0, Math.floor((height - cropHeight) / 2));

    return sharp(buffer, { failOn: "none" })
      .rotate()
      .extract({ left, top, width: cropWidth, height: cropHeight })
      .toBuffer();
  }

  return buffer;
}

export async function computePHash(
  buffer: Buffer,
  variant: PHashVariant = "full",
  targetAspectRatio?: number
): Promise<PHashResult> {
  const variantBuffer = await normalizeBuffer(buffer, variant, targetAspectRatio);
  const image = sharp(variantBuffer, { failOn: "none" }).rotate();
  const metadata = await image.metadata();
  const raw = await image
    .resize(SAMPLE_SIZE, SAMPLE_SIZE, { fit: "fill" })
    .grayscale()
    .raw()
    .toBuffer();

  const values = Array.from(raw, (value) => Number(value));
  const coefficients: number[] = [];
  for (let u = 0; u < HASH_SIZE; u += 1) {
    for (let v = 0; v < HASH_SIZE; v += 1) {
      coefficients.push(dctCoefficient(values, u, v));
    }
  }

  const acCoefficients = coefficients.slice(1);
  const threshold = median(acCoefficients);
  const bits = coefficients.map((coefficient, index) =>
    index === 0 ? 0 : coefficient > threshold ? 1 : 0
  );

  return {
    variant,
    hash: bitsToHex(bits),
    width: metadata.width ?? SAMPLE_SIZE,
    height: metadata.height ?? SAMPLE_SIZE
  };
}

export async function computePHashVariants(buffer: Buffer, targetAspectRatio?: number) {
  return Promise.all([
    computePHash(buffer, "full"),
    computePHash(buffer, "trimmed"),
    computePHash(buffer, "center_crop", targetAspectRatio)
  ]);
}

function hexToBigInt(hash: string) {
  return BigInt(`0x${hash || "0"}`);
}

export function hammingDistance(left: string, right: string) {
  let value = hexToBigInt(left) ^ hexToBigInt(right);
  let distance = 0;
  while (value > 0n) {
    distance += Number(value & 1n);
    value >>= 1n;
  }
  return distance;
}

export function phashSimilarity(left: string, right: string) {
  const distance = hammingDistance(left, right);
  return Math.max(0, 1 - distance / 64);
}
