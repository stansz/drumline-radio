import { createDial } from './dial';
import { Engine } from '../audio/engine';
import { LIBRARY, LIBRARY_ERRORS } from '../music/library';
import { createMeters, SEGMENTS } from './meters';
import { STYLES } from '../music/roles';
import type { StyleId } from '../music/roles';
import { createScore } from './score';
import { STYLE_DEFS } from '../audio/styles';
import { buildTimeline, notesBetween } from '../music/timing';
import { createSaver } from './saver';
import { createWakeLock } from './wake';
import {
  flashStep,
  formatTime,
  nextAfterEnd,
  parseSaverMinutes,
  parseVolume,
  prevAction,
  SAVER_OPTIONS,
  scrubTarget,
  shouldStartSaver,
  songFacts,
  volumeGain,
} from './view';
import { createMarquee } from './marquee';
import {
  categoryLabel,
  CATEGORY_FILTERS,
  parseCategory,
  stationsIn,
  stepStation,
} from './view';
import type { CategoryFilter, SaverMinutes } from './view';
import {
  addEntry,
  moveEntry,
  nextInPlaylist,
  parsePlaylist,
  parseView,
  prevInPlaylist,
  removeEntry,
  serializePlaylist,
  PLAYLIST_MAX,
} from './playlist';
import type { AppView, PlaylistEntry } from './playlist';

const VOLUME_KEY = 'drumline-radio-volume';
const MUTED_KEY = 'drumline-radio-muted';
const REPEAT_KEY = 'drumline-radio-repeat';
const CATEGORY_KEY = 'drumline-radio-category';
const DIM_KEY = 'drumline-radio-dim';
const FLASH_KEY = 'drumline-radio-flash';
const SAVER_KEY = 'drumline-radio-saver';
const PLAYLIST_KEY = 'drumline-radio-playlist';
const PLAYLIST_LOOP_KEY = 'drumline-radio-playlist-loop';
const VIEW_KEY = 'drumline-radio-view';

function load(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function save(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Settings just aren't remembered without storage.
  }
}

function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`missing ${selector}`);
  return element;
}

