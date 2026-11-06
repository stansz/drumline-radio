// @ts-ignore -- @types/node is not a dependency here, and tsconfig/package.json are outside this change.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
// @ts-ignore -- same reason as above.
import { join, relative, sep } from 'node:path';
// @ts-ignore -- same reason as above.
import { execSync } from 'node:child_process';
import { defineConfig, type Plugin } from 'vite';
import { cacheVersion, precacheList } from './src/pwa/precache.ts';

// Node's process, declared here because @types/node is not a dependency.
declare const process: { env: Record<string, string | undefined> };

// GitHub Pages serves the site under /drumline-radio/. Cloudflare Pages (which sets CF_PAGES) and
// other hosts at a domain root use /. BASE_PATH overrides both.
const base = process.env.BASE_PATH ?? (process.env.CF_PAGES ? '/' : '/drumline-radio/');

// The build stamp shown in the info panel: the commit Cloudflare or GitHub built, or the local one.
function commitId(): string {
  const fromHost = process.env.CF_PAGES_COMMIT_SHA ?? process.env.GITHUB_SHA;
  if (fromHost) return fromHost.slice(0, 7);
  try {
    return String(execSync('git rev-parse --short=7 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })).trim();
  } catch {
    return 'dev';
  }
}

function filesUnder(dir: string, base: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(
    (entry: { name: string; isDirectory(): boolean }) => {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) return filesUnder(full, base);
      return [relative(base, full).split(sep).join('/')];
    },
  );
}

// The service worker can't be hashed like other assets, so the build writes its precache list
// and cache version into the template before emitting it.
function serviceWorker(): Plugin {
  let root = '';

  return {
    name: 'drumline-radio-sw',
    apply: 'build',
    configResolved(config) {
      root = config.root;
    },
    generateBundle(_options, bundle) {
      const template = readFileSync(join(root, 'src/pwa/sw.js'), 'utf8');
      const publicDir = join(root, 'public');
      const publicFiles = existsSync(publicDir) ? filesUnder(publicDir, publicDir) : [];
      // Vite 8 has not added index.html to the bundle at this point.
      const list = precacheList([...Object.keys(bundle), 'index.html'], publicFiles);
      // Hash the template and public file contents too, so a change to either gives a new cache.
      const contents = publicFiles.map((file) => readFileSync(join(publicDir, file)).toString('base64'));
      const version = cacheVersion([...list, template, ...contents]);
      const source = template
        .replace('__PRECACHE__', () => JSON.stringify(list))
        .replace('__VERSION__', () => JSON.stringify(version));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

export default defineConfig({
  base,
  plugins: [serviceWorker()],
  define: {
    __BUILD_COMMIT__: JSON.stringify(commitId()),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
});
