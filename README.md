# ContentSeal

ContentSeal is a screenshot provenance recovery demo for the A2 challenge:

> Authenticity in a synthetic world -- how might we build lightweight provenance tools that help people verify what is real, human, and trustworthy?

The app lets an issuer seal an original image with a proof receipt, then lets anyone recover that source from a saved image, screenshot, repost, crop, compressed copy, edited copy, or direct image URL. It combines deterministic hashes, visual fingerprints, metadata/OCR signals, issuer accountability, and a guarded Content Trust Card. It does not claim that content is true or fake.

## Live Site

Use the public Vercel deployment when teammates, reviewers, or external testers need to try the product:

[https://contentseal.vercel.app](https://contentseal.vercel.app)

The deployed site uses Firebase-backed persistence when the required Firebase Admin environment variables are configured in Vercel. Browser localStorage is still used as a lightweight fallback cache for proof fingerprints.

## Run Locally

```powershell
npm install
npm run demo:assets
npm run dev -- --hostname 127.0.0.1 --port 3101
```

Open [http://127.0.0.1:3101](http://127.0.0.1:3101).

Use port `3101` for this project so it does not collide with another local app on `3000`.

Run `npm run demo:assets` again only when you want to regenerate the deterministic test images.

## How To Test The Website

### On Vercel

1. Open [https://contentseal.vercel.app](https://contentseal.vercel.app).
2. Go to `Seal Source`.
3. Upload an original PNG, JPEG, WebP, or AVIF image. For the planned demo path, use `demo/assets/01-original-proof.png` from this repo when testing locally, or use any image saved from your device on the deployed site.
4. Fill the required proof fields, or click `Load Demo` to prefill a realistic receipt.
5. Click `Create Proof Receipt`.
6. Go to `Recover Source`.
7. Upload the same image. Expected result: `Verified Original`.
8. Upload a visually similar edited or reposted image. Expected result: `Modified Copy`, `Screenshot / Repost Match`, or `Conflicting Signals`, depending on the signals.
9. Paste a direct public image URL in `Recover Source` to scan without saving the file first. Local/private URLs are blocked.
10. Delete the proof from the proof list if you want to show that future scans no longer match it.

### With Demo Fixtures

The deterministic fixture files live in `demo/assets/`:

- `01-original-proof.png`: create the proof first, then scan it. Expected: `Verified Original`.
- `02-edited-copy.png`: scan after the original proof exists. Expected: `Modified Copy` or `Conflicting Signals`.
- `03-screenshot-repost.png`: scan after the original proof exists. Expected: `Screenshot / Repost Match`.
- `04-unknown-ai-style.png`: scan without a matching proof. Expected: `No Verified Origin Found`.

The `/demo` page also shows these fixtures and the recommended pitch order.

## Firebase And Vercel

Production and preview deployments can use Firebase instead of the local SQLite/filesystem runtime.

- Firestore stores proof receipts, media analysis records, pHash variants, verification records, trust cards, and receipt events.
- Firebase Storage stores uploaded media files when a Storage bucket is enabled.
- If Firebase Storage is not available, the app still stores receipts, hashes, and compressed media previews in Firestore so verification can continue. Enable Storage for long-term original media retention.
- Browser localStorage keeps a small proof fingerprint cache as a fallback, but Firebase is the shared persistence layer for teammate testing.
- Vercel needs `CONTENTSEAL_STORAGE_BACKEND=firebase` plus the Firebase Admin variables below.
- Current project note: Firebase Storage bucket creation is blocked until project billing/Storage setup is enabled, so `CONTENTSEAL_FIREBASE_STORAGE=disabled` uses Firestore compressed preview fallback.
- Deploy again after public-facing code changes with `npx vercel deploy --prod --yes`.

Required server environment variables:

```env
CONTENTSEAL_STORAGE_BACKEND=firebase
CONTENTSEAL_FIREBASE_STORAGE=disabled
FIREBASE_PROJECT_ID=contentseal-6c285
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=contentseal-6c285.firebasestorage.app
```

Do not commit the Firebase service account JSON or `.env.local`.

## Winning Demo Flow

1. In `Seal Source`, click `Load Demo`.
2. Upload `demo/assets/01-original-proof.png` as the original media.
3. In `Recover Source`, upload `demo/assets/01-original-proof.png`.
   Expected: `Verified Original`.
4. Upload `demo/assets/03-screenshot-repost.png`.
   Expected: `Screenshot / Repost Match`, proving source recovery after metadata loss.
5. Upload `demo/assets/02-edited-copy.png`.
   Expected: `Modified Copy` or `Conflicting Signals`, proving changed-copy warning.
6. Upload `demo/assets/04-unknown-ai-style.png`.
   Expected: `No Verified Origin Found`.

The scan flow also accepts any JPEG, PNG, WebP, or AVIF image saved from a website or device, plus direct public image URLs. If no matching proof receipt exists, the correct outcome is an accountable unknown state, not a fake verdict.

## Commands

```powershell
npm test
npm run build
npm run smoke:ui
npm run runtime:reset
```

`npm run smoke:ui` checks that the running app renders the main ContentSeal UI. Set `CONTENTSEAL_BASE_URL` to target another port:

```powershell
$env:CONTENTSEAL_BASE_URL="http://127.0.0.1:3101"; npm run smoke:ui
```

To smoke-test the public deployment from PowerShell:

```powershell
$env:CONTENTSEAL_BASE_URL="https://contentseal.vercel.app"; npm run smoke:ui
```

`npm run runtime:reset` removes local `data/` and `storage/` runtime state. Use it between demos when you want a clean proof database.

## Runtime Data

- Local SQLite database: `data/contentseal.sqlite`
- Local uploaded media: `storage/media`
- Firebase production data: Firestore collections plus Firebase Storage objects
- Local runtime directories and env files are ignored by git.

Proof receipts can be deleted from the local UI. Deleting a proof removes its receipt, proof events, matching hash data, related verification/trust-card rows, and the original stored media file when it is safe to do so. After deletion, future scans will no longer match that proof.

The app still keeps verification uploads for inspection. For a stricter production policy, delete verification-only uploads after analysis while preserving active proof receipt originals.

## Mock Signals

Watermark and classifier providers are pluggable and mockable. To demo AI-origin signals:

1. Upload or analyse an image and copy its SHA-256 value from the UI.
2. Copy `demo/mock-signals.example.json` to `data/mock-signals.json`.
3. Replace `replace-with-sha256` with the copied hash.
4. Re-upload the same file in `Recover Source`.

C2PA can also be mocked this way. For real C2PA inspection, set `C2PATOOL_PATH` or `CONTENTSEAL_C2PATOOL_PATH` to a local `c2patool` executable.

## OCR

OCR is disabled by default for fast local demos. Enable it only when you want text conflict checks for visually matched images:

```powershell
$env:CONTENTSEAL_ENABLE_OCR="1"
npm run dev -- --hostname 127.0.0.1 --port 3101
```

You can still force OCR off with `CONTENTSEAL_DISABLE_OCR=1`. The old `ORIGINSEAL_*` environment variables still work as fallback aliases for local compatibility.

## Current Limits

- Supported uploads: JPEG, PNG, WebP, and AVIF up to 20 MB.
- Video, audio, text, and deep forensic analysis are not implemented.
- Local fallback uses `node:sqlite`, which is still experimental in Node 24. Vercel production should use Firebase env variables instead of the local fallback.
