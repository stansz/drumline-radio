import { LIBRARY } from '../music/library';
import { STYLES } from '../music/roles';
import type { StyleId } from '../music/roles';
import { STYLE_DEFS } from '../audio/styles';
import { buildTimeline } from '../music/timing';
import { categoryLabel, CATEGORY_FILTERS, formatTime, nextStyleFilter, stationsIn, stylesIn } from './view';
import type { CategoryFilter, StyleFilter } from './view';
import {
  addEntry,
  moveEntry,
  parsePlaylist,
  parseView,
  removeEntry,
  serializePlaylist,
  PLAYLIST_MAX,
} from './playlist';
import type { AppView, PlaylistEntry } from './playlist';
import { playlistHash } from './share';
import { linkUrl, sendLink } from './links';
import { load, required, save } from './dom';

const PLAYLIST_KEY = 'drumline-radio-playlist';
const PLAYLIST_LOOP_KEY = 'drumline-radio-playlist-loop';
const VIEW_KEY = 'drumline-radio-view';

export interface PlaylistViewDeps {
  playEntry(at: number): void;
  onChange(): void;
  refit(): void;
}

export interface PlaylistView {
  readonly entries: PlaylistEntry[];
  at: number | null;
  readonly loop: boolean;
  readonly view: AppView;
  selectView(next: AppView): void;
  showIncoming(entries: PlaylistEntry[]): void;
  stop(): void;
  init(): void;
}

