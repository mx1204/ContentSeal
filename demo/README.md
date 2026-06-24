# ContentSeal Demo Assets

Use the live site for teammate testing:

[https://contentseal.vercel.app](https://contentseal.vercel.app)

The deployed `/demo` page shows the fixture gallery. For local testing, the upload-ready files live in `demo/assets/`.

For an event computer without local fixture files, use these public asset URLs in `Recover Source`:

- `https://contentseal.vercel.app/demo/assets/01-original-proof.png`
- `https://contentseal.vercel.app/demo/assets/03-screenshot-repost.png`
- `https://contentseal.vercel.app/demo/assets/02-edited-copy.png`
- `https://contentseal.vercel.app/demo/assets/04-unknown-ai-style.png`

Run this command only when you want to regenerate the sample images locally:

```powershell
npm run demo:assets
```

Generated files:

- `01-original-proof.png`: upload first in `Seal Source`.
- `02-edited-copy.png`: upload in `Recover Source`; expected label is `Changed Copy Risk` or `Conflicting Signals`.
- `03-screenshot-repost.png`: upload in `Recover Source`; expected label is `Source Recovered From Screenshot`.
- `04-unknown-ai-style.png`: upload in `Recover Source`; expected label is `No Verified Origin Found`.

Recommended pitch path:

1. Before the pitch, click `Load Demo` in `Seal Source`, then choose `01-original-proof.png` when testing locally, or upload any original image on Vercel.
2. Scan `01-original-proof.png` to show a verified original.
3. Scan `03-screenshot-repost.png` to show metadata loss with source recovery.
4. Scan `02-edited-copy.png` to show changed-copy uncertainty.
5. Paste a direct public image URL in `Recover Source` when you want to show web-image scanning without downloading first.
6. Delete the created proof receipt, then scan `01-original-proof.png` again to show that proof deletion removes future matches.

For the 3-minute pitch itself, explain this workflow with the deck or recorded video instead of relying on a live upload demo.

On Vercel, Firebase-backed persistence lets teammates test receipts across browsers when the Firebase Admin environment variables are configured. Browser localStorage is only a lightweight fallback cache for proof fingerprints.

Remote URL scanning only accepts direct public image URLs. Localhost, private-network, and credentialed URLs are blocked before analysis.

To add mock C2PA, watermark, or classifier signals, copy `demo/mock-signals.example.json` to `data/mock-signals.json` and replace the key with the SHA-256 hash shown in the app.
