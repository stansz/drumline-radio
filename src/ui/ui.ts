import { createDial } from './dial';
import { Engine } from '../audio/engine';
import { LIBRARY, LIBRARY_ERRORS } from '../music/library';
import { createMeters } from './meters';
import { STYLES } from '../music/roles';
import type { StyleId } from '../music/roles';
import { createScore } from './score';
import { STYLE_DEFS } from '../audio/styles';
import { notesBetween } from '../music/timing';
import { createSaver } from './saver';
import { createWakeLock } from './wake';
import {
  categoryLabel,
  CATEGORY_FILTERS,
  flashStep,
  formatTime,
  nextAfterEnd,
  nextStyleFilter,
  parseCategory,
  parseStyleFilter,
  prevAction,
  scrubTarget,
  shouldStartSaver,
  shownComposer,
  stationsIn,
  stepStation,
  stylesIn,
} from './view';
import type { CategoryFilter, StyleFilter } from './view';
import { createMarquee } from './marquee';
import { nextInPlaylist, prevInPlaylist } from './playlist';
import type { ShareLink } from './share';
import { createSettings } from './settings';
import { createPlaylistView } from './playlist-view';
import { createJukebox } from './jukebox';
import { createSongCard } from './song-card';
import { takeHash } from './links';
import { load, required, save } from './dom';

const CATEGORY_KEY = 'drumline-radio-category';
const STYLE_FILTER_KEY = 'drumline-radio-style-filter';

