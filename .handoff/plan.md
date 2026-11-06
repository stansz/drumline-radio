## Goal

Share links for Drumline Radio. A link opens the app tuned to a song in a chosen style, optionally at
a start time, ready to play (the listener presses ▶; no autoplay). A playlist can be shared as a link
too. Share buttons use the system share sheet, falling back to copying the link.

Link formats (hash only, so both hosts and the service worker need no change):

- Song: `#song=<id>&style=<style>` or `#song=<id>&style=<style>&t=<m:ss>`, e.g.
  `#song=third-rail&style=techno&t=1:20`. `<id>` is a `LibraryEntry.id` (the file name without
  `.song`); `<style>` is one of `STYLES` in `src/music/roles.ts`.
- Playlist: `#list=<id>~<style>,<id>~<style>,...`, e.g. `#list=third-rail~lofi,last-stop~techno`.

## Files to touch

- `src/ui/share.ts` (new)
- `tests/share.test.ts` (new)
- `src/ui/ui.ts`
- `index.html`
- `src/ui/style.css`
- `README.md`
- `docs/how-it-works.md`

## Steps

1. Create `src/ui/share.ts`. Pure, no DOM, no `window`, no audio. Export:
   - `type ShareLink = { kind: 'song'; song: string; style: StyleId | null; t: number | null } | { kind: 'list'; entries: PlaylistEntry[] }`
     (import `PlaylistEntry` from `./playlist`, `StyleId`/`STYLES` from `../music/roles`).
   - `formatShareTime(seconds: number): string` → `m:ss` from the floored seconds
     (`80` → `'1:20'`, `5.9` → `'0:05'`, `600` → `'10:00'`).
   - `parseShareTime(text: string): number | null` → accepts `m:ss` (seconds part exactly two digits,
     00–59) or a plain whole number of seconds (`'80'` → 80, `'1:20'` → 80). Anything else, or a
     negative value, → `null`.
   - `songHash(song: string, style: StyleId, t: number | null): string` →
     `'#song=<song>&style=<style>'`, plus `'&t=' + formatShareTime(t)` when `t !== null && t >= 1`.
     Values go through `encodeURIComponent` (`:` in the time may stay encoded or not; the parser must
     accept both).
   - `playlistHash(list: PlaylistEntry[]): string` → `'#list='` + entries joined as
     `<song>~<style>` with `,`. Empty list → `''`.
   - `parseShareHash(hash: string, ids: readonly string[]): ShareLink | null`:
     - Strip a leading `#`, parse with `URLSearchParams`.
     - If `list` is present: split on `,`, each item on `~`; keep items whose song is in `ids` and
       style is in `STYLES`; cap at `PLAYLIST_MAX` from `./playlist`. No valid items → `null`.
       Otherwise `{ kind: 'list', entries }`. `list` wins over `song` when both appear.
     - Else if `song` is present and in `ids`: `{ kind: 'song', song, style, t }` where `style` is
       the `style` param when it is in `STYLES`, else `null`; `t` is `parseShareTime(param)` or
       `null` when missing/invalid.
     - Otherwise `null` (unknown song id, empty hash, garbage).
2. Create `tests/share.test.ts` covering: time format/parse round-trip and the rejected inputs
   (`'1:5'`, `'1:60'`, `'-3'`, `'abc'`, `''`); `songHash` with and without `t` (and `t = 0.5` omitted);
   `parseShareHash` for a valid song link, `%3A`-encoded time, unknown style → `style: null`, unknown
   song → `null`, a playlist link with one bad item dropped, an all-bad playlist → `null`, `list`
   winning over `song`, leading `#` optional; `playlistHash` → `parseShareHash` round-trip.
3. `index.html`:
   - In the `#song-card` dialog, before `#card-close`, add
     `<div class="card-share info-row"><button id="card-share" class="info-action" type="button">Share song</button><button id="card-share-at" class="info-action" type="button" hidden>Share from 0:00</button></div>`.
   - In the playlist `.pl-actions`, after `#pl-clear`, add
     `<button id="pl-share" class="info-action" type="button">Share</button>`.
   - At the top of `.pl-queue` (before its `.pl-head`), add a notice for incoming shared playlists:
     `<div id="pl-incoming" class="pl-incoming" hidden><p id="pl-incoming-text"></p><div class="pl-actions"><button id="pl-incoming-replace" class="info-action" type="button">Replace my playlist</button><button id="pl-incoming-add" class="info-action" type="button">Add to mine</button><button id="pl-incoming-dismiss" class="info-action" type="button">Dismiss</button></div></div>`.
