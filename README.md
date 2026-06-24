# ContentSeal

ContentSeal is an image-first provenance verification demo for the A2 challenge:

> Authenticity in a synthetic world -- how might we build lightweight provenance tools that help people verify what is real, human, and trustworthy?

The app lets a creator issue a local proof receipt for an original image, then lets anyone scan a saved web image, screenshot, repost, edited copy, or unknown visual against those receipts. It combines deterministic signals, weak provenance signals, human accountability context, and a guarded Content Trust Card. It does not claim that content is true or fake.

## Live Site

Use the public Vercel deployment when teammates, reviewers, or external testers need to try the product:

[https://contentseal.vercel.app](https://contentseal.vercel.app)

For the current preview deployment, create and verify proofs in the same browser. Vercel does not provide the project with a persistent database by default, so preview proofs are also kept in browser localStorage.

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
2. Go to `Create Proof`.
3. Upload an original PNG, JPEG, WebP, or AVIF image. For the planned demo path, use `demo/assets/01-original-proof.png` from this repo when testing locally, or use any image saved from your device on the deployed site.
4. Fill the required proof fields, or click `Load Demo` to prefill a realistic receipt.
5. Click `Create Proof Receipt`.
6. Go to `Verify`.
7. Upload the same image. Expected result: `Verified Original`.
8. Upload a visually similar edited or reposted image. Expected result: `Modified Copy`, `Screenshot / Repost Match`, or `Conflicting Signals`, depending on the signals.
9. Delete the proof from the proof list if you want to show that future scans no longer match it.

### With Demo Fixtures

The deterministic fixture files live in `demo/assets/`:

- `01-original-proof.png`: create the proof first, then scan it. Expected: `Verified Original`.
- `02-edited-copy.png`: scan after the original proof exists. Expected: `Modified Copy` or `Conflicting Signals`.
- `03-screenshot-repost.png`: scan after the original proof exists. Expected: `Screenshot / Repost Match`.
- `04-unknown-ai-style.png`: scan without a matching proof. Expected: `No Verified Origin Found`.

The `/demo` page also shows these fixtures and the recommended pitch order.

## Vercel Preview Notes

The Vercel deployment is useful for teammate testing, but it does not provision a persistent database by default.

- Runtime files are written to `/tmp/contentseal` on Vercel because the deployment bundle is read-only.
- Created proof fingerprints are also saved in the browser's localStorage.
- In the same browser session, a teammate can create a proof, scan the same or modified image, delete the proof, and open the proof page.
- Browser-local proof cache is for preview testing only. For a production multi-user system, replace the local SQLite/filesystem runtime with persistent storage such as Postgres plus object storage.
- Deploy again after public-facing code changes with `npx vercel deploy --prod --yes`.

## Demo Flow

1. In `Create Proof`, click `Load Demo`.
2. Upload `demo/assets/01-original-proof.png` as the original media.
3. In `Scan Image`, upload `demo/assets/01-original-proof.png`.
   Expected: `Verified Original`.
4. Upload `demo/assets/03-screenshot-repost.png`.
   Expected: `Screenshot / Repost Match`.
5. Upload `demo/assets/02-edited-copy.png`.
   Expected: `Modified Copy` or `Conflicting Signals`.
6. Upload `demo/assets/04-unknown-ai-style.png`.
   Expected: `No Verified Origin Found`.

The scan flow also accepts any JPEG, PNG, WebP, or AVIF image saved from a website or device. If no matching proof receipt exists, the correct outcome is an accountable unknown state, not a fake verdict.

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

- SQLite database: `data/contentseal.sqlite`
- Uploaded media: `storage/media`
- Both directories are ignored by git.

Proof receipts can be deleted from the local UI. Deleting a proof removes its receipt, proof events, matching hash data, related verification/trust-card rows, and the original stored media file when it is safe to do so. After deletion, future scans will no longer match that proof.

The app still keeps verification uploads for local inspection. For production, replace this with a retention policy that deletes verification-only uploads after analysis while preserving active proof receipt originals.

## Mock Signals

Watermark and classifier providers are pluggable and mockable. To demo AI-origin signals:

1. Upload or analyse an image and copy its SHA-256 value from the UI.
2. Copy `demo/mock-signals.example.json` to `data/mock-signals.json`.
3. Replace `replace-with-sha256` with the copied hash.
4. Re-upload the same file in `Scan Image`.

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
- `node:sqlite` is used for local persistence and is still experimental in Node 24. Use Postgres or a stable SQLite package before production deployment.
