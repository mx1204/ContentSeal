# ContentSeal Demo Assets

Run this command to generate the sample images:

```powershell
npm run demo:assets
```

Generated files:

- `01-original-proof.png`: upload first in `Create Proof`.
- `02-edited-copy.png`: upload in `Verify Media`; expected label is `Modified Copy` or `Conflicting Signals`.
- `03-screenshot-repost.png`: upload in `Verify Media`; expected label is `Screenshot / Repost Match`.
- `04-unknown-ai-style.png`: upload in `Verify Media`; expected label is `No Verified Origin Found`.

To add mock C2PA, watermark, or classifier signals, copy `demo/mock-signals.example.json` to `data/mock-signals.json` and replace the key with the SHA-256 hash shown in the app.
