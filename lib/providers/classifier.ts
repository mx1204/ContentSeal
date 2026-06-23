import { mockSignalFor } from "./mock-signals";
import type { ClassifierInspection } from "../types";

export async function inspectAiClassifier(input: {
  sha256: string;
}): Promise<ClassifierInspection> {
  const mock = mockSignalFor(input.sha256)?.classifier;
  if (mock) {
    return {
      status: mock.status ?? "inconclusive",
      confidence: mock.confidence,
      detectedArtifacts: mock.detectedArtifacts ?? [],
      limitations:
        mock.limitations ??
        "This classifier signal is a weak supporting indicator and is not a verdict."
    };
  }

  return {
    status: "not_run",
    detectedArtifacts: [],
    limitations: "No AI-generated media classifier is configured for this environment."
  };
}
