## Goal

Split `src/audio/styles.ts` into a shared instrument bank and style recipes, so instruments and
styles can be added independently. Every instrument is defined once in the bank under a unique id.
Each style lists the bank instruments it uses under its own local names, plus its role map, fx and
lanes. `STYLE_DEFS` keeps exactly its current runtime shape and values (`patches` is still
`Record<string, Patch>` keyed by the style's local names), so nothing sounds different and no
consumer of `STYLE_DEFS` changes. Add one opt-in: a track header `inst=bank:<id>` picks any bank
instrument, whatever the style.

## Files to touch

- `src/audio/patches.ts` (new)
- `src/audio/instruments.ts` (new)
- `src/audio/styles.ts`
- `src/music/song.ts`
- `tests/styles.test.ts`
- `tests/instruments.test.ts` (new)
- `tests/song.test.ts`
- `docs/sound.md`
- `docs/song-format.md`
- `docs/how-it-works.md`
- `AGENTS.md`

## Steps

1. Create `src/audio/patches.ts`. Move into it, unchanged, from `src/audio/styles.ts`: the types
   `Wave`, `Osc`, `SynthPatch`, `DrumKit`, `Patch`, the constant `DEFAULT_SENDS`, the helper types
   `SynthInput` and `DrumInput`, and the functions `osc`, `env`, `synth`, `drums`. Export all four
   functions and all five public types (`Wave`, `Osc`, `SynthPatch`, `DrumKit`, `Patch`). It
   imports nothing.

2. Create `src/audio/instruments.ts`. It imports `osc`, `env`, `synth`, `drums` and `type Patch`
   from `./patches`. Move every patch definition out of the six `patches` blocks in `styles.ts`
   into five exported family objects, each typed `Record<string, Patch>`. Copy each `synth({...})`
   / `drums({...})` call character for character (same `name`, numbers, and `sends`), and move the
   comments above `radio-lead` and `upright-bass` with them. Bank ids are the current patch keys,
   except the three keys used by two styles with different definitions:
   - chiptune's `square-lead` becomes bank id `chip-square` (synthwave's stays `square-lead`);
   - techno's `sub-bass` becomes bank id `techno-sub` (synthwave's stays `sub-bass`);
   - cinematic's `strings` becomes bank id `string-section` (orchestral's stays `strings`).

   Families, in this order and with these ids:
   - `LEADS`: `saw-lead`, `square-lead`, `pulse-lead`, `chip-square`, `brass`, `woodwind`, `acid`,
     `soft-lead`, `soft-flute`, `radio-lead`, `dusty-sample`, `guitar`
   - `KEYS`: `poly-stab`, `pluck`, `pulse-chords`, `pulse-arp`, `harp`, `bells`, `square-stab`,
     `fm-pluck`, `stab`, `acid-arp`, `tine-keys`, `muted-pluck`, `grand-piano`, `analog-synth`
   - `PADS`: `warm-pad`, `square-pad`, `strings`, `string-pad`, `dark-pad`, `tape-pad`,
     `string-section`, `cello`, `synth-pad`
   - `BASSES`: `synth-bass`, `sub-bass`, `triangle-bass`, `low-strings`, `techno-sub`,
     `round-bass`, `upright-bass`, `warm-bass`
   - `KITS`: `gated-kit`, `chip-kit`, `orchestra-kit`, `909-kit`, `dusty-kit`, `studio-kit`

   Then export:
   ```ts
   export const FAMILIES = { leads: LEADS, keys: KEYS, pads: PADS, basses: BASSES, kits: KITS };

   function merge(families: Record<string, Record<string, Patch>>): Record<string, Patch> {
     const all: Record<string, Patch> = {};
     for (const family of Object.values(families)) {
       for (const [id, patch] of Object.entries(family)) {
         if (id in all) throw new Error(`instrument '${id}' is defined twice`);
         all[id] = patch;
       }
     }
     return all;
   }

   /** Every instrument, by bank id. Styles pick from this; `inst=bank:<id>` reaches it directly. */
   export const INSTRUMENTS: Record<string, Patch> = merge(FAMILIES);
   ```
   Put a two-line comment at the top of the file: the bank holds every instrument once under a
   unique id, grouped by family; a style picks instruments from it in `styles.ts`.

