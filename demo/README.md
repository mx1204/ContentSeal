# ContentSeal Demo Assets

Use the live site for teammate testing:

[https://contentseal.vercel.app](https://contentseal.vercel.app)

The deployed `/demo` page shows the fixture gallery. For local testing, the upload-ready files live in `demo/assets/`.

Run this command only when you want to regenerate the sample images locally:

```powershell
npm run demo:assets
```

Generated files:

- `01-original-proof.png`: upload first in `Create Proof`.
- `02-edited-copy.png`: upload in `Scan Image`; expected label is `Modified Copy` or `Conflicting Signals`.
- `03-screenshot-repost.png`: upload in `Scan Image`; expected label is `Screenshot / Repost Match`.
- `04-unknown-ai-style.png`: upload in `Scan Image`; expected label is `No Verified Origin Found`.

Recommended pitch path:

1. Click `Load Demo` in `Create Proof`, then choose `01-original-proof.png` when testing locally, or upload any original image on Vercel.
2. Scan `01-original-proof.png` to show a verified original.
3. Scan `03-screenshot-repost.png` to show metadata loss with visual recovery.
4. Scan `02-edited-copy.png` to show changed-file uncertainty.
5. Delete the created proof receipt, then scan `01-original-proof.png` again to show that proof deletion removes future matches.

On Vercel, Firebase-backed persistence lets teammates test receipts across browsers when the Firebase Admin environment variables are configured. Browser localStorage is only a lightweight fallback cache for proof fingerprints.

To add mock C2PA, watermark, or classifier signals, copy `demo/mock-signals.example.json` to `data/mock-signals.json` and replace the key with the SHA-256 hash shown in the app.
