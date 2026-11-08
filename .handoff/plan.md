## Goal

Add "Save as WAV" to the song card: it renders the current song, in the style being heard, offline
with the same voices and mix as live play, and downloads it as a 16-bit stereo WAV file.

## Files to touch

- `src/audio/wav.ts` (new)
- `src/audio/engine.ts`
- `src/audio/voices.ts`
- `src/ui/song-card.ts`
- `index.html`
- `tests/wav.test.ts` (new)
- `README.md`
- `docs/sound.md`
- `AGENTS.md`

## Steps

1. Create `src/audio/wav.ts`, free of the DOM and Web Audio (pure, like `curves.ts`):

   ```ts
   /** A 16-bit PCM WAV file from one Float32Array per channel (all the same length). */
   export function encodeWav(channels: Float32Array[], sampleRate: number): ArrayBuffer
   ```

   - 44-byte RIFF header, little-endian: `RIFF`, file size − 8, `WAVE`, `fmt `, 16, format 1,
     channel count, sample rate, byte rate (`sampleRate * channels * 2`), block align
     (`channels * 2`), 16 bits, `data`, data size (`frames * channels * 2`).
   - Interleave the channels frame by frame. Clamp each sample to [-1, 1]; write
     `Math.round(s < 0 ? s * 32768 : s * 32767)` as a signed 16-bit integer.
   - Throw an `Error` if `channels` is empty or the channels differ in length.

2. In `src/audio/voices.ts`, change `VoiceKit.ctx` and `createVoiceKit`'s parameter from
   `AudioContext` to `BaseAudioContext`. Change nothing else.