/** The playlist screen: the saved list, the library list, the view switch, and shared playlists. */
export function createPlaylistView(deps: PlaylistViewDeps): PlaylistView {
  const root = document.documentElement;
  const viewsEl = required<HTMLElement>('#views');
  const playlistViewEl = required<HTMLElement>('#playlist-view');
  const playlistCount = required<HTMLElement>('#pl-count');
  const playlistStart = required<HTMLButtonElement>('#pl-start');
  const playlistLoop = required<HTMLButtonElement>('#pl-loop');
  const playlistClear = required<HTMLButtonElement>('#pl-clear');
  const playlistShare = required<HTMLButtonElement>('#pl-link');
  const playlistList = required<HTMLElement>('#pl-list');
  const playlistEmpty = required<HTMLElement>('#pl-empty');
  const incomingNotice = required<HTMLElement>('#pl-incoming');
  const incomingText = required<HTMLElement>('#pl-incoming-text');
  const incomingReplace = required<HTMLButtonElement>('#pl-incoming-replace');
  const incomingAdd = required<HTMLButtonElement>('#pl-incoming-add');
  const incomingDismiss = required<HTMLButtonElement>('#pl-incoming-dismiss');
  const playlistFilters = required<HTMLElement>('#pl-filters');
  const playlistSongs = required<HTMLElement>('#pl-songs');
  const viewButtons = Array.from(viewsEl.querySelectorAll<HTMLButtonElement>('.view-btn'));

  let playlist: PlaylistEntry[] = parsePlaylist(
    load(PLAYLIST_KEY),
    LIBRARY.map((entry) => entry.id),
  );
  let playlistAt: number | null = null;
  let loop = load(PLAYLIST_LOOP_KEY) === '1';
  // A shared playlist waits in `incoming` until the listener picks a button.
  let incoming: PlaylistEntry[] = [];
  let view: AppView = parseView(load(VIEW_KEY));
  let libraryFilter: CategoryFilter = 'all';
  let libraryStyle: StyleFilter = 'all';
  const libraryCategories = LIBRARY.map((entry) => entry.song.meta.category);
  const libraryStyles = LIBRARY.map((entry) => entry.song.meta.style);
  // Durations and the id lookup are fixed for the session, so the lists never recompute them.
  const songDurations = LIBRARY.map((entry) => buildTimeline(entry.song).duration);
  const libraryById = new Map(LIBRARY.map((entry) => [entry.id, entry]));

  const libraryButtons: HTMLButtonElement[] = [];
  for (const filter of CATEGORY_FILTERS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'preset';
    button.setAttribute('role', 'radio');
    button.textContent = categoryLabel(filter);
    button.setAttribute('aria-checked', String(filter === libraryFilter));
    button.addEventListener('click', () => selectLibraryFilter(filter));
    playlistFilters.append(button);
    libraryButtons.push(button);
  }
  const styleCycle = document.createElement('button');
  styleCycle.type = 'button';
  styleCycle.className = 'preset style-cycle';
  styleCycle.addEventListener('click', () => {
    libraryStyle = nextStyleFilter(libraryStyle, stylesIn(libraryCategories, libraryStyles, libraryFilter));
    renderLibrary();
  });
  playlistFilters.append(styleCycle);

  function setPlaylist(list: PlaylistEntry[]): void {
    playlist = list;
    save(PLAYLIST_KEY, serializePlaylist(list));
    renderPlaylist();
  }

  function applyView(): void {
    root.dataset.view = view;
    playlistViewEl.hidden = view !== 'playlist';
    for (const button of viewButtons) {
      button.setAttribute('aria-checked', String(button.dataset.view === view));
    }
  }

  function selectView(next: AppView): void {
    view = next;
    save(VIEW_KEY, view);
    applyView();
    if (view === 'radio') deps.refit();
  }

  function selectLibraryFilter(filter: CategoryFilter): void {
    libraryFilter = filter;
    if (libraryStyle !== 'all' && !stylesIn(libraryCategories, libraryStyles, filter).includes(libraryStyle)) {
      libraryStyle = 'all';
    }
    for (let index = 0; index < CATEGORY_FILTERS.length; index += 1) {
      libraryButtons[index].setAttribute(
        'aria-checked',
        String(CATEGORY_FILTERS[index] === filter),
      );
    }
    renderLibrary();
  }

  function renderLibrary(): void {
    playlistSongs.textContent = '';
    const styleName = libraryStyle === 'all' ? 'All styles' : STYLE_DEFS[libraryStyle].name;
    styleCycle.textContent = styleName;
    styleCycle.classList.toggle('on', libraryStyle !== 'all');
    styleCycle.setAttribute('aria-label', `Style filter: ${styleName}. Press for the next style.`);
    const rows = stationsIn(libraryCategories, libraryFilter, libraryStyles, libraryStyle);
    for (const index of rows) {
      const entry = LIBRARY[index];
      const song = entry.song;
      const row = document.createElement('li');
      row.className = 'pl-song';

      const text = document.createElement('div');
      text.className = 'pl-song-text';
      const title = document.createElement('span');
      title.className = 'pl-song-title';
      title.textContent = song.meta.title;
      const meta = document.createElement('span');
      meta.className = 'pl-song-meta';
      meta.textContent = `${song.meta.composer} · ${formatTime(songDurations[index])}`;
      text.append(title, meta);

      const select = document.createElement('select');
      select.className = 'pl-style';
      select.setAttribute('aria-label', `Style for ${song.meta.title}`);
      for (const id of STYLES) {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = `${id === song.meta.style ? '★ ' : ''}${STYLE_DEFS[id].name}`;
        if (id === song.meta.style) option.selected = true;
        select.append(option);
      }

      const add = document.createElement('button');
      add.type = 'button';
      add.className = 'pl-add';
      add.setAttribute('aria-label', `Add ${song.meta.title} to playlist`);
      add.textContent = '+';
      add.addEventListener('click', () => {
        if (playlist.length >= PLAYLIST_MAX) {
          add.textContent = 'Full';
          window.setTimeout(() => {
            add.textContent = '+';
          }, 900);
          return;
        }
        setPlaylist(addEntry(playlist, { song: entry.id, style: select.value as StyleId }));
        add.textContent = '✓';
        window.setTimeout(() => {
          add.textContent = '+';
        }, 900);
      });

      row.append(text, select, add);
      playlistSongs.append(row);
    }
  }

  function renderPlaylist(): void {
    playlistCount.textContent = playlist.length > 0 ? `(${playlist.length})` : '';
    playlistEmpty.hidden = playlist.length > 0;
    playlistStart.disabled = playlist.length === 0;
    playlistClear.disabled = playlist.length === 0;
    playlistShare.disabled = playlist.length === 0;
    playlistList.textContent = '';
    for (let index = 0; index < playlist.length; index += 1) {
      const item = playlist[index];
      const entry = libraryById.get(item.song);
      if (!entry) continue;
      const song = entry.song;

      const row = document.createElement('li');
      row.className = 'pl-item';
      if (index === playlistAt) {
        row.classList.add('playing');
        row.setAttribute('aria-current', 'true');
      }

      const number = document.createElement('span');
      number.className = 'pl-num';
      number.textContent = String(index + 1);

      const play = document.createElement('button');
      play.type = 'button';
      play.className = 'pl-entry';
      const title = document.createElement('span');
      title.className = 'pl-song-title';
      title.textContent = song.meta.title;
      const meta = document.createElement('span');
      meta.className = 'pl-song-meta';
      const remix = item.style === song.meta.style ? '' : ' remix';
      meta.textContent = `${STYLE_DEFS[item.style].name}${remix}`;
      play.append(title, meta);
      play.addEventListener('click', () => deps.playEntry(index));

      const up = document.createElement('button');
      up.type = 'button';
      up.className = 'pl-icon';
      up.textContent = '↑';
      up.setAttribute('aria-label', `Move ${song.meta.title} up`);
      up.disabled = index === 0;
      up.addEventListener('click', () => movePlaylist(index, -1));

      const down = document.createElement('button');
      down.type = 'button';
      down.className = 'pl-icon';
      down.textContent = '↓';
      down.setAttribute('aria-label', `Move ${song.meta.title} down`);
      down.disabled = index === playlist.length - 1;
      down.addEventListener('click', () => movePlaylist(index, 1));

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'pl-icon';
      remove.textContent = '✕';
      remove.setAttribute('aria-label', `Remove ${song.meta.title}`);
      remove.addEventListener('click', () => removeFromPlaylist(index));

      row.append(number, play, up, down, remove);
      playlistList.append(row);
    }
  }

  function movePlaylist(index: number, delta: -1 | 1): void {
    const result = moveEntry(playlist, playlistAt, index, delta);
    playlistAt = result.at;
    setPlaylist(result.list);
    deps.onChange();
  }

  function removeFromPlaylist(index: number): void {
    const result = removeEntry(playlist, playlistAt, index);
    playlistAt = result.at;
    setPlaylist(result.list);
    deps.onChange();
  }

  function applyLoop(): void {
    playlistLoop.setAttribute('aria-pressed', String(loop));
  }

  function hideIncoming(): void {
    incoming = [];
    incomingNotice.hidden = true;
    incomingText.textContent = '';
  }

  for (const button of viewButtons) {
    button.addEventListener('click', () => selectView(parseView(button.dataset.view ?? null)));
  }
  viewsEl.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    event.stopPropagation();
    selectView(view === 'radio' ? 'playlist' : 'radio');
  });
  playlistStart.addEventListener('click', () => deps.playEntry(0));
  playlistLoop.addEventListener('click', () => {
    loop = !loop;
    save(PLAYLIST_LOOP_KEY, loop ? '1' : '0');
    applyLoop();
  });
  playlistClear.addEventListener('click', () => {
    if (!window.confirm('Clear the playlist?')) return;
    playlistAt = null;
    setPlaylist([]);
    deps.onChange();
  });

  playlistShare.addEventListener('click', () => {
    const hash = playlistHash(playlist);
    if (hash === '') return;
    void sendLink(linkUrl(hash), 'Drumline Radio playlist', playlistShare);
  });

  incomingReplace.addEventListener('click', () => {
    if (incoming.length === 0) {
      hideIncoming();
      return;
    }
    // The old playing index means nothing in the new list, so the current song plays on as radio.
    playlistAt = null;
    setPlaylist(incoming);
    hideIncoming();
    deps.onChange();
  });
  incomingAdd.addEventListener('click', () => {
    if (incoming.length === 0) {
      hideIncoming();
      return;
    }
    let next = playlist;
    for (const entry of incoming) next = addEntry(next, entry);
    setPlaylist(next);
    hideIncoming();
  });
  incomingDismiss.addEventListener('click', hideIncoming);

  return {
    get entries(): PlaylistEntry[] {
      return playlist;
    },
    get at(): number | null {
      return playlistAt;
    },
    set at(value: number | null) {
      playlistAt = value;
      renderPlaylist();
    },
    get loop(): boolean {
      return loop;
    },
    get view(): AppView {
      return view;
    },
    selectView,
    showIncoming(entries: PlaylistEntry[]): void {
      incoming = entries;
      incomingText.textContent = `Shared playlist: ${incoming.length} songs`;
      incomingNotice.hidden = false;
    },
    stop(): void {
      playlistAt = null;
      renderPlaylist();
      deps.onChange();
    },
    init(): void {
      applyView();
      applyLoop();
      renderLibrary();
      renderPlaylist();
    },
  };
}