3. Rewrite `src/audio/styles.ts`:
   - Imports: `type { Role, StyleId }` from `../music/roles`, `type { Track }` from
     `../music/song`, `type { Patch }` from `./patches`, `{ INSTRUMENTS }` from `./instruments`.
   - Re-export the types so existing imports keep working:
     `export type { Wave, Osc, SynthPatch, DrumKit, Patch } from './patches';`
   - Keep `interface StyleDef` exactly as it is.
   - Add:
     ```ts
     /** A style as written: its instruments as local name -> bank id, everything else as in StyleDef. */
     interface StyleRecipe extends Omit<StyleDef, 'patches'> {
       instruments: Record<string, string>;
     }

     function buildStyle(recipe: StyleRecipe): StyleDef {
       const { instruments, ...rest } = recipe;
       const patches: Record<string, Patch> = {};
       for (const [local, id] of Object.entries(instruments)) {
         const patch = INSTRUMENTS[id];
         if (!patch) throw new Error(`style '${recipe.id}' uses unknown instrument '${id}'`);
         patches[local] = patch;
       }
       return { ...rest, patches };
     }
     ```
   - Replace each style's `patches: {...}` block with `instruments: {...}`, mapping every local key
     the style has today, in the same order, to its bank id. Local name and bank id are equal
     except: chiptune `'square-lead': 'chip-square'`, techno `'sub-bass': 'techno-sub'`, cinematic
     `strings: 'string-section'`. Keep `id`, `name`, `blurb`, `roles`, `fx`, `lanes` unchanged.
   - Define the six recipes as `const RECIPES: StyleRecipe[] = [ ... ]` in the current order
     (synthwave, chiptune, orchestral, techno, lofi, cinematic), then:
     ```ts
     export const STYLE_DEFS = Object.fromEntries(RECIPES.map((r) => [r.id, buildStyle(r)])) as Record<StyleId, StyleDef>;
     ```
   - Add `export const BANK_PREFIX = 'bank:';` and replace `patchKey` and `resolvePatch` with:
     ```ts
     /** The bank id when a track names `inst=bank:<id>` and the bank has it, else null. */
     export function bankId(inst: string | null): string | null {
       if (inst === null || !inst.startsWith(BANK_PREFIX)) return null;
       const id = inst.slice(BANK_PREFIX.length);
       return Object.prototype.hasOwnProperty.call(INSTRUMENTS, id) ? id : null;
     }

     export function patchKey(style: StyleDef, track: Pick<Track, 'role' | 'inst'>): string {
       if (bankId(track.inst) !== null) return track.inst as string;
       if (track.inst !== null && Object.prototype.hasOwnProperty.call(style.patches, track.inst)) {
         return track.inst;
       }
       return style.roles[track.role];
     }

     export function resolvePatch(style: StyleDef, track: Pick<Track, 'role' | 'inst'>): Patch {
       const id = bankId(track.inst);
       if (id !== null) return INSTRUMENTS[id];
       return style.patches[patchKey(style, track)];
     }
     ```

4. In `src/music/song.ts`, in the `key === 'inst'` branch, change the regex from
   `/^[a-z0-9-]+$/` to `/^(bank:)?[a-z0-9-]+$/`. Change nothing else in the file.

5. In `tests/styles.test.ts`, add to the existing `describe('styles')`:
   - `it('builds every style patch from the bank')`: for every style and every
     `[local, patch]` of `STYLE_DEFS[id].patches`, `Object.values(INSTRUMENTS)` contains `patch`
     (same object, `toContain`).
   - `it('resolves inst=bank:<id> in any style')`:
     `resolvePatch(STYLE_DEFS.techno, { role: 'lead', inst: 'bank:radio-lead' }).name` is
     `'Radio lead'`; `resolvePatch(STYLE_DEFS.chiptune, { role: 'lead', inst: 'bank:square-lead' }).name`
     is `'Square lead'`; `resolvePatch(STYLE_DEFS.techno, { role: 'lead', inst: 'bank:nope' }).name`
     is `'Acid'`; `resolvePatch(STYLE_DEFS.techno, { role: 'lead', inst: 'radio-lead' }).name` is
     `'Acid'`.
   - `it('keeps local names that differ from bank ids')`:
     `STYLE_DEFS.chiptune.patches['square-lead'].name` is `'Square'`,
     `STYLE_DEFS.techno.patches['sub-bass']` is `INSTRUMENTS['techno-sub']`,
     `STYLE_DEFS.cinematic.patches.strings.name` is `'String section'`.

6. Create `tests/instruments.test.ts`:
   - every family's ids are unique across families, and `Object.keys(INSTRUMENTS).length` equals
     the sum of the family sizes (49);
   - every patch in `KITS` has `kind` `'drums'`; every patch in the other families has `kind`
     `'synth'`;
   - every bank id matches `/^[a-z0-9-]+$/`.

