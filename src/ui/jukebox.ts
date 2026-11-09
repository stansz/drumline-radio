import { LIBRARY } from '../music/library';
import { STYLES } from '../music/roles';
import type { StyleId } from '../music/roles';
import type { Category } from '../music/song';
import { STYLE_DEFS } from '../audio/styles';
import { buildTimeline } from '../music/timing';
import { formatTime, shownComposer } from './view';
import { load, required, save } from './dom';

const SORT_KEY = 'drumline-radio-jukebox-sort';

export type JukeboxSort = 'style' | 'composer';

export const JUKEBOX_SORTS: readonly JukeboxSort[] = ['style', 'composer'];

const SORT_LABELS: Record<JukeboxSort, string> = {
  style: 'Style',
  composer: 'Composer',
};

/** The fields the jukebox reads from a song's header. */
export interface JukeboxSong {
  title: string;
  composer: string;
  category: Category;
  style: StyleId;
}

export interface JukeboxSlot {
  index: number;
  code: string;
}

export interface JukeboxGroup {
  key: string;
  style: StyleId | null;
  slots: JukeboxSlot[];
}

/** Reads a stored sort; anything other than the exact word means by style. */
export function parseJukeboxSort(stored: string | null): JukeboxSort {
  return stored === 'composer' ? 'composer' : 'style';
}

/**
 * The code of every original, by library index: styles that have originals get a letter in
 * STYLES order, and within a style the originals are numbered in title order.
 */
export function jukeboxCodes(songs: JukeboxSong[]): Map<number, string> {
  const codes = new Map<number, string>();
  let letter = 0;
  for (const style of STYLES) {
    const indices: number[] = [];
    for (let index = 0; index < songs.length; index += 1) {
      if (songs[index].category === 'originals' && songs[index].style === style) {
        indices.push(index);
      }
    }
    if (indices.length === 0) continue;
    const mark = String.fromCharCode(65 + letter);
    letter += 1;
    indices.sort((a, b) => songs[a].title.localeCompare(songs[b].title));
    for (let at = 0; at < indices.length; at += 1) {
      codes.set(indices[at], `${mark}${at + 1}`);
    }
  }
  return codes;
}

/** The originals grouped by home style or by composer, each group's slots in title order. */
export function jukeboxGroups(songs: JukeboxSong[], sort: JukeboxSort): JukeboxGroup[] {
  const codes = jukeboxCodes(songs);
  const keys: { key: string; style: StyleId | null }[] = [];

  if (sort === 'style') {
    for (const style of STYLES) {
      const present = songs.some(
        (song) => song.category === 'originals' && song.style === style,
      );
      if (present) keys.push({ key: style, style });
    }
  } else {
    const composers = new Set<string>();
    for (const song of songs) {
      if (song.category === 'originals') composers.add(song.composer);
    }
    for (const composer of [...composers].sort((a, b) => a.localeCompare(b))) {
      keys.push({ key: composer, style: null });
    }
  }

  const groups: JukeboxGroup[] = [];
  for (const { key, style } of keys) {
    const slots: JukeboxSlot[] = [];
    for (let index = 0; index < songs.length; index += 1) {
      const song = songs[index];
      if (song.category !== 'originals') continue;
      if (style !== null ? song.style !== style : song.composer !== key) continue;
      const code = codes.get(index);
      if (code === undefined) continue;
      slots.push({ index, code });
    }
    slots.sort((a, b) => songs[a.index].title.localeCompare(songs[b.index].title));
    groups.push({ key, style, slots });
  }
  return groups;
}

export interface JukeboxDeps {
  playSong(index: number): void;
  /** Adds the song in its home style; false when the playlist is full. */
  addToPlaylist(index: number): boolean;
}

export interface Jukebox {
  /** Marks the library song now loaded; safe to call before init. */
  setCurrent(index: number | null): void;
  init(): void;
}

