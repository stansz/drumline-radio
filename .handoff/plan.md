## Goal

Ship four changes:

1. Songs: copy the 24 files from `.handoff/songs5/`. They contain a calmer Late Bus Home and a new
   `about:` line on all 20 public-domain songs.
2. An optional `about:` song header.
3. The readout title and subtitle scroll gently back and forth when they are too long to fit.
4. Clicking or tapping the readout opens a song card with credits, details, and the `about` story.

## Files to touch

- `src/songs/*.song` (copied from `.handoff/songs5/`)
- `src/music/song.ts`
- `src/ui/view.ts`, `src/ui/marquee.ts` (new), `src/ui/ui.ts`, `src/ui/style.css`, `index.html`
- `tests/song.test.ts`, `tests/view.test.ts`
- `README.md`, `docs/song-format.md`, `docs/how-it-works.md`

## Steps

1. **Songs.** Copy every file in `.handoff/songs5/` to `src/songs/` byte for byte, overwriting. Do not
   edit song files.

2. **`src/music/song.ts`:** add an optional `about: string | null` to `SongMeta`, after `arranger`,
   defaulting to `null`. It works like `arranger`: add `'about'` to `KNOWN_HEADER_KEYS`; an empty value
   gives `err(line, 'about must not be empty')`.

3. **`src/ui/view.ts`.** Add pure helpers:
   - `export function marqueeTiming(overflowPx: number): { shift: number; seconds: number }` returns
     `{ shift: -Math.ceil(overflowPx) - 8, seconds: Math.max(6, Math.round(4 + overflowPx / 25)) }`.
   - `export function songFacts(meta: { year: string; key: string; tempo: number; time: [number, number] }, categoryName: string, styleName: string, durationSec: number): [string, string][]`
     returns, in order:
     `[['Year', year], ['Category', categoryName], ['Style', styleName], ['Key', key], ['Tempo', \`${Math.round(tempo)} BPM\`], ['Time', \`${time[0]}/${time[1]}\`], ['Length', formatTime(durationSec)]]`.

4. **`src/ui/marquee.ts` (new):** `export function createMarquee(el: HTMLElement): { set(text: string): void; refit(): void }`.
   - On creation, clear `el` and append one `<span class="marquee-inner">`.
   - `set(text)` sets the span's text (skip if unchanged), then calls `refit()`.
   - `refit()`:
     - `overflow = span.scrollWidth - el.clientWidth`.
     - If `overflow > 1`: add the class `scrolling` to `el`, and set
       `el.style.setProperty('--marquee-shift', \`${shift}px\`)` and `--marquee-time` to `\`${seconds}s\``
       from `marqueeTiming(overflow)`.
     - Otherwise remove `scrolling`.

5. **`src/ui/ui.ts`:**
   - `const titleMarquee = createMarquee(titleEl)` and `const subtitleMarquee = createMarquee(subtitleEl)`.
     Replace every `titleEl.textContent = …` and `subtitleEl.textContent = …` with `titleMarquee.set(…)` and
     `subtitleMarquee.set(…)`. There are 8 assignments: in `updateReadout`, in `loadSong` before the
     engine exists, for the empty library, and at startup.
   - `new ResizeObserver(() => { titleMarquee.refit(); subtitleMarquee.refit(); }).observe(titleEl.parentElement!)`.
     Use a guarded variable instead of `!` if preferred.
   - Song card: on `.readout`, a `click`, or a `keydown` of Enter or Space, calls `openSongCard()`. It
     fills the dialog from `LIBRARY[current]` and calls `songCard.showModal()`:
     - `#card-title`: the title.
     - `#card-byline`: the composer, plus `` ` · arr. ${arranger}` `` when set.
     - `#card-facts`: clear it, then for each `[label, value]` from
       `songFacts(meta, categoryLabel(meta.category), STYLE_DEFS[meta.style].name, buildTimeline(song).duration)`
       append a `<dt>` with the label and a `<dd>` with the value. Import `buildTimeline` from
       `../music/timing`.
     - `#card-about`: the `about` text with `hidden = false`, or `hidden = true` when `about` is null.
   - `#card-close` closes the dialog.
   - Wherever the code checks `infoPanel.open` (keyboard shortcuts and screensaver auto-start), also
     treat `songCard.open` the same way.

