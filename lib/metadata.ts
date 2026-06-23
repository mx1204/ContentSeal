import sharp from "sharp";
import * as exifr from "exifr";
import type { MetadataStatus, RedactedMetadata } from "./types";

const SENSITIVE_FIELD_PATTERNS = [
  /gps/i,
  /latitude/i,
  /longitude/i,
  /serial/i,
  /owner/i,
  /artist/i,
  /copyright/i,
  /creator/i,
  /author/i,
  /user/i,
  /location/i
];

const PUBLIC_EXIF_FIELDS = [
  "Make",
  "Model",
  "Software",
  "DateTimeOriginal",
  "CreateDate",
  "ModifyDate",
  "Orientation",
  "ColorSpace",
  "LensModel"
];

function toIsoString(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }
  return undefined;
}

function metadataStatus(exif: Record<string, unknown>, publicFields: Record<string, unknown>): MetadataStatus {
  const keys = Object.keys(exif);
  if (keys.length === 0) {
    return "missing";
  }
  return Object.keys(publicFields).length > 0 ? "present" : "partial";
}

export async function extractRedactedMetadata(buffer: Buffer, sizeBytes: number): Promise<RedactedMetadata> {
  const imageMetadata = await sharp(buffer, { failOn: "none" }).metadata();
  let exif: Record<string, unknown> = {};
  try {
    exif = ((await exifr.parse(buffer, {
      tiff: true,
      exif: true,
      gps: true,
      xmp: true,
      icc: false,
      iptc: true
    })) ?? {}) as Record<string, unknown>;
  } catch {
    exif = {};
  }

  const publicFields: Record<string, string | number | boolean | null> = {};
  const redactedFields: string[] = [];

  for (const [key, value] of Object.entries(exif)) {
    if (SENSITIVE_FIELD_PATTERNS.some((pattern) => pattern.test(key))) {
      redactedFields.push(key);
      continue;
    }
    if (PUBLIC_EXIF_FIELDS.includes(key)) {
      if (value instanceof Date) {
        publicFields[key] = value.toISOString();
      } else if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean" ||
        value === null
      ) {
        publicFields[key] = value;
      }
    }
  }

  const status = metadataStatus(exif, publicFields);
  const software = typeof exif.Software === "string" ? exif.Software : undefined;
  const createdAt = toIsoString(exif.DateTimeOriginal ?? exif.CreateDate);
  const modifiedAt = toIsoString(exif.ModifyDate);

  return {
    status,
    format: imageMetadata.format,
    width: imageMetadata.width,
    height: imageMetadata.height,
    sizeBytes,
    density: imageMetadata.density,
    hasAlpha: imageMetadata.hasAlpha,
    hasExif: Boolean(imageMetadata.exif) || Object.keys(exif).length > 0,
    cameraMake: typeof exif.Make === "string" ? exif.Make : undefined,
    cameraModel: typeof exif.Model === "string" ? exif.Model : undefined,
    software,
    createdAt,
    modifiedAt,
    redactedFields,
    publicFields
  };
}

export function hasEditSoftwareSignal(metadata: RedactedMetadata) {
  const software = metadata.software?.toLowerCase() ?? "";
  return [
    "photoshop",
    "lightroom",
    "canva",
    "figma",
    "gimp",
    "illustrator",
    "midjourney",
    "stable diffusion",
    "dall-e",
    "firefly"
  ].some((needle) => software.includes(needle));
}

export function hasScreenshotOrPlatformMetadata(metadata: RedactedMetadata) {
  const software = metadata.software?.toLowerCase() ?? "";
  const format = metadata.format?.toLowerCase() ?? "";
  return (
    metadata.status === "missing" ||
    software.includes("screenshot") ||
    software.includes("whatsapp") ||
    software.includes("instagram") ||
    software.includes("facebook") ||
    software.includes("telegram") ||
    format === "png"
  );
}