/** The jukebox view: a wall of coded title strips for the originals, by style or composer. */
export function createJukebox(deps: JukeboxDeps): Jukebox {
  const countEl = required<HTMLElement>('#jb-count');
  const sortEl = required<HTMLElement>('#jb-sort');
  const wallEl = required<HTMLElement>('#jb-wall');
  // Grouped and shown by the credit the app shows, so one model's songs share a group.
  const songs = LIBRARY.map((entry) => ({ ...entry.song.meta, composer: shownComposer(entry.song.meta) }));
  // Durations are fixed for the session, so the wall never recomputes them.
  const durations = LIBRARY.map((entry) => buildTimeline(entry.song).duration);
  let sort = parseJukeboxSort(load(SORT_KEY));
  let current: number | null = null;
  let rendered = false;
  const slotEls = new Map<number, HTMLElement>();
  const sortButtons: HTMLButtonElement[] = [];

  const originals = songs.filter((song) => song.category === 'originals').length;
  countEl.textContent = `(${originals})`;

  for (const value of JUKEBOX_SORTS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'preset';
    button.setAttribute('role', 'radio');
    button.textContent = SORT_LABELS[value];
    button.addEventListener('click', () => selectSort(value));
    sortEl.append(button);
    sortButtons.push(button);
  }

  function applySort(): void {
    for (let index = 0; index < sortButtons.length; index += 1) {
      sortButtons[index].setAttribute(
        'aria-checked',
        String(JUKEBOX_SORTS[index] === sort),
      );
    }
  }

  function selectSort(next: JukeboxSort): void {
    sort = next;
    save(SORT_KEY, sort);
    applySort();
    render();
  }

  function updateCurrent(): void {
    for (const [index, slot] of slotEls) {
      const playing = index === current;
      slot.classList.toggle('playing', playing);
      if (playing) slot.setAttribute('aria-current', 'true');
      else slot.removeAttribute('aria-current');
    }
  }

  function render(): void {
    wallEl.textContent = '';
    slotEls.clear();
    for (const group of jukeboxGroups(songs, sort)) {
      const section = document.createElement('section');
      section.className = 'jb-section';

      const heading = document.createElement('h3');
      heading.className = 'jb-group';
      heading.textContent =
        group.style === null
          ? group.key
          : `${group.slots[0]?.code.charAt(0) ?? ''} · ${STYLE_DEFS[group.style].name}`;

      const list = document.createElement('ul');
      list.className = 'jb-slots';
      for (const slot of group.slots) {
        const entry = LIBRARY[slot.index];
        const song = entry.song;
        const item = document.createElement('li');
        item.className = 'jb-slot';

        const play = document.createElement('button');
        play.type = 'button';
        play.className = 'jb-play';
        play.setAttribute('aria-label', `Play ${song.meta.title}`);

        const code = document.createElement('span');
        code.className = 'jb-code';
        code.textContent = slot.code;

        const title = document.createElement('span');
        title.className = 'jb-title';
        title.textContent = song.meta.title;

        const meta = document.createElement('span');
        meta.className = 'jb-meta';
        meta.textContent =
          `${songs[slot.index].composer} · ${STYLE_DEFS[song.meta.style].name} · ` +
          formatTime(durations[slot.index]);

        play.append(code, title, meta);
        play.addEventListener('click', () => deps.playSong(slot.index));

        const add = document.createElement('button');
        add.type = 'button';
        add.className = 'jb-add';
        add.textContent = '+';
        add.setAttribute('aria-label', `Add ${song.meta.title} to playlist`);
        add.addEventListener('click', () => {
          const added = deps.addToPlaylist(slot.index);
          add.textContent = added ? '✓' : 'Full';
          window.setTimeout(() => {
            add.textContent = '+';
          }, 900);
        });

        item.append(play, add);
        list.append(item);
        slotEls.set(slot.index, item);
      }

      section.append(heading, list);
      wallEl.append(section);
    }
    updateCurrent();
  }

  sortEl.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    event.stopPropagation();
    const activeIndex = sortButtons.findIndex(
      (button) => button.getAttribute('aria-checked') === 'true',
    );
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const start = activeIndex < 0 ? 0 : activeIndex;
    const nextIndex = (start + delta + JUKEBOX_SORTS.length) % JUKEBOX_SORTS.length;
    selectSort(JUKEBOX_SORTS[nextIndex]);
    sortButtons[nextIndex].focus();
  });

  return {
    setCurrent(index: number | null): void {
      current = index;
      if (rendered) updateCurrent();
    },
    init(): void {
      rendered = true;
      applySort();
      render();
    },
  };
}