6. **`index.html`:**
   - Make the readout open the card: on `<div class="readout" aria-live="polite">`, add
     `role="button" tabindex="0" aria-label="Song details" title="Song details"`. Keep `aria-live` on the
     inner `#title` and `#subtitle` instead, so move `aria-live="polite"` to `#title`.
   - Add after the info dialog:
   ```html
   <dialog id="song-card" class="info-panel song-card" aria-labelledby="card-title">
     <h2 id="card-title"></h2>
     <p id="card-byline" class="card-byline"></p>
     <dl id="card-facts" class="card-facts"></dl>
     <p id="card-about" class="card-about" hidden></p>
     <button id="card-close" class="info-action info-close" type="button">Close</button>
   </dialog>
   ```

7. **`src/ui/style.css`:**
   - `.readout { cursor: pointer; }`, and `.readout:focus-visible` uses the existing focus outline.
   - Marquee:
     ```css
     .marquee-inner { display: inline-block; white-space: nowrap; }
     .scrolling { text-overflow: clip; }
     .scrolling .marquee-inner { animation: marquee var(--marquee-time, 8s) ease-in-out infinite alternate; }
     @keyframes marquee { 0%, 15% { transform: translateX(0); } 85%, 100% { transform: translateX(var(--marquee-shift, 0)); } }
     @media (prefers-reduced-motion: reduce) { .scrolling .marquee-inner { animation: none; } .scrolling { text-overflow: ellipsis; } }
     ```
   - Song card:
     ```css
     .card-byline { margin: 0 0 12px; color: var(--muted); }
     .card-facts { display: grid; grid-template-columns: auto 1fr; gap: 4px 14px; margin: 0 0 12px; }
     .card-facts dt { color: var(--muted); font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; align-self: center; }
     .card-facts dd { margin: 0; font-family: var(--readout-font); font-size: 18px; color: var(--accent); }
     .card-about { margin: 0 0 4px; }
     ```

8. **Tests:**
   - `tests/song.test.ts`: a header with `about: Some story.` sets `meta.about`; without it, `meta.about`
     is `null`; an empty `about:` gives an error containing `about must not be empty`.
   - `tests/view.test.ts`:
     - `marqueeTiming(100)` gives `{ shift: -108, seconds: 8 }`, and `marqueeTiming(10)` gives
       `{ shift: -18, seconds: 6 }`.
     - `songFacts({ year: '1824', key: 'D major', tempo: 112, time: [4, 4] }, 'Classics', 'Orchestral', 109.4)`
       gives the seven pairs, ending with `['Length', '1:49']`.
   - `tests/library.test.ts` stays as is (24 songs). Add one test: every song with
     `source === 'public-domain'` has a non-null `about`.

9. **Docs:**
   - `docs/song-format.md`: add the header row
     `` | `about` | no | One line of plain text: the song's story, shown on its song card. | `` after `arranger`.
     Add an empty `about` to the header errors list.
   - `README.md`: add these feature bullets:
     - `- Long titles scroll in the readout. Tap the readout for a song card: credits, key, tempo, length, and a short story for each public-domain song.`
   - `docs/how-it-works.md`: under `src/ui/`, add a line for `marquee.ts`: it scrolls long readout text.

## Acceptance

- `npm run typecheck` exits 0.
- `npm run test:sandbox` exits 0.
- `git diff --no-index --quiet .handoff/songs5/late-bus-home.song src/songs/late-bus-home.song` exits 0, and the
  same holds for `jingle-bells.song`.

Verifier only:

- `npm test` exits 0.
- `npm run build` exits 0.

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch** except `.handoff/report.md`.
- Do not edit song data. If a song fails to parse, stop and report.
- No new dependencies. Keep `src/music/` and `src/ui/view.ts` free of DOM and audio APIs.
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and report it.
  Do not request wider sandbox access, set `NODE_OPTIONS`, or stub modules to get past it.

## Out of scope

- Audio, styles, the service worker, and other UI.

## If blocked

Stop, write what failed and the exact error in `.handoff/report.md`, and do not improvise a different design.
