export function normalizeOcrText(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function extractOcrText(buffer: Buffer) {
  if ((process.env.CONTENTSEAL_DISABLE_OCR ?? process.env.ORIGINSEAL_DISABLE_OCR) === "1") {
    return { status: "unavailable" as const, text: "" };
  }

  try {
    const { recognize } = await import("tesseract.js");
    const result = await recognize(buffer, "eng", {
      logger: () => undefined
    });
    const text = normalizeOcrText(result.data.text ?? "");
    return {
      status: text ? ("completed" as const) : ("empty" as const),
      text
    };
  } catch {
    return { status: "failed" as const, text: "" };
  }
}

export function isMaterialOcrConflict(originalText: string, uploadedText: string) {
  if (!originalText || !uploadedText) {
    return false;
  }

  const originalTokens = new Set(originalText.split(" ").filter(Boolean));
  const uploadedTokens = new Set(uploadedText.split(" ").filter(Boolean));
  if (originalTokens.size < 4 || uploadedTokens.size < 4) {
    return false;
  }

  let shared = 0;
  for (const token of originalTokens) {
    if (uploadedTokens.has(token)) {
      shared += 1;
    }
  }
  const overlap = shared / Math.max(originalTokens.size, uploadedTokens.size);
  return overlap < 0.65;
}
