import { NextResponse } from "next/server";
import { generateTrustCard } from "@/lib/trust-card";
import type { VerificationEvidence } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const evidence = (await request.json()) as VerificationEvidence;
    if (!evidence.trustLabel) {
      return NextResponse.json({ error: "trustLabel is required." }, { status: 400 });
    }
    return NextResponse.json(generateTrustCard(evidence));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate trust card.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
