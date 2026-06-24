# ContentSeal 3-Minute Pitch Script

This script follows the TheFirst Spark pitch spine:
challenge statement, target user/use case, pain point/bottleneck, current alternative, solution/value, how it works, and validation.

## Slide 1 - Challenge Statement, 0:00-0:20

Hi, we are ContentSeal, and we are responding to A2: authenticity in a synthetic world.
The challenge we focus on is what happens after content becomes a screenshot, repost, crop, or compressed copy.
When metadata disappears, people still need a way to recover the trusted source.

## Slide 2 - Target User & Use Case, 0:20-0:40

Our first target user is not everyone online.
We focus on student clubs, event teams, and small publishers who issue public posters or notices.
The use case is a viewer receiving a screenshot or reposted image in chat or social media before they reshare it or act on it.

## Slide 3 - Pain Point & Bottleneck, 0:40-1:05

The pain point is uncertainty.
The viewer cannot tell who issued the image, whether it was changed, or whether it is still current.
The bottleneck is that screenshots and reposts strip the original metadata, C2PA, and platform context, so ordinary users lose the evidence trail.

## Slide 4 - Current Alternative, 1:05-1:25

Today, people usually reverse image search, ask the sender, check metadata, or rely on AI detectors.
But those options do not solve the bottleneck.
They may guess style or search the web, but they often fail to recover an accountable source.

## Slide 5 - Solution & Value Proposition, 1:25-1:50

ContentSeal solves this by sealing the source before it spreads, then recovering it after context breaks.
We help viewers recover accountable source evidence from damaged image copies.
The outcome is simple: either a recovered proof page, a changed-copy warning, or a clear unknown state.

## Slide 6 - How It Works, 1:50-2:15

In the demo, the issuer first creates a lightweight proof receipt for the original poster.
Then a viewer uploads a screenshot or reposted copy.
The exact hash no longer matches, but the visual fingerprint recovers the original proof.
The viewer can open the proof page to check issuer, declared AI usage, source URL, expiry, and status.

## Slide 7 - AI Leverage & Technical Execution, 2:15-2:40

The AI Evidence Layer is not a black-box fake verdict.
It explains four signals: source recovery, human accountability, AI or synthetic context, and change risk.
Technically, we use SHA-256, perceptual hash variants, metadata signals, optional OCR conflict checks, Firebase persistence, and a live Vercel deployment.

## Slide 8 - Traction & Validation, 2:40-2:55

We validated the prototype against the key cases: exact original, screenshot recovery, changed copy risk, and unknown image.
We also added regression tests so a real cropped screenshot recovers the source while edited copies still trigger caution.
Next, we will validate with student clubs and event teams.

## Slide 9 - Close, 2:55-3:00

ContentSeal helps people verify what is real, human, and trustworthy after provenance signals are damaged.
Thank you.