export function startUi(): void {
  for (const error of LIBRARY_ERRORS) console.error(error);

  const titleEl = required<HTMLElement>('#title');
  const subtitleEl = required<HTMLElement>('#subtitle');
  const readoutEl = required<HTMLElement>('.readout');
  const metersCanvas = required<HTMLCanvasElement>('#meters');
  const scoreCanvas = required<HTMLCanvasElement>('#score');
  const banner = required<HTMLElement>('#style-banner');
  const dialEl = required<HTMLElement>('#dial');
  const prevButton = required<HTMLButtonElement>('#prev');
  const playButton = required<HTMLButtonElement>('#play');
  const nextButton = required<HTMLButtonElement>('#next');
  const elapsedEl = required<HTMLElement>('#elapsed');
  const totalEl = required<HTMLElement>('#total');
  const seekEl = required<HTMLInputElement>('#seek');
  const bandsEl = required<HTMLElement>('#bands');
  const styleToggle = required<HTMLButtonElement>('#style-toggle');
  const presetsEl = required<HTMLElement>('#presets');
  const saverOverlay = required<HTMLElement>('#screensaver');
  const saverBox = required<HTMLElement>('#saver-box');
  const saverTitle = required<HTMLElement>('#saver-title');
  const saverTime = required<HTMLElement>('#saver-time');
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
  // A shared link can tune the first engine before it exists; the settings wait here.
  let pendingStyle: StyleId | null = null;
  let pendingSeek: number | null = null;
  let bannerTimer = 0;
  let draggingSeek = false;
  // Dragging the score scrubs: the score follows the finger and the song seeks on release.
  let scrub: { pointer: number; x: number; start: number; target: number; moved: boolean } | null = null;

  let category: CategoryFilter = parseCategory(load(CATEGORY_KEY));
  let styleFilter: StyleFilter = parseStyleFilter(load(STYLE_FILTER_KEY));
  const libraryCategories = LIBRARY.map((entry) => entry.song.meta.category);
  const libraryStyles = LIBRARY.map((entry) => entry.song.meta.style);
  if (styleFilter !== 'all' && !stylesIn(libraryCategories, libraryStyles, category).includes(styleFilter)) {
    styleFilter = 'all';
  }

  let flashStart = Number.NEGATIVE_INFINITY;
  let lastInteraction = performance.now();

  const wake = createWakeLock();
  const saver = createSaver(saverOverlay, saverBox, saverTitle, saverTime, () => {
    lastInteraction = performance.now();
    updatePlayButton();
  });

  const settings = createSettings({
    engine: () => engine,
    updatePlayButton,
    showSaver: () => {
      saver.show();
      updatePlayButton();
    },
  });

  const playlistView = createPlaylistView({
    playEntry: (at) => playEntry(at),
    onChange: updateReadoutForEngine,
    refit: () => {
      titleMarquee.refit();
      subtitleMarquee.refit();
    },
  });

  const jukebox = createJukebox({
    playSong: (index) => startSong(index, LIBRARY[index].song.meta.style, null),
    addToPlaylist: (index) =>
      playlistView.add({ song: LIBRARY[index].id, style: LIBRARY[index].song.meta.style }),
  });

  const songCard = createSongCard({
    entry: () => LIBRARY[current],
    position: () => engine?.position ?? null,
    style: shareStyle,
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

  // One button cycles the dial through the home styles under the current preset.
  const styleCycle = document.createElement('button');
  styleCycle.type = 'button';
  styleCycle.className = 'preset style-cycle';
  styleCycle.addEventListener('click', cycleStyle);
  presetsEl.append(styleCycle);

  const visible = (): number[] => stationsIn(libraryCategories, category, libraryStyles, styleFilter);

  function updateStyleCycle(): void {
    const name = styleFilter === 'all' ? 'All styles' : STYLE_DEFS[styleFilter].name;
    styleCycle.textContent = name;
    styleCycle.classList.toggle('on', styleFilter !== 'all');
    styleCycle.dataset.style = styleFilter;
    styleCycle.setAttribute('aria-label', `Style filter: ${name}. Press for the next style.`);
  }

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
        ? shownComposer(song.meta)
        : `${shownComposer(song.meta)}, arr. ${song.meta.arranger}`;
    const at = playlistView.at;
    const position =
      at === null ? '' : ` · ${at + 1}/${playlistView.entries.length}`;
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
    const remix = songStyle() !== style ? ' · remix' : '';
    styleToggle.textContent = `${STYLE_DEFS[style].name}${remix}`;
    styleToggle.setAttribute('aria-label', `Style: ${STYLE_DEFS[style].name}${remix}. Change style`);
  }

  // The style buttons fold into one toggle that opens them as a panel.
  function setStylePanel(open: boolean): void {
    bandsEl.classList.toggle('open', open);
    styleToggle.setAttribute('aria-expanded', String(open));
  }

  function updatePlayButton(): void {
    const playing = engine?.playing ?? false;
    playButton.textContent = playing ? '❚❚' : '▶';
    playButton.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    // Keep the screen awake whenever music plays: the phone pauses the synth when it locks.
    wake.set(playing);
    root.dataset.playing = String(playing); // read by the service worker's update reload
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

  function ensureEngine(): Engine | null {
    const entry = LIBRARY[current];
    if (!entry) return null;
    if (engine) return engine;

    const ctx = new AudioContext();
    const created = new Engine(ctx);
    created.onEnded = handleEnded;
    created.setVolume(settings.outputGain());
    created.load(entry.song);
    if (pendingStyle) created.setStyle(pendingStyle);
    if (pendingSeek !== null) created.seek(pendingSeek);
    pendingStyle = null;
    pendingSeek = null;
    engine = created;

    root.dataset.style = created.style;
    updateReadout(created.style);
    updateBands(created.style);
    totalEl.textContent = formatTime(created.duration);
    lastStyle = created.style;
    return created;
  }

  /** Loads a song. If music was playing it plays on, unless `resume` is false (the caller starts it). */
  function loadSong(index: number, resume = true): void {
    if (LIBRARY.length === 0) return;
    current = ((index % LIBRARY.length) + LIBRARY.length) % LIBRARY.length;
    const entry = LIBRARY[current];

    if (!engine) {
      pendingStyle = null;
      pendingSeek = null;
      titleMarquee.set(entry.song.meta.title);
      subtitleMarquee.set('Press play');
      updateBands(entry.song.meta.style);
      root.dataset.style = entry.song.meta.style;
      dial.select(current, false);
      jukebox.setCurrent(current);
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
    if (wasPlaying && resume) engine.play();
    updatePlayButton();
    jukebox.setCurrent(current);
  }

  function shareStyle(): StyleId {
    return engine?.style ?? pendingStyle ?? songStyle();
  }

  function applyShareLink(link: ShareLink): void {
    if (link.kind === 'song') {
      const index = LIBRARY.findIndex((entry) => entry.id === link.song);
      if (index < 0) return;
      playlistView.at = null;
      if (!visible().includes(index)) clearFilters();
      playlistView.selectView('radio');
      if (engine) {
        loadSong(index);
        if (link.style) selectBand(STYLES.indexOf(link.style));
        if (link.t !== null) engine.seek(link.t);
      } else {
        loadSong(index);
        pendingStyle = link.style;
        pendingSeek = link.t;
        if (pendingStyle) {
          updateBands(pendingStyle);
          root.dataset.style = pendingStyle;
          subtitleMarquee.set(`Press play · ${STYLE_DEFS[pendingStyle].name}`);
        }
      }
      updatePlayButton();
      return;
    }

    playlistView.selectView('playlist');
    playlistView.showIncoming(link.entries);
  }

  function consumeHash(): void {
    const link = takeHash(LIBRARY.map((entry) => entry.id));
    if (link) applyShareLink(link);
  }

  function handleEnded(): void {
    const at = playlistView.at;
    if (at !== null) {
      const n = nextInPlaylist(at, playlistView.entries.length, settings.repeat, playlistView.loop);
      if (n < 0) {
        playlistView.stop();
        updatePlayButton();
        return;
      }
      playEntry(n);
      return;
    }
    loadSong(nextAfterEnd(current, visible(), settings.repeat));
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
    setStylePanel(false);
  }

  function selectCategory(filter: CategoryFilter): void {
    category = filter;
    save(CATEGORY_KEY, filter);
    for (let index = 0; index < CATEGORY_FILTERS.length; index += 1) {
      presetButtons[index].setAttribute(
        'aria-checked',
        String(CATEGORY_FILTERS[index] === filter),
      );
    }
    if (styleFilter !== 'all' && !stylesIn(libraryCategories, libraryStyles, category).includes(styleFilter)) {
      styleFilter = 'all';
      save(STYLE_FILTER_KEY, styleFilter);
    }
    applyFilters();
  }

  function clearFilters(): void {
    styleFilter = 'all';
    save(STYLE_FILTER_KEY, styleFilter);
    selectCategory('all');
  }

  function cycleStyle(): void {
    styleFilter = nextStyleFilter(styleFilter, stylesIn(libraryCategories, libraryStyles, category));
    save(STYLE_FILTER_KEY, styleFilter);
    applyFilters();
  }

  // Shows the stations the preset and style filter allow, staying on the current song if it's one.
  function applyFilters(): void {
    playlistView.stop();
    updateStyleCycle();
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
    const at = playlistView.at;
    if (at !== null) {
      const p = prevInPlaylist(at, playlistView.entries.length);
      if (p >= 0) playEntry(p);
      return;
    }
    loadSong(stepStation(visible(), current, -1));
  }

  function next(): void {
    if (!ensureEngine()) return;
    const at = playlistView.at;
    if (at !== null) {
      const n = nextInPlaylist(at, playlistView.entries.length, false, true);
      if (n >= 0) playEntry(n);
      return;
    }
    loadSong(stepStation(visible(), current, 1));
  }

  function playEntry(at: number): void {
    const item = playlistView.entries[at];
    if (!item) return;
    const index = LIBRARY.findIndex((entry) => entry.id === item.song);
    if (index < 0) return;
    startSong(index, item.style, at);
  }

  /** Plays a library song from the top in a style; `at` is its playlist entry, or null to leave the playlist. */
  function startSong(index: number, style: StyleId, at: number | null): void {
    if (at === null) playlistView.stop();
    if (!visible().includes(index)) clearFilters(); // before playlistAt is set
    const fresh = engine === null;
    current = index;
    jukebox.setCurrent(current);
    const active = ensureEngine();
    if (!active) return;
    // Load without resuming, so no note is booked in the song's own style before the entry's style is set.
    if (!fresh) loadSong(index, false);
    const changed = lastStyle !== null && lastStyle !== style;
    if (at !== null) playlistView.at = at;
    active.setStyle(style);
    root.dataset.style = style;
    if (changed && !fresh) showBanner(style);
    lastStyle = style;
    updateReadout(style);
    updateBands(style);
    dial.select(current, false);
    active.play();
    updatePlayButton();
  }

  // Tuning to a station keeps the play state: it plays on if music was playing, stays stopped if not.
  const dial = createDial(dialEl, LIBRARY, (index) => {
    playlistView.stop();
    loadSong(index);
    updatePlayButton();
  });

  playButton.addEventListener('click', togglePlay);
  prevButton.addEventListener('click', previous);
  nextButton.addEventListener('click', next);

  const noteInteraction = (): void => {
    lastInteraction = performance.now();
  };
  document.addEventListener('pointerdown', noteInteraction, true);
  document.addEventListener('keydown', noteInteraction, true);

  styleToggle.addEventListener('click', () => {
    const open = !bandsEl.classList.contains('open');
    setStylePanel(open);
    if (open) bandButtons.find((button) => button.getAttribute('aria-checked') === 'true')?.focus();
  });
  document.addEventListener('pointerdown', (event) => {
    const target = event.target as Node;
    if (bandsEl.classList.contains('open') && !bandsEl.contains(target) && !styleToggle.contains(target)) {
      setStylePanel(false);
    }
  });
  bandsEl.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && bandsEl.classList.contains('open')) {
      setStylePanel(false);
      styleToggle.focus();
      return;
    }
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

  settings.init();

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
    // A key while the screensaver is up only dismisses it, without also pressing a focused button.
    if (saver.visible) {
      event.preventDefault();
      saver.hide();
      updatePlayButton();
      return;
    }
    if (document.activeElement instanceof HTMLSelectElement) return;
    if (settings.infoOpen || songCard.isOpen) return;
    if (document.activeElement === seekEl || document.activeElement === settings.volumeEl) return;
    if (event.key === 'm' || event.key === 'M') {
      settings.toggleMute();
      return;
    }
    if (event.key === 'r' || event.key === 'R') {
      settings.toggleRepeat();
      return;
    }
    if (event.key === 's' || event.key === 'S') {
      saver.show();
      updatePlayButton();
      return;
    }
    if (event.key === 'p' || event.key === 'P') {
      playlistView.selectView(playlistView.view === 'playlist' ? 'radio' : 'playlist');
      return;
    }
    if (event.key === 'j' || event.key === 'J') {
      playlistView.selectView(playlistView.view === 'jukebox' ? 'radio' : 'jukebox');
      return;
    }
    if (event.key === 'c' || event.key === 'C') {
      const index = CATEGORY_FILTERS.indexOf(category);
      selectCategory(CATEGORY_FILTERS[(index + 1) % CATEGORY_FILTERS.length]);
      return;
    }
    if (event.key === 'g' || event.key === 'G') {
      cycleStyle();
      return;
    }
    if (event.key === ' ' || event.code === 'Space') {
      // Space on a focused button or field does its usual job; elsewhere it plays and pauses.
      if (event.target instanceof HTMLElement && event.target.closest('button, input, textarea, [contenteditable="true"]')) return;
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
    if (/^[1-8]$/.test(event.key)) {
      event.preventDefault();
      selectBand(Number(event.key) - 1);
    }
  });

  function updateFlash(active: Engine): void {
    let kick = false;
    if (settings.flashOn && active.style === 'techno' && active.playing && active.timeline && active.song) {
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
    const level = settings.flashOn ? step.level : 0;
    root.style.setProperty('--flash', level.toFixed(3));
  }

  function frame(): void {
    if (
      shouldStartSaver(
        performance.now() - lastInteraction,
        settings.saverMinutes,
        engine?.playing ?? false,
        saver.visible || settings.infoOpen || songCard.isOpen,
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

  playlistView.init();
  jukebox.init();

  if (LIBRARY.length === 0) {
    titleMarquee.set('Drumline Radio');
    subtitleMarquee.set('No songs found');
    return;
  }

  updateStyleCycle();
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
  window.addEventListener('hashchange', consumeHash);
  consumeHash();
  requestAnimationFrame(frame);
}