4. `src/ui/ui.ts` (inside `startUi`):
   - Grab the new elements with `required<...>()` like the others.
   - Add `let pendingStyle: StyleId | null = null;` and `let pendingSeek: number | null = null;`.
     In `ensureEngine`, right after `created.load(entry.song)`: if `pendingStyle` is set, call
     `created.setStyle(pendingStyle)`; if `pendingSeek` is set, call `created.seek(pendingSeek)`
     (seek clamps to the duration); then clear both. The existing lines after it already read
     `created.style`, so the readout and bands follow.
   - In `loadSong`, in the `!engine` branch, clear `pendingStyle` and `pendingSeek` (tuning away by
     hand drops a shared link's settings). `selectBand` already creates the engine, so it needs no
     change.
   - `shareUrl(hash: string): string` → `location.origin + location.pathname + hash`.
   - `async function shareLink(url: string, title: string, button: HTMLButtonElement): Promise<void>`:
     if `navigator.share` exists, `await navigator.share({ title, url })` (catch and ignore errors,
     including the user cancelling). Else try `await navigator.clipboard.writeText(url)`, then set
     the button text to `Link copied` and restore its old text after 2000 ms. If the clipboard call
     throws or is missing, `window.prompt('Copy this link', url)`.
   - Current style for sharing: `engine?.style ?? pendingStyle ?? songStyle()`.
   - `#card-share` click → share `songHash(LIBRARY[current].id, style, null)` with the song title.
   - `#card-share-at`: in `openSongCard`, if `engine` exists and `engine.position >= 5`, show it with
     text `Share from ${formatShareTime(engine.position)}` and remember that position; otherwise hide
     it. Click → share `songHash(id, style, rememberedPosition)`.
   - `#pl-share` click → share `playlistHash(playlist)` with title `Drumline Radio playlist`.
     Disable it when the playlist is empty (set `disabled` wherever `renderPlaylist` updates the
     count).
   - `applyShareLink(link: ShareLink)`:
     - Song: `playlistAt = null`; if the song's library index is not in `visible()`, call
       `selectCategory('all')`; `selectView('radio')`. If `engine` exists: `loadSong(index)`, then if
       `link.style` call `selectBand(STYLES.indexOf(link.style))`, then if `link.t !== null` call
       `engine.seek(link.t)`. If no engine: `loadSong(index)`, then set `pendingStyle = link.style`
       and `pendingSeek = link.t` (after `loadSong`, since it clears them). When `pendingStyle` is set,
       also `updateBands(pendingStyle)`, `root.dataset.style = pendingStyle`, and set the subtitle to
       `Press play · ${STYLE_DEFS[pendingStyle].name}`. Do not call `play()`. Finish with
       `updatePlayButton()`.
     - List: `selectView('playlist')`; store the entries in `let incoming: PlaylistEntry[] = []`;
       show `#pl-incoming` with text `Shared playlist: N songs`. Replace → `setPlaylist(incoming)`;
       Add → append each with `addEntry` then `setPlaylist`; Dismiss → nothing. All three hide the
       notice and clear `incoming`. Never touch the saved playlist without one of these clicks.
   - `consumeHash()`: `const link = parseShareHash(location.hash, LIBRARY.map((e) => e.id))`; if
     `location.hash` is non-empty, remove it with
     `history.replaceState(null, '', location.pathname + location.search)` (wrap in `try`/`catch`);
     if `link`, `applyShareLink(link)`.
   - Call `consumeHash()` once at the very end of `startUi` (after the existing first-station setup,
     before or after `requestAnimationFrame(frame)` — after the setup lines), and add
     `window.addEventListener('hashchange', consumeHash)`.
5. `src/ui/style.css`: style `.card-share` as a row with a small gap (reuse existing `.info-row`
   spacing values), and `.pl-incoming` as a bordered box with padding and margin-bottom, using the
   existing CSS custom properties the playlist view already uses for borders and text. Keep the
   phone layout working (buttons wrap).
6. `README.md`: add a feature bullet after the Playlist bullet: share links. "Share song" in the song
   card (tap the title) shares the song in the style you are hearing, and "Share from m:ss" adds the
   current time; the playlist view's Share button shares the whole list. Opening a link tunes the
   app, ready to play; a shared playlist asks before replacing or adding to yours. Uses the share
   sheet where the browser has one, otherwise copies the link.
7. `docs/how-it-works.md`: in the `src/ui/` list, add that `share.ts` builds and reads share links
   (`#song=…&style=…&t=…` and `#list=…`), kept pure so it can be tested.

## Acceptance

- `npm run test:sandbox` exits 0, and its output includes `tests/share.test.ts`.
- `npm run typecheck` exits 0.
- `git status --porcelain` lists only the files in **Files to touch** (plus `.handoff/`).

Verifier only:

- `npm test` exits 0.
- `npm run build` exits 0.
- Headless Edge, `vite preview`: opening `/#song=third-rail&style=techno&t=1:20` shows Third Rail on
  the dial, Techno band checked, the hash removed from the URL, not playing; pressing ▶ plays in
  Techno from about 1:20. Opening `/#list=third-rail~lofi,last-stop~techno` shows the playlist view
  with the incoming notice and leaves the saved playlist unchanged until a button is pressed.

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch** except `.handoff/report.md`.
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and report
  it; do not request wider sandbox access, set `NODE_OPTIONS`, or stub modules to get past it.
- `src/ui/share.ts` stays free of the DOM and audio (AGENTS.md rule for testable modules).
- Wrap any new `localStorage` use in `try`/`catch` (none is expected).
- Do not change any `.song` file, the service worker, the manifest, or `vite.config.ts`.
- Never call `engine.play()` from link handling.

## Out of scope

- Autoplay, named playlists, shuffle, URL shorteners, QR codes.
- Manifest link capture (`handle_links`, `launch_handler`) and `launchQueue`.
- Sharing hidden songs (their ids are not in `LIBRARY`, so links to them are ignored).
- Keeping the URL hash updated while the user tunes around.

## If blocked

Stop and write `.handoff/report.md` with the failing step, the exact command and output, and what
you would need to continue. Do not improvise a different link format or UI placement.