7. In `tests/song.test.ts`, add one test: a song whose track header has `inst=bank:radio-lead`
   parses with no errors and the track's `inst` is `'bank:radio-lead'`; and `inst=bank:` (empty id)
   or `inst=Bank:x` gives an `invalid inst` error. Follow the file's existing helpers for building a
   minimal song.

8. Docs:
   - `docs/sound.md`, `## Patches and styles`: replace the sentence "`src/audio/styles.ts` holds the
     six styles as data." with: "`src/audio/instruments.ts` is the instrument bank: every patch,
     once, under a unique id, grouped into leads, keys, pads, basses, and kits. `src/audio/styles.ts`
     holds the six styles as recipes: each picks the bank instruments it uses, under its own local
     names, and sets its role map and effects." Replace the pick-order list with three steps:
     1. `inst=bank:<id>` names a bank instrument: the track uses it in every style. 2. `inst=<name>`
     and the current style has an instrument with that local name: the track uses it. 3. Otherwise
     the patch for the track's `role`. After the list add: "A song that wants its own sound in every
     remix uses `inst=bank:`; plain `inst=` lets each style supply its own sound, which keeps styles
     distinct."
   - `docs/sound.md`, `## Adding a patch or a style`: first bullet becomes: add a synth patch with
     `synth({...})` or a drum kit with `drums({...})` to its family in `src/audio/instruments.ts`
     under a new unique id; a style uses it by adding `localName: 'bank-id'` to its `instruments`
     and pointing a role or `inst=` at the local name; any song can reach it with `inst=bank:<id>`.
     Second bullet: "Add a style by adding a `StyleRecipe` to `RECIPES` in `src/audio/styles.ts`
     (pick instruments from the bank), ..." keeping the rest of that bullet.
   - `docs/song-format.md` line 71: `inst` matches `^(bank:)?[a-z0-9-]+$`; a plain name picks the
     current style's instrument of that name, `bank:<id>` picks a bank instrument in every style
     (see sound.md). Line 247: change `^[a-z0-9-]+$` to say an id that does not match
     `^[a-z0-9-]+$` or an instrument that does not match `^(bank:)?[a-z0-9-]+$`.
   - `docs/how-it-works.md`: replace the `styles.ts` bullet with two bullets:
     "`instruments.ts` is the instrument bank: every patch once, by id, in families; `patches.ts`
     has the patch types and the `synth()`/`drums()` helpers." and "`styles.ts` holds the six
     styles as recipes. Each picks instruments from the bank and maps a **role** to one."
   - `AGENTS.md` rule starting "Keep everything in `src/music/`": change "plus
     `src/audio/styles.ts`," to "plus `src/audio/styles.ts`, `src/audio/instruments.ts`,
     `src/audio/patches.ts`,".

## Acceptance

- `git diff --stat -- src/songs tools src/audio/engine.ts src/audio/voices.ts src/ui` prints nothing.
- `grep -c "synth({" src/audio/styles.ts` prints `0`.
- `grep -c "synth({\|drums({" src/audio/instruments.ts` prints `49`.
- `grep -n "export function \(osc\|env\|synth\|drums\)" src/audio/patches.ts` prints 4 lines.
- `npm run typecheck` exits 0.

Verifier only:
- `npm test` exits 0.
- `npm run build` exits 0.
- `node C:/Users/sz/AppData/Local/Temp/claude/C--Users-sz-Documents-Code/ce1b9b2a-6e0c-43e9-8569-be25bf365806/scratchpad/style-diff.mjs .` prints `identical` (STYLE_DEFS deep-equals the snapshot
  taken before the change).

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch** except `.handoff/report.md`.
- Do not change any number, wave, name, or `sends` value of any patch. Do not change `fx`, `roles`,
  `lanes`, `name`, or `blurb` of any style.
- Do not change `src/audio/engine.ts`, `src/audio/voices.ts`, `src/ui/`, `tools/`, or any song.
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and
  report it. Do not request wider sandbox access, set `NODE_OPTIONS`, or stub modules.
- `npm run test:sandbox` may be run to check tests inside the sandbox.

## Out of scope

- New instruments or styles.
- A generated instrument list for the docs.
- Changing `tools/browser/timbre.mjs`.
- Using `inst=bank:` in any song.

## If blocked

If `npm run typecheck` reports errors in a file outside **Files to touch**, report the exact errors
instead of editing that file. If a patch cannot be placed in a family as listed, stop and report.
