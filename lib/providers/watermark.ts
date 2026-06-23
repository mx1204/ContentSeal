import { mockSignalFor } from "./mock-signals";
import type { WatermarkInspection } from "../types";

export async function inspectWatermark(input: { sha256: string }): Promise<WatermarkInspection> {
  const mock = mockSignalFor(input.sha256)?.watermark;
  if (mock) {
    return {
      status: mock.status ?? "unavailable",
      confidence: mock.confidence,
      provider: mock.provider ?? "mock",
      explanation: mock.explanation ?? "Watermark signal supplied by mock fixture."
    };
  }

  return {
    status: "unavailable",
    explanation: "No supported watermark detector is configured for this file type."
  };
}