3. In `src/audio/engine.ts`:
   - Change the `ctx` field and the constructor parameter from `AudioContext` to
     `BaseAudioContext`. In `play()`, where it calls `this.ctx.resume()`, cast:
     `(this.ctx as AudioContext).resume()` (play is only used with a live context).
   - Add a private method `bookOffline(ctx: OfflineAudioContext, onProgress?: (fraction: number) => void): void`
     that books the loaded song for an offline render:
     - Set `this.startPos = 0`, `this.startCtx = 0`. Do not set `playingValue` or start the timer.
     - Start a looping `AudioBufferSourceNode` with `this.crackleBuffer`, connected straight to
       `this.crackleGain`, at time 0, stopped at `ctx.length / ctx.sampleRate`.
     - Book notes in consecutive windows of `RENDER_CHUNK = 2` seconds with
       `notesBetween(timeline, from, to)` and `this.scheduleNote(note)`: book `[0, 2)` and
       `[2, 4)` right away; then, for each `k = 0, 1, 2, ...` while `(k + 2) * 2 < duration`,
       call `ctx.suspend(k * 2).then(() => { book [(k + 2) * 2, (k + 3) * 2); onProgress?.((k * 2) / duration); return ctx.resume(); })`.
       So every note is booked at least 2 s before it starts.
     - If `typeof ctx.suspend !== 'function'`, book every note at once instead.
   - Export a function after the class:

     ```ts
     /** Extra time rendered after the song, so reverb and delay tails finish. */
     const RENDER_TAIL = 3;
     const RENDER_RATE = 44100;
     const RENDER_CHUNK = 2;

     /** Renders a whole song in a style, offline, with the same voices and mix as live play. */
     export async function renderSong(song: Song, style: StyleId, onProgress?: (fraction: number) => void): Promise<AudioBuffer>
     ```

     It builds `new OfflineAudioContext(2, Math.ceil((buildTimeline(song).duration + RENDER_TAIL) * RENDER_RATE), RENDER_RATE)`,
     creates `new Engine(ctx)`, calls `load(song)` and `setStyle(style)`, then the new
     `bookOffline(ctx, onProgress)` (call it from inside the module; make it non-private only if
     TypeScript requires, and then mark it `/** @internal */`), awaits `ctx.startRendering()`,
     calls `onProgress?.(1)`, and returns the buffer. The volume slider does not apply (the
     engine's volume stays at 1).

4. In `index.html`, in the song card's `card-link info-row` div, after the `#card-link-at`
   button, add `<button id="card-save" class="info-action" type="button">Save as WAV</button>`.
   Don't use the word "share" in its id or class.

5. In `src/ui/song-card.ts`:
   - Import `renderSong` from `../audio/engine` and `encodeWav` from `../audio/wav`.
   - Get `#card-save` with `required<HTMLButtonElement>`.
   - On click: if it is already rendering, do nothing. Otherwise take `deps.entry()` and
     `deps.style()`; set `disabled = true` and text `Rendering 0%`; call `renderSong(entry.song, style, (f) => { text = `Rendering ${Math.round(f * 100)}%` })`;
     then `encodeWav([buffer.getChannelData(0), buffer.getChannelData(1)], buffer.sampleRate)`,
     wrap it in `new Blob([...], { type: 'audio/wav' })`, create an object URL, and click a
     temporary `<a>` with `download` set to `${title} (${STYLE_DEFS[style].name}).wav`, with
     the characters `\/:*?"<>|` removed from the title. Revoke the URL 10 s later. Restore the
     text to `Save as WAV` and `disabled = false`.
   - On error: `console.error` it, show `Couldn't save` for 3 s, then restore the button.
   - Rendering continues if the card is closed.

6. Create `tests/wav.test.ts` (Vitest, importing only `../src/audio/wav`):
   - Two channels of 3 frames, `[0, 1, -1]` and `[0.5, 2, -2]`, at 44100: the result is
     44 + 12 bytes; the ASCII at offsets 0, 8, 12, 36 is `RIFF`, `WAVE`, `fmt `, `data`;
     uint32 at 4 is 48, at 24 is 44100, at 28 is 176400, at 40 is 12; uint16 at 20 is 1, at
     22 is 2, at 32 is 4, at 34 is 16; the int16 samples from offset 44 are
     `[0, 16384, 32767, 32767, -32768, -32768]`.
   - It throws for no channels and for channels of different lengths.

7. Docs:
   - `README.md`: in the feature bullet about the song card / share links, add that the song card
     also has "Save as WAV", which renders the song in the style you are hearing and downloads
     it (about 10 MB a minute; a few seconds to render on a phone).
   - `docs/sound.md`: add a section "## Saving a song" before "## Adding a patch or a style":
     `renderSong` in `engine.ts` renders a song offline with an `OfflineAudioContext` at 44.1 kHz
     stereo, through the same engine, voices, and master chain as live play, plus a 3 s tail for
     reverb and delay; it books notes 2 s ahead in steps while rendering, so a long song never
     holds every voice at once; `src/audio/wav.ts` encodes the result as 16-bit PCM WAV.
   - `AGENTS.md`: in the rule listing files free of the DOM and audio, add `src/audio/wav.ts`
     after `src/audio/strings.ts`.

## Acceptance

- `npm run test:sandbox` exits 0, and its output includes `tests/wav.test.ts` passing.
- `git diff --stat` and `git status --porcelain` list only files from **Files to touch**.
- `git grep -n "share" -- index.html | grep card-save` prints nothing.

Verifier only:
- `npm test` exits 0.
- `npm run typecheck` exits 0.
- `npm run build` exits 0.

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch** except `.handoff/report.md`.
- Do not change songs, styles, instruments, or any live-playback behaviour (scheduling, look-ahead,
  stop, seek, style switching).
- Keep `src/audio/wav.ts` free of DOM and Web Audio types.
- Files use LF line endings, UTF-8, and 2-space indents.
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and
  report it. Do not request wider sandbox access, set `NODE_OPTIONS`, or stub modules to get past
  it.

## Out of scope

- MP3 or other compressed formats, saving a whole playlist, background playback, browser checks.

## If blocked

Stop, write `.handoff/report.md` with what was done, the exact failing command and its output,
and what decision is needed.
