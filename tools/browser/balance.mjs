// Balance: renders a whole song offline through the real engine and prints each track's level in
// every section, so a buried or overpowering part shows up without seeking or timing. One command:
// it starts its own Vite server on a free port, renders in headless Edge, and stops both when done.
// For each track and section it prints RMS / peak in dB, plus the level below 150 Hz for the bass and
// drums, then flags common problems: a pad or chords part more than 10 dB under the lead, a bass
// louder than the lead, and a bass whose low end is louder than the kick's.
//   npm run balance -- <song name or path> [style] [bars per section, default 8]
//   npm run balance -- wayfarers-rest
//   npm run balance -- src/songs/riverfront.song lofi 16
import { readFileSync, existsSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { createServer } from 'vite';
import { openEdge } from './cdp.mjs';

const [arg, style = '', perArg = '8'] = process.argv.slice(2);
if (!arg) {
  console.log('usage: npm run balance -- <song name or path> [style] [bars per section]');
  process.exit(1);
}
const path = existsSync(arg) ? arg : `src/songs/${basename(arg).replace(/\.song$/, '')}.song`;
if (!existsSync(path)) {
  console.error(`no song at ${path}`);
  process.exit(1);
}
const text = readFileSync(path, 'utf8');
const perSection = Math.max(1, Number(perArg) || 8);

const server = await createServer({
  root: resolve(import.meta.dirname, '../..'),
  logLevel: 'error',
  server: { port: 0, strictPort: false },
});
let page;
try {
  await server.listen();
  const url = server.resolvedUrls.local[0];
  page = await openEdge();
  await page.goto(url, 2500);
  const base = new URL(url).pathname;
  const result = await page.ev(`(async () => {
    try {
      const { parseSong } = await import(${JSON.stringify(base + 'src/music/song.ts')});
      const { tickToSeconds, buildTimeline } = await import(${JSON.stringify(base + 'src/music/timing.ts')});
      const { Engine } = await import(${JSON.stringify(base + 'src/audio/engine.ts')});
      const parsed = parseSong(${JSON.stringify(text)});
      if (!parsed.ok) return { error: parsed.errors.slice(0, 5).join('\\n') };
      const song = parsed.song;
      const style = ${JSON.stringify(style)} || song.meta.style;
      const tracks = song.tracks;
      const rate = 22050;
      const duration = buildTimeline(song).duration + 2;
      // Channels 0-1 take the engine's master mix; each track's channel is tapped onto its own
      // channel after them, summed to mono, and the bass and drums tracks also through a 150 Hz
      // low-pass onto one more channel each, for the low band.
      const lowTracks = tracks.flatMap((t, i) => (t.role === 'bass' || t.role === 'drums' ? [i] : []));
      const channels = tracks.length + 2 + lowTracks.length;
      const ctx = new OfflineAudioContext(channels, Math.ceil(duration * rate), rate);
      ctx.destination.channelInterpretation = 'discrete';
      const panners = [];
      const original = BaseAudioContext.prototype.createStereoPanner;
      BaseAudioContext.prototype.createStereoPanner = function () { const p = original.call(this); panners.push(p); return p; };
      const engine = new Engine(ctx);
      engine.load(song);
      engine.setStyle(style);
      BaseAudioContext.prototype.createStereoPanner = original;
      const taps = panners.slice(-tracks.length);
      const merger = ctx.createChannelMerger(channels);
      taps.forEach((p, i) => p.connect(merger, 0, i + 2));
      const lowChannel = new Map();
      lowTracks.forEach((i, k) => {
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass'; filter.frequency.value = 150; filter.Q.value = 0.7;
        taps[i].connect(filter);
        filter.connect(merger, 0, tracks.length + 2 + k);
        lowChannel.set(i, tracks.length + 2 + k);
      });
      merger.connect(ctx.destination);
      engine.bookOffline(ctx);
      const buffer = await ctx.startRendering();

      const db = (v) => (v > 1e-7 ? 20 * Math.log10(v) : -120);
      const sections = [];
      for (let i = 0; i < song.bars.length; i += ${perSection}) {
        const first = song.bars[i], last = song.bars[Math.min(i + ${perSection}, song.bars.length) - 1];
        sections.push({ from: first.number, to: last.number,
          start: tickToSeconds(song, first.startTick), end: tickToSeconds(song, last.startTick + last.ticks) });
      }
      const levels = tracks.map((t, i) => {
        const data = buffer.getChannelData(i + 2);
        const low = lowChannel.has(i) ? buffer.getChannelData(lowChannel.get(i)) : null;
        return sections.map((s) => {
          const a = Math.floor(s.start * rate), b = Math.min(data.length, Math.floor(s.end * rate));
          let sq = 0, pk = 0, lsq = 0;
          for (let n = a; n < b; n += 1) { const v = data[n]; sq += v * v; if (Math.abs(v) > pk) pk = Math.abs(v); if (low) lsq += low[n] * low[n]; }
          const len = Math.max(1, b - a);
          return { rms: db(Math.sqrt(sq / len)), peak: db(pk), low: low ? db(Math.sqrt(lsq / len)) : null };
        });
      });
      return { style, tracks: tracks.map((t) => ({ id: t.id, role: t.role })), sections, levels };
    } catch (e) { return { error: String(e && e.stack || e) }; }
  })()`);

  if (!result || result.error) {
    console.error('balance failed:', result ? result.error : 'no result');
    process.exitCode = 1;
  } else {
    const { tracks, sections, levels } = result;
    const SILENT = -70;
    const fmt = (v) => (v <= SILENT ? '   —' : String(Math.round(v)).padStart(4));
    const time = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    console.log(`${basename(path)} in ${result.style}: RMS / peak dB per section${tracks.some((t) => t.role === 'bass' || t.role === 'drums') ? ', low = below 150 Hz' : ''}\n`);
    const cols = tracks.map((t) => (t.role === 'bass' || t.role === 'drums' ? `${t.id} (low)` : t.id));
    const widths = tracks.map((t, i) => Math.max(cols[i].length, t.role === 'bass' || t.role === 'drums' ? 15 : 9) + 2);
    console.log('bars       time  ' + cols.map((c, i) => c.padStart(widths[i])).join(''));
    const flags = [];
    sections.forEach((s, j) => {
      const cells = tracks.map((t, i) => {
        const l = levels[i][j];
        if (l.rms <= SILENT) return '—'.padStart(widths[i]);
        const main = `${fmt(l.rms).trim()}/${fmt(l.peak).trim()}`;
        return (l.low !== null ? `${main} (${fmt(l.low).trim()})` : main).padStart(widths[i]);
      });
      console.log(`${String(s.from).padStart(3)}-${String(s.to).padEnd(4)} ${time(s.start).padStart(6)}  ${cells.join('')}`);

      // A part counts as playing in a section only when it is clearly there, not a stray tail.
      const PLAYING = -55;
      const at = (role) => tracks.map((t, i) => ({ t, l: levels[i][j] })).filter((x) => x.t.role === role && x.l.rms > PLAYING);
      const lead = at('lead').sort((a, b) => b.l.rms - a.l.rms)[0];
      const where = `bars ${s.from}-${s.to}`;
      if (lead) {
        for (const x of [...at('pad'), ...at('chords')]) {
          if (lead.l.rms - x.l.rms > 10) flags.push(`${where}: ${x.t.id} (${x.t.role}) is ${Math.round(lead.l.rms - x.l.rms)} dB under ${lead.t.id}`);
        }
        for (const x of at('bass')) {
          if (x.l.rms > lead.l.rms) flags.push(`${where}: ${x.t.id} (bass) is ${Math.round(x.l.rms - lead.l.rms)} dB over ${lead.t.id}`);
        }
      }
      // Only a kit with a real low end (a kick) is compared with the bass.
      const drums = at('drums').filter((x) => x.l.low > PLAYING).sort((a, b) => b.l.low - a.l.low)[0];
      for (const x of at('bass')) {
        if (drums && x.l.low > drums.l.low) flags.push(`${where}: ${x.t.id} low end is ${Math.round(x.l.low - drums.l.low)} dB over ${drums.t.id}'s (the kick)`);
      }
    });
    console.log(flags.length ? `\nFlags:\n  ${flags.join('\n  ')}` : '\nNo flags.');
    console.log('\nFor a sparse part (stabs, hits), compare peaks: RMS reads low when most of a section is silent.');
  }
} finally {
  page?.close();
  await server.close();
}
