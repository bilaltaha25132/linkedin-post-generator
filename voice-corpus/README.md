# Voice corpus

Drop your best writing here as `.md` or `.txt` files — past LinkedIn posts,
newsletters, anything that sounds like you. Each file becomes one voice sample.

`scripts/import-voice.mjs` embeds everything in this folder **plus** your
portfolio's `blog.ts` and `work.ts`, and rebuilds the `voice_corpus` table. The
generator retrieves the closest samples at write time to imitate your voice.

More range here means better drafts. Re-run the import after adding files:

```
node --env-file=.env.local scripts/import-voice.mjs
```
