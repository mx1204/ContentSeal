# ContentSeal

ContentSeal is an image-first provenance verification demo. It creates local proof receipts, verifies uploaded images against those receipts, combines deterministic and weak signals, and renders a guarded Trust Card without an LLM call.

## Quick Start

```powershell
npm install
npm run demo:assets
npm run dev -- --hostname 127.0.0.1 --port 3101
```

Open [http://127.0.0.1:3101](http://127.0.0.1:3101).

Use port `3101` for this project so it does not collide with another local app on `3000`.

## Demo Flow

1. In `Create Proof`, upload `demo/assets/01-original-proof.png`.
2. In `Verify Media`, upload `demo/assets/01-original-proof.png`.
   Expected: `Verified Original`.
3. Upload `demo/assets/03-screenshot-repost.png`.
   Expected: `Screenshot / Repost Match`.
4. Upload `demo/assets/02-edited-copy.png`.
   Expected: `Modified Copy` or `Conflicting Signals`.
5. Upload `demo/assets/04-unknown-ai-style.png`.
   Expected: `No Verified Origin Found`.

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

`npm run runtime:reset` removes local `data/` and `storage/` runtime state. Use it between demos when you want a clean proof database.

## Runtime Data

- SQLite database: `data/contentseal.sqlite`
- Uploaded media: `storage/media`
- Both directories are ignored by git.

The app currently keeps uploaded proof and verification files for local inspection. For production, replace this with a retention policy that deletes verification-only uploads after analysis while preserving proof receipt originals.

## Mock Signals

Watermark and classifier providers are pluggable and mockable. To demo AI-origin signals:

1. Upload or analyse an image and copy its SHA-256 value from the UI.
2. Copy `demo/mock-signals.example.json` to `data/mock-signals.json`.
3. Replace `replace-with-sha256` with the copied hash.
4. Re-upload the same file in `Verify Media`.

C2PA can also be mocked this way. For real C2PA inspection, set `C2PATOOL_PATH` or `CONTENTSEAL_C2PATOOL_PATH` to a local `c2patool` executable.

## OCR

OCR is enabled by default and used only as a weak conflict signal for visually matched images. For faster demo runs, disable OCR:

```powershell
$env:CONTENTSEAL_DISABLE_OCR="1"
npm run dev -- --hostname 127.0.0.1 --port 3101
```

The old `ORIGINSEAL_*` environment variables still work as fallback aliases for local compatibility.

## Current Limits

- Supported uploads: JPEG, PNG, WebP, and AVIF up to 20 MB.
- Video, audio, text, and deep forensic analysis are not implemented.
- `node:sqlite` is used for local persistence and is still experimental in Node 24. Use Postgres or a stable SQLite package before production deployment.
