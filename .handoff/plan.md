## Goal

Remove two sources of noise: line-ending churn (every commit warns "LF will be replaced by CRLF")
and the `@ts-ignore` / hand-declared `process` workarounds that exist only because `@types/node` is
not installed. Node types must reach the tests and `vite.config.ts` only, never `src/`. No change to
app behavior, song files, or formatting of existing code.

## Files to touch

- `.gitattributes` (new)
- `.editorconfig` (new)
- `tsconfig.json`
- `tsconfig.node.json` (new)
- `package.json`
- `package-lock.json` (changed by `npm install` only)
- `tests/drift.test.ts`
- `vite.config.ts`
- `AGENTS.md`

## Steps

1. Create `.gitattributes` with exactly:

   ```
   * text=auto eol=lf
   *.png binary
   *.ico binary
   *.jpg binary
   *.woff2 binary
   *.mid binary
   *.midi binary
   *.pdf binary
   ```

2. Create `.editorconfig` with exactly:

   ```
   root = true

   [*]
   charset = utf-8
   end_of_line = lf
   insert_final_newline = true
   indent_style = space
   indent_size = 2
   trim_trailing_whitespace = true

   [*.md]
   trim_trailing_whitespace = false
   ```

3. Run `npm install --save-dev --save-exact @types/node@24.19.2`. It must add
   `"@types/node": "24.19.2"` to `devDependencies` in `package.json` and update
   `package-lock.json`. If the install fails (network or sandbox), stop and report; do not hand-edit
   the lock file.

4. Replace `tsconfig.json` with (the app: `src/` only, no Node types):

   ```json
   {
     "compilerOptions": {
       "target": "ES2022",
       "module": "ESNext",
       "moduleResolution": "bundler",
       "strict": true,
       "noEmit": true,
       "allowImportingTsExtensions": true,
       "lib": ["ES2022", "DOM"],
       "types": ["vite/client"],
       "skipLibCheck": true
     },
     "include": ["src"]
   }
   ```

5. Create `tsconfig.node.json` (the tests and the Vite config, with Node types):

   ```json
   {
     "extends": "./tsconfig.json",
     "compilerOptions": {
       "types": ["vite/client", "node"]
     },
     "include": ["tests", "vite.config.ts"]
   }
   ```

6. In `package.json` `scripts`, set:
   - `"typecheck": "tsc --noEmit && tsc --noEmit -p tsconfig.node.json"`
   - `"build": "npm run typecheck && vite build"`

   Leave every other script unchanged.

7. In `tests/drift.test.ts`:
   - Delete the five `// @ts-ignore ...` comment lines above the `node:` imports. Keep the imports.
   - Delete the `// Node's process, declared here because @types/node is not a dependency.`
     comment and the `declare const process: { execPath: string };` line after it.

8. In `vite.config.ts`:
   - Delete the three `// @ts-ignore ...` comment lines above the `node:` imports. Keep the
     imports.
   - Delete the `// Node's process, declared here because @types/node is not a dependency.`
     comment and the `declare const process: ...;` line after it.

9. In `AGENTS.md`, `## Rules`, add this bullet after the bullet that starts
   "Keep everything in `src/music/`":

   ```
   - `tsconfig.json` type-checks `src/` with browser types only; `tsconfig.node.json` adds Node
     types for `tests/` and `vite.config.ts`. Don't add Node types to `src/`. `npm run typecheck`
     runs both.
   ```

   And add this bullet at the end of `## Rules`:

   ```
   - Files use LF line endings, UTF-8, and 2-space indents (`.gitattributes`, `.editorconfig`).
   ```

## Acceptance

- `npm run typecheck` exits 0.
- `grep -c "ts-ignore" tests/drift.test.ts vite.config.ts` prints `tests/drift.test.ts:0` and
  `vite.config.ts:0`.
- `grep -n "declare const process" tests/drift.test.ts vite.config.ts` prints nothing.
- `node -p "require('./package.json').devDependencies['@types/node']"` prints `24.19.2`.
- `git check-attr eol -- src/ui/ui.ts` prints `src/ui/ui.ts: eol: lf`.
- `git check-attr binary -- public/icons/icon-192.png` prints
  `public/icons/icon-192.png: binary: set`.
- `git diff --stat -- src` prints nothing.

Verifier only:
- `npm test` exits 0.
- `npm run build` exits 0.
- `git add --renormalize . && git status --porcelain` shows no files changed outside
  **Files to touch** (line-ending renormalization).

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch** except `.handoff/report.md`.
- Do not reformat, re-indent, or change line endings of any existing file beyond the edits above.
- Do not add Biome, Prettier, ESLint, or any dependency other than `@types/node@24.19.2`.
- Do not run `git add`, `git add --renormalize`, or any other command that changes the index.
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and
  report it. Do not request wider sandbox access, set `NODE_OPTIONS`, or stub modules.

## Out of scope

- A formatter or linter.
- Type-checking `tools/` (its `.ts` checks keep running through their own Vitest configs).
- Splitting `src/music/song.ts` or `src/ui/ui.ts`.

## If blocked

If `npm install` cannot reach the registry, stop after steps 1 and 2 and report. If
`tsc --noEmit -p tsconfig.node.json` fails with errors in `src/` caused by Node types (for example a
timer type), report the exact errors instead of changing `src/`.
