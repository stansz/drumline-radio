import { STYLES } from '../music/roles';
import type { StyleId } from '../music/roles';
import { PLAYLIST_MAX } from './playlist';
import type { PlaylistEntry } from './playlist';

/**
 * A shared link: either one song tuned to a style and start time, or a playlist.
 * `style` and `t` are null when the link didn't ask for them.
 */
export type ShareLink =
  | { kind: 'song'; song: string; style: StyleId | null; t: number | null }
  | { kind: 'list'; entries: PlaylistEntry[] };

const KNOWN_STYLES: readonly string[] = STYLES;
const WITH_MINUTES = /^(\d+):([0-5]\d)$/;
const WHOLE_SECONDS = /^\d+$/;

/** Formats a position as `m:ss`, flooring to the whole second: 80 → '1:20', 5.9 → '0:05'. */
export function formatShareTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

/** Reads `m:ss` (seconds must be two digits, 00–59) or plain whole seconds. Otherwise null. */
export function parseShareTime(text: string): number | null {
  const withMinutes = WITH_MINUTES.exec(text);
  if (withMinutes) return Number(withMinutes[1]) * 60 + Number(withMinutes[2]);
  if (WHOLE_SECONDS.test(text)) return Number(text);
  return null;
}

/** Builds a one-song link. A time is included only when it is at least one second in. */
export function songHash(song: string, style: StyleId, t: number | null): string {
  let hash = `#song=${encodeURIComponent(song)}&style=${encodeURIComponent(style)}`;
  if (t !== null && t >= 1) hash += `&t=${encodeURIComponent(formatShareTime(t))}`;
  return hash;
}

/** Builds a playlist link; an empty playlist has nothing to share, so it gets an empty string. */
export function playlistHash(list: PlaylistEntry[]): string {
  if (list.length === 0) return '';
  const items = list.map(
    (entry) => `${encodeURIComponent(entry.song)}~${encodeURIComponent(entry.style)}`,
  );
  return `#list=${items.join(',')}`;
}

/** Reads a share link from a URL hash, keeping only songs in `ids` and styles in `STYLES`. */
export function parseShareHash(hash: string, ids: readonly string[]): ShareLink | null {
  const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);

  if (params.has('list')) {
    const entries: PlaylistEntry[] = [];
    for (const item of (params.get('list') ?? '').split(',')) {
      if (entries.length >= PLAYLIST_MAX) break;
      const [song, style] = item.split('~');
      if (song === undefined || style === undefined) continue;
      if (!ids.includes(song) || !KNOWN_STYLES.includes(style)) continue;
      entries.push({ song, style: style as StyleId });
    }
    return entries.length === 0 ? null : { kind: 'list', entries };
  }

  const song = params.get('song');
  if (song === null || !ids.includes(song)) return null;
  const styleParam = params.get('style');
  const style =
    styleParam !== null && KNOWN_STYLES.includes(styleParam) ? (styleParam as StyleId) : null;
  const tParam = params.get('t');
  return { kind: 'song', song, style, t: tParam === null ? null : parseShareTime(tParam) };
}

/**
 * Whether this build knows every song and style a share hash names. An older cached build opened on a
 * link to a newer song must leave the hash in place, so the new build it reloads into can read it.
 */
export function hashFullyKnown(hash: string, ids: readonly string[]): boolean {
  const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
  const known = (song: string | undefined, style: string | null | undefined) =>
    song !== undefined && ids.includes(song) && (style == null || KNOWN_STYLES.includes(style));
  if (params.has('list')) {
    const items = (params.get('list') ?? '').split(',').slice(0, PLAYLIST_MAX);
    return items.every((item) => {
      const [song, style] = item.split('~');
      return known(song, style ?? '');
    });
  }
  if (params.has('song')) return known(params.get('song') ?? undefined, params.get('style'));
  return true;
}
