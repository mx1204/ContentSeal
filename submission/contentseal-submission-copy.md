# ContentSeal Submission Copy

## YouTube Title

ContentSeal Demo - Recover Trusted Sources from Screenshots and Edited Images

## YouTube Description

ContentSeal is a lightweight provenance tool for the A2 challenge: Authenticity in a synthetic world.

When metadata disappears after screenshots, reposts, crops, compression, or edited copies, ContentSeal helps users recover the trusted source behind an image. The demo shows how an issuer seals an original image, how a user recovers the source from a screenshot, how the AI Evidence Layer explains provenance signals, and how changed or unknown images are handled with clear uncertainty.

Live demo: https://contentseal.vercel.app
GitHub: https://github.com/mx1204/ContentSeal

Built with Next.js, React, TypeScript, Tailwind CSS, Firebase, Vercel, Sharp, exifr, Tesseract.js, OpenAI Codex, and ElevenLabs.

## Elevator Pitch

ContentSeal recovers trusted sources from screenshots, reposts, and edited images after metadata disappears.

## 2-3 Sentence Solution Summary

ContentSeal lets publishers seal original images with lightweight proof receipts, then lets viewers recover that source from screenshots, reposts, crops, compressed images, edited copies, or direct image URLs. Instead of making a black-box fake verdict, it combines SHA-256, perceptual hashing, metadata/OCR signals, creator accountability, declared AI usage, proof status, and an AI Evidence Layer that explains what is verified, what is uncertain, and what users should check before resharing.

## Problem Statement

Screenshots and reposts are how content spreads, but they often strip the provenance signals people need to judge whether something is real, human, and trustworthy. Ordinary users need a lightweight way to recover a trusted source after metadata, C2PA, or platform context disappears.

## Target User

Our first target user is a student club, event team, or small publisher that issues public posters or notices, plus the viewer who receives those images as screenshots or reposts before resharing. The specific moment is when an official-looking image appears in a chat or social feed, but the viewer cannot tell who issued it, whether it changed, or whether it is still current.

Pitch spine: We help viewers who struggle with lost source context during screenshot and repost sharing by solving the broken provenance bottleneck through lightweight proof receipts and source recovery, so they can verify before resharing.

## About The Project

### Inspiration

Most authenticity tools focus on detecting whether content is AI-generated or fake. But in real sharing behaviour, people often do not receive the original file. They receive screenshots, reposts, compressed images, or cropped copies where metadata is missing. We wanted to answer a more practical question: when provenance is damaged, can an ordinary person still recover a trusted source?

The pitch guide pushed us to be more specific about the user and bottleneck. The pain is uncertainty, but the bottleneck is lost source context after normal sharing behaviour strips metadata and platform evidence.

### What it does

ContentSeal lets an issuer create a proof receipt for an original image. The receipt stores file-level and visual evidence, including SHA-256, perceptual hashes, creator claim, trust level, declared AI usage, official source URL, expiry, version, and proof status.

When a viewer uploads an image, ContentSeal checks whether it is the exact original, a screenshot or repost that still links visually to a known source, a changed copy that needs caution, or an unknown image with no verified origin. The AI Evidence Layer explains source recovery, human accountability, AI/synthetic context, and change risk without pretending to give a perfect truth verdict.

### How we built it

We built ContentSeal as a Next.js web app with React, TypeScript, and Tailwind CSS. The backend routes analyse uploaded images, compute SHA-256 hashes, generate perceptual hash variants, extract redacted metadata with exifr and Sharp, and optionally support OCR-based conflict checks with Tesseract.js.

For persistence, the app supports Firebase-backed storage in production and a local SQLite/filesystem fallback for development. We deployed the live prototype on Vercel and used OpenAI Codex to iterate the product, implementation, tests, and pitch materials. ElevenLabs is used for the demo video voiceover.

### Challenges we ran into

The hardest product challenge was avoiding a misleading "fake or real" binary. A screenshot can be trustworthy, modified, or unknown depending on whether a source can be recovered and whether visible content conflicts with the original.

The hardest technical challenge was separating screenshot/repost recovery from changed-copy risk. We had to tune the logic so a real cropped screenshot can recover the source, while an edited version is still warned as changed instead of being treated as safe.

### Accomplishments that we're proud of

We are proud that ContentSeal tells a complete provenance story: seal the source, recover it after metadata loss, open the accountable proof page, explain the evidence, warn on changed copies, and clearly admit when no trusted origin is found.

We are also proud that the demo is not only a UI mockup. It performs real image analysis using hashes, perceptual hashes, metadata signals, receipt state, Firebase persistence, and a working Vercel deployment.

### What we learned

We learned that authenticity is not only about detecting AI. The more useful user experience is often source recovery, accountability, and uncertainty communication.

We also learned that provenance products need careful language. A system should not say an image is "true" just because it visually matches a known source. It should explain what was recovered, what changed, and what still needs human judgment.

### What's next for ContentSeal

Next, we would improve crop-aware matching, enable real C2PA inspection in production, add stronger OCR conflict detection, support video and document receipts, and build a browser/mobile share extension so users can scan screenshots directly from their social feed.

We would also add organisation onboarding, verified domain ownership, public proof pages with QR codes, and user research with student clubs, event teams, and small publishers.

## Built With

- Next.js
- React
- TypeScript
- Tailwind CSS
- Node.js
- Firebase Admin SDK
- Firebase Firestore
- Firebase Storage fallback / Firestore preview fallback
- Vercel
- Sharp
- exifr
- Tesseract.js
- SQLite local development fallback
- OpenAI Codex
- ElevenLabs
- GitHub

## Try It Out Links

- Live demo: https://contentseal.vercel.app
- GitHub repo: https://github.com/mx1204/ContentSeal
- Demo video: replace this with your YouTube link

## Project Media Suggestions

Use screenshots in 3:2 ratio if possible:

1. Homepage hero: "When metadata disappears, recover the source."
2. Create Proof page with demo data loaded.
3. Proof Created result.
4. Recover Source result showing "Source Recovered From Screenshot".
5. AI Evidence Layer close-up.
6. Proof page showing creator trust, AI usage, official source, status, and expiry.
7. Changed Copy Risk result.
8. No Verified Origin Found result.
