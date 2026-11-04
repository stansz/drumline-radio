# AGENTS.md

Drumline Radio is a browser jukebox that plays full songs written as text scores. It uses
TypeScript, Vite, and Web Audio, with no framework or runtime dependencies. Its sibling project is
Drumline Studio (`stansz/drumline-studio`).

Commands: `npm run dev`, `npm test`, `npm run test:sandbox`, `npm run typecheck`,
`npm run build`. Pushing to `main` deploys to GitHub Pages, and a failing test blocks the deploy.
`CLAUDE.md` only imports this file.

## Read before changing

- Song files, the parser, or timing: [docs/song-format.md](docs/song-format.md)

## Rules

- Keep `src/song.ts`, `src/roles.ts`, `src/pitch.ts`, and `src/timing.ts` free of the DOM and
  audio, so Vitest can test them.
- Songs are public-domain melodies (composer long dead and published before 1930, or traditional)
  arranged by Claude, or Claude's own originals. Never add copyrighted songs. Credit every
  public-domain piece in `README.md`.
- Song data is written by Claude and pasted verbatim. Don't change notes in a song file to make a
  test pass; report the failing check instead.
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
