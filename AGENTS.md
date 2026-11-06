# AGENTS.md

Drumline Radio is a browser jukebox that plays full songs written as text scores. It uses
TypeScript, Vite, and Web Audio, with no framework or runtime dependencies. Its sibling project is
Drumline Studio (`stansz/drumline-studio`).

Commands: `npm run dev`, `npm test`, `npm run test:sandbox`, `npm run typecheck`,
`npm run build`. Pushing to `main` deploys to GitHub Pages, and a failing test blocks the deploy.
`CLAUDE.md` only imports this file.

## Read before changing

- The big picture: [docs/how-it-works.md](docs/how-it-works.md)
- Song files, the parser, or timing: [docs/song-format.md](docs/song-format.md)
- Sound, styles, or patches: [docs/sound.md](docs/sound.md)

## Rules

- Code is grouped by layer: `src/music/` (song format, timing, pitch, library), `src/audio/`
  (engine, voices, styles, curves), and `src/ui/` (page, dial, score, meters, CSS). Songs live in
  `src/songs/`. [docs/how-it-works.md](docs/how-it-works.md) is the short overview.
- Keep everything in `src/music/`, plus `src/audio/styles.ts`, `src/audio/curves.ts`, and
  `src/ui/view.ts`, free of the DOM and audio, so Vitest can test them.
- `src/audio/engine.ts` and `src/audio/voices.ts` don't touch the DOM.
- Every voice connects to its track's channel in `engine.ts`, never straight to the master chain,
  so track volume, pan, and sends cover everything.
- Every song in `src/songs/` must parse with no errors; `tests/library.test.ts` checks this.
- Dev scripts live in `tools/` (see `tools/README.md`): the arranger that builds the arranged
  songs, `npm run check:songs`, and headless-Edge checks. When an arranged song changes, change its
  recipe in `tools/arranger/songs.mjs` too, so a rebuild keeps the change; `tests/drift.test.ts`
  fails when a generated song in `src/songs/` doesn't match its generator. Browser checks run Edge
  muted.
- A song is hidden with a `hidden: true` header, set in its recipe when it has one. Hidden songs
  are still parsed and checked, but they stay out of the library.
- The arranger is a starting point, not a rule. Fit each song's form, grooves, and textures to its
  genre and mood (`arrangeForm()` for verse/chorus/breakdown shape). Hand-write a song when the
  arranger can't express it, and extend the arranger with opt-in options when it falls short.
- Songs are public-domain melodies (composer long dead and published before 1930, or traditional)
  arranged by Claude, or Claude's own originals. Never add copyrighted songs. Credit every
  public-domain piece in `README.md`.
- Song data is written by Claude and pasted verbatim. Don't change notes in a song file to make a
  test pass; report the failing check instead.
- Don't put `share` (or other social-button words) in element ids or classes: content blockers such
  as uBlock Origin hide them, which hid the Share buttons in Firefox.
- Wrap every `localStorage` call in `try`/`catch`, and make the app work without it. Keys start
  with `drumline-radio-`.
- The service worker (src/pwa/sw.js) precaches every built file, and its list is generated in
  vite.config.ts. Don't hand-edit cache lists. Files in public/ are cached too.
- Vitest has no Web Audio or DOM, so test audio logic through exported pure functions. Check UI
  and audio changes in a browser.
- On Windows, `npm test` and `npm run build` fail with `spawn EPERM` inside the
  `dsh --profile headless` sandbox. Use `npm run test:sandbox` there, and still run `npm test`
  outside the sandbox before committing. Don't widen the sandbox, set `NODE_OPTIONS`, or stub
  modules.
- Docs describe only what the code does now. When a change makes a doc statement false, fix the
  doc in the same change.
- Update `README.md` for features or commands, `docs/song-format.md` for the song format, and
  this file for rules.
