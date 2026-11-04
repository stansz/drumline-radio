import { createDial } from './dial';
import { Engine } from './engine';
import { LIBRARY, LIBRARY_ERRORS } from './library';
import { createMeters, SEGMENTS } from './meters';
import { STYLES } from './roles';
import type { StyleId } from './roles';
import { createScore } from './score';
import { STYLE_DEFS } from './styles';
import { notesBetween } from './timing';
import { formatTime, parseVolume, prevAction, scrubTarget, volumeGain } from './view';

const VOLUME_KEY = 'drumline-radio-volume';
const MUTED_KEY = 'drumline-radio-muted';

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
  const metersCanvas = required<HTMLCanvasElement>('#meters');
  const muteButton = required<HTMLButtonElement>('#mute');
  const volumeEl = required<HTMLInputElement>('#volume');
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
  const root = document.documentElement;

  const score = createScore(scoreCanvas);
  const meters = createMeters(metersCanvas);

  let engine: Engine | null = null;
  let current = 0;
  let lastStyle: StyleId | null = null;
  let bannerTimer = 0;
  let draggingSeek = false;
  // Dragging the score scrubs: the score follows the finger and the song seeks on release.
  let scrub: { pointer: number; x: number; start: number; target: number; moved: boolean } | null = null;

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

  function songStyle(): StyleId {
    return LIBRARY[current]?.song.meta.style ?? 'synthwave';
  }

  function updateReadout(style: StyleId): void {
    const entry = LIBRARY[current];
    if (!entry) return;
    const song = entry.song;
    titleEl.textContent = song.meta.title;
    const name = STYLE_DEFS[style].name;
    const remix = style !== song.meta.style ? ' (remix)' : '';
    subtitleEl.textContent = `${song.meta.composer} · ${song.meta.year} · ${name}${remix}`;
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
      titleEl.textContent = entry.song.meta.title;
      subtitleEl.textContent = 'Press play';
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
    loadSong(current + 1);
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
    loadSong(current - 1);
  }

  function next(): void {
    if (!ensureEngine()) return;
    loadSong(current + 1);
  }

  // Tuning to a station always plays it, like a radio.
  const dial = createDial(dialEl, LIBRARY, (index) => {
    const active = ensureEngine();
    loadSong(index);
    if (active && !active.playing) active.play();
    updatePlayButton();
  });

  playButton.addEventListener('click', togglePlay);
  prevButton.addEventListener('click', previous);
  nextButton.addEventListener('click', next);

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

  applyVolume();
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
    if (document.activeElement === seekEl || document.activeElement === volumeEl) return;
    if (event.key === 'm' || event.key === 'M') {
      toggleMute();
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
    if (/^[1-4]$/.test(event.key)) {
      event.preventDefault();
      selectBand(Number(event.key) - 1);
    }
  });

  function updateFlash(active: Engine): void {
    let flash = 0;
    if (active.style === 'techno' && active.playing && active.timeline && active.song) {
      const position = active.position;
      for (const note of notesBetween(active.timeline, position - 0.06, position + 0.0001)) {
        const track = active.song.tracks[note.track];
        if (track && track.role === 'drums' && note.pitches.includes(36)) {
          flash = 0.12;
          break;
        }
      }
    }
    root.style.setProperty('--flash', String(flash));
  }

  function frame(): void {
    const active = engine;
    const fallback = STYLE_DEFS[songStyle()];
    if (active) {
      const style = STYLE_DEFS[active.style];
      const position = scrub?.moved ? scrub.target : active.position;
      score.draw(active.timeline, position, style, dial.tuning());
      meters.draw(active.levels(), style.lanes[0] ?? '#ffffff');
      const duration = active.duration;
      if (!draggingSeek && duration > 0) {
        seekEl.value = String(Math.round((position / duration) * 1000));
      }
      seekEl.style.setProperty('--progress', `${(Number(seekEl.value) / 10).toFixed(1)}%`);
      elapsedEl.textContent = formatTime(position);
      totalEl.textContent = formatTime(duration);
      updateFlash(active);
      updatePlayButton();
    } else {
      score.draw(null, 0, fallback, dial.tuning());
      meters.draw([0, 0], fallback.lanes[0] ?? '#ffffff');
    }
    requestAnimationFrame(frame);
  }

  if (LIBRARY.length === 0) {
    titleEl.textContent = 'Drumline Radio';
    subtitleEl.textContent = 'No songs found';
    return;
  }

  const first = LIBRARY[0];
  titleEl.textContent = first.song.meta.title;
  subtitleEl.textContent = 'Press play';
  root.dataset.style = first.song.meta.style;
  updateBands(first.song.meta.style);
  dial.select(0, false);
  totalEl.textContent = formatTime(0);
  updatePlayButton();
  requestAnimationFrame(frame);
}