export function startUi(): void {
  for (const error of LIBRARY_ERRORS) console.error(error);

  const titleEl = required<HTMLElement>('#title');
  const subtitleEl = required<HTMLElement>('#subtitle');
  const readoutEl = required<HTMLElement>('.readout');
  const metersCanvas = required<HTMLCanvasElement>('#meters');
  const muteButton = required<HTMLButtonElement>('#mute');
  const volumeEl = required<HTMLInputElement>('#volume');
  const scoreCanvas = required<HTMLCanvasElement>('#score');
  const banner = required<HTMLElement>('#style-banner');
  const dialEl = required<HTMLElement>('#dial');
  const prevButton = required<HTMLButtonElement>('#prev');
  const playButton = required<HTMLButtonElement>('#play');
  const nextButton = required<HTMLButtonElement>('#next');
  const repeatButton = required<HTMLButtonElement>('#repeat');
  const elapsedEl = required<HTMLElement>('#elapsed');
  const totalEl = required<HTMLElement>('#total');
  const seekEl = required<HTMLInputElement>('#seek');
  const bandsEl = required<HTMLElement>('#bands');
  const presetsEl = required<HTMLElement>('#presets');
  const infoButton = required<HTMLButtonElement>('#info');
  const infoPanel = required<HTMLDialogElement>('#info-panel');
  const infoClose = required<HTMLButtonElement>('#info-close');
  const songCard = required<HTMLDialogElement>('#song-card');
  const cardTitle = required<HTMLElement>('#card-title');
  const cardByline = required<HTMLElement>('#card-byline');
  const cardFacts = required<HTMLElement>('#card-facts');
  const cardAbout = required<HTMLElement>('#card-about');
  const cardClose = required<HTMLButtonElement>('#card-close');
  const dimToggle = required<HTMLButtonElement>('#dim-toggle');
  const flashToggle = required<HTMLButtonElement>('#flash-toggle');
  const saverStart = required<HTMLButtonElement>('#saver-start');
  const saverAutoEl = required<HTMLElement>('#saver-auto');
  const dimOverlay = required<HTMLElement>('#dim');
  const saverOverlay = required<HTMLElement>('#screensaver');
  const saverBox = required<HTMLElement>('#saver-box');
  const saverTitle = required<HTMLElement>('#saver-title');
  const saverTime = required<HTMLElement>('#saver-time');
  const viewsEl = required<HTMLElement>('#views');
  const playlistView = required<HTMLElement>('#playlist-view');
  const playlistCount = required<HTMLElement>('#pl-count');
  const playlistStart = required<HTMLButtonElement>('#pl-start');
  const playlistLoop = required<HTMLButtonElement>('#pl-loop');
  const playlistClear = required<HTMLButtonElement>('#pl-clear');
  const playlistList = required<HTMLElement>('#pl-list');
  const playlistEmpty = required<HTMLElement>('#pl-empty');
  const playlistFilters = required<HTMLElement>('#pl-filters');
  const playlistSongs = required<HTMLElement>('#pl-songs');
  const viewButtons = Array.from(viewsEl.querySelectorAll<HTMLButtonElement>('.view-btn'));
  const root = document.documentElement;

  const titleMarquee = createMarquee(titleEl);
  const subtitleMarquee = createMarquee(subtitleEl);
  new ResizeObserver(() => {
    titleMarquee.refit();
    subtitleMarquee.refit();
  }).observe(readoutEl);
  // The readout font loads after the first measurement, so measure again once it's in.
  void document.fonts.ready.then(() => {
    titleMarquee.refit();
    subtitleMarquee.refit();
  });

  const score = createScore(scoreCanvas);
  const meters = createMeters(metersCanvas);

  let engine: Engine | null = null;
  let current = 0;
  let lastStyle: StyleId | null = null;
  let bannerTimer = 0;
  let draggingSeek = false;
  // Dragging the score scrubs: the score follows the finger and the song seeks on release.
  let scrub: { pointer: number; x: number; start: number; target: number; moved: boolean } | null = null;

  let category: CategoryFilter = parseCategory(load(CATEGORY_KEY));

  let playlist: PlaylistEntry[] = parsePlaylist(
    load(PLAYLIST_KEY),
    LIBRARY.map((entry) => entry.id),
  );
  let playlistAt: number | null = null;
  let loop = load(PLAYLIST_LOOP_KEY) === '1';
  let view: AppView = parseView(load(VIEW_KEY));
  let libraryFilter: CategoryFilter = 'all';
  // Durations and the id lookup are fixed for the session, so the lists never recompute them.
  const songDurations = LIBRARY.map((entry) => buildTimeline(entry.song).duration);
  const libraryById = new Map(LIBRARY.map((entry) => [entry.id, entry]));

  let dim = load(DIM_KEY) === '1';
  let flashOn = load(FLASH_KEY) !== '0';
  let flashStart = Number.NEGATIVE_INFINITY;
  let saverMinutes: SaverMinutes = parseSaverMinutes(load(SAVER_KEY));
  let lastInteraction = performance.now();

  const wake = createWakeLock();
  const saver = createSaver(saverOverlay, saverBox, saverTitle, saverTime, () => {
    lastInteraction = performance.now();
    updatePlayButton();
  });

  const bandButtons: HTMLButtonElement[] = [];
  for (let index = 0; index < STYLES.length; index += 1) {
    const id = STYLES[index];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'band';
    button.setAttribute('role', 'radio');
    button.dataset.style = id;
    button.addEventListener('click', () => selectBand(index));
    bandsEl.append(button);
    bandButtons.push(button);
  }

  const presetButtons: HTMLButtonElement[] = [];
  for (const filter of CATEGORY_FILTERS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'preset';
    button.setAttribute('role', 'radio');
    button.textContent = categoryLabel(filter);
    button.setAttribute('aria-checked', String(filter === category));
    button.addEventListener('click', () => selectCategory(filter));
    presetsEl.append(button);
    presetButtons.push(button);
  }

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

  const saverButtons: HTMLButtonElement[] = [];
  for (const minutes of SAVER_OPTIONS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'info-choice';
    button.setAttribute('role', 'radio');
    button.textContent = minutes === 0 ? 'Off' : `${minutes} min`;
    button.addEventListener('click', () => selectSaverMinutes(minutes));
    saverAutoEl.append(button);
    saverButtons.push(button);
  }

  const visible = (): number[] =>
    stationsIn(
      LIBRARY.map((entry) => entry.song.meta.category),
      category,
    );

  function songStyle(): StyleId {
    return LIBRARY[current]?.song.meta.style ?? 'synthwave';
  }

  function updateReadout(style: StyleId): void {
    const entry = LIBRARY[current];
    if (!entry) return;
    const song = entry.song;
    titleMarquee.set(song.meta.title);
    const name = STYLE_DEFS[style].name;
    const remix = style !== song.meta.style ? ' (remix)' : '';
    const byline =
      song.meta.arranger === null
        ? song.meta.composer
        : `${song.meta.composer}, arr. ${song.meta.arranger}`;
    const position =
      playlistAt === null ? '' : ` · ${playlistAt + 1}/${playlist.length}`;
    subtitleMarquee.set(`${byline} · ${song.meta.year} · ${name}${remix}${position}`);
  }

  function updateReadoutForEngine(): void {
    if (engine) updateReadout(engine.style);
  }

  function updateBands(style: StyleId): void {
    for (let index = 0; index < STYLES.length; index += 1) {
      const id = STYLES[index];
      const button = bandButtons[index];
      const own = songStyle() === id;
      button.textContent = `${own ? '★ ' : ''}${STYLE_DEFS[id].name}`;
      button.setAttribute('aria-checked', String(id === style));
    }
  }

  function updatePlayButton(): void {
    const playing = engine?.playing ?? false;
    playButton.textContent = playing ? '❚❚' : '▶';
    playButton.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    // With auto-start on, keep the screen awake while playing so the screensaver gets to start
    // before the phone's own timeout locks it.
    wake.set(playing && (dim || saver.visible || saverMinutes > 0));
  }

  function showBanner(style: StyleId): void {
    banner.textContent = '';
    const name = document.createElement('div');
    name.className = 'banner-name';
    name.textContent = STYLE_DEFS[style].name;
    const blurb = document.createElement('div');
    blurb.className = 'banner-blurb';
    blurb.textContent = STYLE_DEFS[style].blurb;
    banner.append(name, blurb);
    banner.classList.add('show');
    window.clearTimeout(bannerTimer);
    bannerTimer = window.setTimeout(() => banner.classList.remove('show'), 2500);
  }

  let volume = parseVolume(load(VOLUME_KEY));
  let muted = load(MUTED_KEY) === '1';
  let repeat = load(REPEAT_KEY) === '1';

  function outputGain(): number {
    return muted ? 0 : volumeGain(volume);
  }

  function applyVolume(): void {
    volumeEl.value = String(volume);
    const lit = Math.round((volume / 100) * SEGMENTS);
    volumeEl.style.setProperty('--fill', `${(lit / SEGMENTS) * 100}%`);
    muteButton.setAttribute('aria-pressed', String(muted));
    muteButton.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
    muteButton.classList.toggle('muted', muted || volume === 0);
    engine?.setVolume(outputGain());
  }

  function toggleMute(): void {
    muted = !muted;
    save(MUTED_KEY, muted ? '1' : '0');
    applyVolume();
  }

  function applyRepeat(): void {
    repeatButton.setAttribute('aria-pressed', String(repeat));
    repeatButton.classList.toggle('on', repeat);
  }

  function toggleRepeat(): void {
    repeat = !repeat;
    save(REPEAT_KEY, repeat ? '1' : '0');
    applyRepeat();
  }

  function applyDim(): void {
    dimOverlay.hidden = !dim;
    dimToggle.setAttribute('aria-pressed', String(dim));
    updatePlayButton();
  }

  function toggleDim(): void {
    dim = !dim;
    save(DIM_KEY, dim ? '1' : '0');
    applyDim();
  }

  function toggleFlash(): void {
    flashOn = !flashOn;
    save(FLASH_KEY, flashOn ? '1' : '0');
    flashToggle.setAttribute('aria-pressed', String(flashOn));
  }

  function applySaverMinutes(): void {
    for (let index = 0; index < SAVER_OPTIONS.length; index += 1) {
      saverButtons[index].setAttribute(
        'aria-checked',
        String(SAVER_OPTIONS[index] === saverMinutes),
      );
    }
  }

  function selectSaverMinutes(minutes: SaverMinutes): void {
    saverMinutes = minutes;
    save(SAVER_KEY, String(minutes));
    applySaverMinutes();
  }

  function ensureEngine(): Engine | null {
    const entry = LIBRARY[current];
    if (!entry) return null;
    if (engine) return engine;

    const ctx = new AudioContext();
    const created = new Engine(ctx);
    created.onEnded = handleEnded;
    created.setVolume(outputGain());
    created.load(entry.song);
    engine = created;

    root.dataset.style = created.style;
    updateReadout(created.style);
    updateBands(created.style);
    totalEl.textContent = formatTime(created.duration);
    lastStyle = created.style;
    return created;
  }

  function loadSong(index: number): void {
    if (LIBRARY.length === 0) return;
    current = ((index % LIBRARY.length) + LIBRARY.length) % LIBRARY.length;
    const entry = LIBRARY[current];

    if (!engine) {
      titleMarquee.set(entry.song.meta.title);
      subtitleMarquee.set('Press play');
      updateBands(entry.song.meta.style);
      root.dataset.style = entry.song.meta.style;
      dial.select(current, false);
      return;
    }

    const wasPlaying = engine.playing;
    engine.load(entry.song);
    root.dataset.style = engine.style;
    if (lastStyle !== null && lastStyle !== engine.style) showBanner(engine.style);
    lastStyle = engine.style;
    updateReadout(engine.style);
    updateBands(engine.style);
    dial.select(current, false);
    totalEl.textContent = formatTime(engine.duration);
    elapsedEl.textContent = formatTime(0);
    seekEl.value = '0';
    if (wasPlaying) engine.play();
    updatePlayButton();
  }

  function handleEnded(): void {
    if (playlistAt !== null) {
      const n = nextInPlaylist(playlistAt, playlist.length, repeat, loop);
      if (n < 0) {
        playlistAt = null;
        renderPlaylist();
        updateReadoutForEngine();
        updatePlayButton();
        return;
      }
      playEntry(n);
      return;
    }
    loadSong(nextAfterEnd(current, visible(), repeat));
    engine?.play();
    updatePlayButton();
  }

  function selectBand(index: number): void {
    const id = STYLES[index];
    if (!id) return;
    const active = ensureEngine();
    if (!active) return;
    active.setStyle(id);
    root.dataset.style = id;
    lastStyle = id;
    updateReadout(id);
    updateBands(id);
    showBanner(id);
  }

  function selectCategory(filter: CategoryFilter): void {
    playlistAt = null;
    renderPlaylist();
    updateReadoutForEngine();
    category = filter;
    save(CATEGORY_KEY, filter);
    for (let index = 0; index < CATEGORY_FILTERS.length; index += 1) {
      presetButtons[index].setAttribute(
        'aria-checked',
        String(CATEGORY_FILTERS[index] === filter),
      );
    }
    const shown = visible();
    dial.filter(shown);
    if (shown.includes(current)) {
      dial.select(current, false);
      return;
    }
    const target = shown[0];
    if (target === undefined) return;
    loadSong(target);
  }

  function togglePlay(): void {
    const active = ensureEngine();
    if (!active) return;
    if (active.playing) active.pause();
    else active.play();
    updatePlayButton();
  }

  function previous(): void {
    const active = ensureEngine();
    if (!active) return;
    if (prevAction(active.position) === 'restart') {
      active.seek(0);
      updatePlayButton();
      return;
    }
    if (playlistAt !== null) {
      const p = prevInPlaylist(playlistAt, playlist.length);
      if (p >= 0) playEntry(p);
      return;
    }
    loadSong(stepStation(visible(), current, -1));
  }

  function next(): void {
    if (!ensureEngine()) return;
    if (playlistAt !== null) {
      const n = nextInPlaylist(playlistAt, playlist.length, false, true);
      if (n >= 0) playEntry(n);
      return;
    }
    loadSong(stepStation(visible(), current, 1));
  }

  function setPlaylist(list: PlaylistEntry[]): void {
    playlist = list;
    save(PLAYLIST_KEY, serializePlaylist(list));
    renderPlaylist();
  }

  function applyView(): void {
    root.dataset.view = view;
    playlistView.hidden = view !== 'playlist';
    for (const button of viewButtons) {
      button.setAttribute('aria-checked', String(button.dataset.view === view));
    }
  }

  function selectView(next: AppView): void {
    view = next;
    save(VIEW_KEY, view);
    applyView();
    if (view === 'radio') {
      titleMarquee.refit();
      subtitleMarquee.refit();
    }
  }

  function selectLibraryFilter(filter: CategoryFilter): void {
    libraryFilter = filter;
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
    const rows = stationsIn(
      LIBRARY.map((entry) => entry.song.meta.category),
      libraryFilter,
    );
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
      play.addEventListener('click', () => playEntry(index));

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
    updateReadoutForEngine();
  }

  function removeFromPlaylist(index: number): void {
    const result = removeEntry(playlist, playlistAt, index);
    playlistAt = result.at;
    setPlaylist(result.list);
    updateReadoutForEngine();
  }

  function applyLoop(): void {
    playlistLoop.setAttribute('aria-pressed', String(loop));
  }

  function playEntry(at: number): void {
    const item = playlist[at];
    if (!item) return;
    const index = LIBRARY.findIndex((entry) => entry.id === item.song);
    if (index < 0) return;
    if (!visible().includes(index)) selectCategory('all'); // before playlistAt is set
    const fresh = engine === null;
    current = index;
    const active = ensureEngine();
    if (!active) return;
    if (!fresh) loadSong(index);
    const changed = lastStyle !== null && lastStyle !== item.style;
    playlistAt = at;
    active.setStyle(item.style);
    root.dataset.style = item.style;
    if (changed && !fresh) showBanner(item.style);
    lastStyle = item.style;
    updateReadout(item.style);
    updateBands(item.style);
    dial.select(current, false);
    active.play();
    updatePlayButton();
    renderPlaylist();
  }

  // Tuning to a station keeps the play state: it plays on if music was playing, stays stopped if not.
  const dial = createDial(dialEl, LIBRARY, (index) => {
    playlistAt = null;
    renderPlaylist();
    updateReadoutForEngine();
    loadSong(index);
    updatePlayButton();
  });

  function openSongCard(): void {
    const entry = LIBRARY[current];
    if (!entry) return;
    const { meta } = entry.song;
    cardTitle.textContent = meta.title;
    cardByline.textContent =
      meta.arranger === null ? meta.composer : `${meta.composer} · arr. ${meta.arranger}`;
    cardFacts.textContent = '';
    const facts = songFacts(
      meta,
      categoryLabel(meta.category),
      STYLE_DEFS[meta.style].name,
      buildTimeline(entry.song).duration,
    );
    for (const [label, value] of facts) {
      const dt = document.createElement('dt');
      dt.textContent = label;
      const dd = document.createElement('dd');
      dd.textContent = value;
      cardFacts.append(dt, dd);
    }
    if (meta.about === null) {
      cardAbout.hidden = true;
    } else {
      cardAbout.hidden = false;
      cardAbout.textContent = meta.about;
    }
    songCard.showModal();
  }

  readoutEl.addEventListener('click', () => openSongCard());
  readoutEl.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    openSongCard();
  });
  cardClose.addEventListener('click', () => songCard.close());

  playButton.addEventListener('click', togglePlay);
  prevButton.addEventListener('click', previous);
  nextButton.addEventListener('click', next);
  repeatButton.addEventListener('click', toggleRepeat);

  for (const button of viewButtons) {
    button.addEventListener('click', () => selectView(parseView(button.dataset.view ?? null)));
  }
  viewsEl.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    event.stopPropagation();
    selectView(view === 'radio' ? 'playlist' : 'radio');
  });
  playlistStart.addEventListener('click', () => playEntry(0));
  playlistLoop.addEventListener('click', () => {
    loop = !loop;
    save(PLAYLIST_LOOP_KEY, loop ? '1' : '0');
    applyLoop();
  });
  playlistClear.addEventListener('click', () => {
    if (!window.confirm('Clear the playlist?')) return;
    playlistAt = null;
    setPlaylist([]);
    updateReadoutForEngine();
  });

  infoButton.addEventListener('click', () => infoPanel.showModal());
  infoClose.addEventListener('click', () => infoPanel.close());
  dimToggle.addEventListener('click', toggleDim);
  flashToggle.setAttribute('aria-pressed', String(flashOn));
  flashToggle.addEventListener('click', toggleFlash);
  saverStart.addEventListener('click', () => {
    infoPanel.close();
    saver.show();
    updatePlayButton();
  });

  const noteInteraction = (): void => {
    lastInteraction = performance.now();
  };
  document.addEventListener('pointerdown', noteInteraction, true);
  document.addEventListener('keydown', noteInteraction, true);

  bandsEl.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    event.stopPropagation();
    const activeIndex = bandButtons.findIndex(
      (button) => button.getAttribute('aria-checked') === 'true',
    );
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const start = activeIndex < 0 ? 0 : activeIndex;
    const nextIndex = (start + delta + STYLES.length) % STYLES.length;
    selectBand(nextIndex);
    bandButtons[nextIndex].focus();
  });

  presetsEl.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    event.stopPropagation();
    const activeIndex = presetButtons.findIndex(
      (button) => button.getAttribute('aria-checked') === 'true',
    );
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const start = activeIndex < 0 ? 0 : activeIndex;
    const nextIndex = (start + delta + CATEGORY_FILTERS.length) % CATEGORY_FILTERS.length;
    selectCategory(CATEGORY_FILTERS[nextIndex]);
    presetButtons[nextIndex].focus();
  });

  applyVolume();
  applyRepeat();
  applyDim();
  applySaverMinutes();
  muteButton.addEventListener('click', toggleMute);
  volumeEl.addEventListener('input', () => {
    volume = Number(volumeEl.value);
    if (muted && volume > 0) {
      muted = false;
      save(MUTED_KEY, '0');
    }
    save(VOLUME_KEY, String(volume));
    applyVolume();
  });

  scoreCanvas.addEventListener('pointerdown', (event) => {
    if (!engine || engine.duration <= 0) return;
    scrub = { pointer: event.pointerId, x: event.clientX, start: engine.position, target: engine.position, moved: false };
    scoreCanvas.setPointerCapture(event.pointerId);
  });
  scoreCanvas.addEventListener('pointermove', (event) => {
    if (!scrub || !engine || event.pointerId !== scrub.pointer) return;
    const dx = event.clientX - scrub.x;
    if (Math.abs(dx) > 4) scrub.moved = true;
    scrub.target = scrubTarget(scrub.start, dx, scoreCanvas.clientWidth, engine.duration);
  });
  const endScrub = (event: PointerEvent): void => {
    if (!scrub || event.pointerId !== scrub.pointer) return;
    if (scrub.moved && engine) {
      engine.seek(scrub.target);
      updatePlayButton();
    }
    scrub = null;
  };
  scoreCanvas.addEventListener('pointerup', endScrub);
  scoreCanvas.addEventListener('pointercancel', endScrub);

  seekEl.addEventListener('pointerdown', () => {
    draggingSeek = true;
  });
  const endSeek = (): void => {
    draggingSeek = false;
  };
  seekEl.addEventListener('pointerup', endSeek);
  seekEl.addEventListener('pointercancel', endSeek);
  seekEl.addEventListener('input', () => {
    if (!engine) return;
    engine.seek((Number(seekEl.value) / 1000) * engine.duration);
    updatePlayButton();
  });

  document.addEventListener('keydown', (event) => {
    // A key while the screensaver is up only dismisses it.
    if (saver.visible) {
      saver.hide();
      updatePlayButton();
      return;
    }
    if (document.activeElement instanceof HTMLSelectElement) return;
    if (infoPanel.open || songCard.open) return;
    if (document.activeElement === seekEl || document.activeElement === volumeEl) return;
    if (event.key === 'm' || event.key === 'M') {
      toggleMute();
      return;
    }
    if (event.key === 'r' || event.key === 'R') {
      toggleRepeat();
      return;
    }
    if (event.key === 's' || event.key === 'S') {
      saver.show();
      updatePlayButton();
      return;
    }
    if (event.key === 'p' || event.key === 'P') {
      selectView(view === 'radio' ? 'playlist' : 'radio');
      return;
    }
    if (event.key === 'c' || event.key === 'C') {
      const index = CATEGORY_FILTERS.indexOf(category);
      selectCategory(CATEGORY_FILTERS[(index + 1) % CATEGORY_FILTERS.length]);
      return;
    }
    if (event.key === ' ' || event.code === 'Space') {
      event.preventDefault();
      togglePlay();
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      previous();
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      next();
      return;
    }
    if (/^[1-6]$/.test(event.key)) {
      event.preventDefault();
      selectBand(Number(event.key) - 1);
    }
  });

  function updateFlash(active: Engine): void {
    let kick = false;
    if (flashOn && active.style === 'techno' && active.playing && active.timeline && active.song) {
      const position = active.position;
      for (const note of notesBetween(active.timeline, position - 0.06, position + 0.0001)) {
        const track = active.song.tracks[note.track];
        if (track && track.role === 'drums' && note.pitches.includes(36)) {
          kick = true;
          break;
        }
      }
    }
    const step = flashStep(flashStart, performance.now() / 1000, kick);
    flashStart = step.start;
    const level = flashOn ? step.level : 0;
    root.style.setProperty('--flash', level.toFixed(3));
  }

  function frame(): void {
    if (
      shouldStartSaver(
        performance.now() - lastInteraction,
        saverMinutes,
        engine?.playing ?? false,
        saver.visible || infoPanel.open || songCard.open,
      )
    ) {
      saver.show();
      updatePlayButton();
    }
    const active = engine;
    const fallback = STYLE_DEFS[songStyle()];
    if (active) {
      const style = STYLE_DEFS[active.style];
      const position = scrub?.moved ? scrub.target : active.position;
      if (saver.visible) {
        saver.update(LIBRARY[current]?.song.meta.title ?? 'Drumline Radio', formatTime(position));
      } else {
        score.draw(active.timeline, position, style, dial.tuning());
        meters.draw(active.levels(), style.lanes[0] ?? '#ffffff');
      }
      const duration = active.duration;
      if (!draggingSeek && duration > 0) {
        seekEl.value = String(Math.round((position / duration) * 1000));
      }
      seekEl.style.setProperty('--progress', `${(Number(seekEl.value) / 10).toFixed(1)}%`);
      elapsedEl.textContent = formatTime(position);
      totalEl.textContent = formatTime(duration);
      updateFlash(active);
      updatePlayButton();
    } else if (!saver.visible) {
      score.draw(null, 0, fallback, dial.tuning());
      meters.draw([0, 0], fallback.lanes[0] ?? '#ffffff');
    }
    requestAnimationFrame(frame);
  }

  applyView();
  applyLoop();
  renderLibrary();
  renderPlaylist();

  if (LIBRARY.length === 0) {
    titleMarquee.set('Drumline Radio');
    subtitleMarquee.set('No songs found');
    return;
  }

  dial.filter(visible());
  current = visible()[0] ?? 0;
  const first = LIBRARY[current];
  titleMarquee.set(first.song.meta.title);
  subtitleMarquee.set('Press play');
  root.dataset.style = first.song.meta.style;
  updateBands(first.song.meta.style);
  dial.select(current, false);
  totalEl.textContent = formatTime(0);
  updatePlayButton();
  requestAnimationFrame(frame);
}
