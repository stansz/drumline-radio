import type { Engine } from '../audio/engine';
import { SEGMENTS } from './meters';
import { load, required, save } from './dom';
import {
  parseSaverMinutes,
  parseVolume,
  SAVER_OPTIONS,
  volumeGain,
} from './view';
import type { SaverMinutes } from './view';

// Set by vite.config.ts at build time.
declare const __BUILD_COMMIT__: string;
declare const __BUILD_TIME__: string;

const VOLUME_KEY = 'drumline-radio-volume';
const MUTED_KEY = 'drumline-radio-muted';
const REPEAT_KEY = 'drumline-radio-repeat';
const DIM_KEY = 'drumline-radio-dim';
const FLASH_KEY = 'drumline-radio-flash';
const SAVER_KEY = 'drumline-radio-saver';

export interface SettingsDeps {
  engine(): Engine | null;
  updatePlayButton(): void;
  showSaver(): void;
}

export interface Settings {
  outputGain(): number;
  toggleMute(): void;
  toggleRepeat(): void;
  readonly repeat: boolean;
  readonly flashOn: boolean;
  readonly saverMinutes: SaverMinutes;
  readonly infoOpen: boolean;
  volumeEl: HTMLInputElement;
  init(): void;
}

/** The saved listening settings: volume, mute, repeat, dim, flash, and the screensaver timer. */
export function createSettings(deps: SettingsDeps): Settings {
  const muteButton = required<HTMLButtonElement>('#mute');
  const volumeEl = required<HTMLInputElement>('#volume');
  const repeatButton = required<HTMLButtonElement>('#repeat');
  const dimToggle = required<HTMLButtonElement>('#dim-toggle');
  const flashToggle = required<HTMLButtonElement>('#flash-toggle');
  const saverStart = required<HTMLButtonElement>('#saver-start');
  const saverAutoEl = required<HTMLElement>('#saver-auto');
  const dimOverlay = required<HTMLElement>('#dim');
  const infoButton = required<HTMLButtonElement>('#info');
  const infoPanel = required<HTMLDialogElement>('#info-panel');
  const infoClose = required<HTMLButtonElement>('#info-close');

  let volume = parseVolume(load(VOLUME_KEY));
  let muted = load(MUTED_KEY) === '1';
  let repeat = load(REPEAT_KEY) === '1';
  let dim = load(DIM_KEY) === '1';
  let flashOn = load(FLASH_KEY) !== '0';
  let saverMinutes: SaverMinutes = parseSaverMinutes(load(SAVER_KEY));

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
    deps.engine()?.setVolume(outputGain());
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
    deps.updatePlayButton();
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

  const builtAt = new Date(__BUILD_TIME__).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  required<HTMLParagraphElement>('#build-stamp').textContent = `Build ${__BUILD_COMMIT__} · ${builtAt}`;
  infoButton.addEventListener('click', () => infoPanel.showModal());
  infoClose.addEventListener('click', () => infoPanel.close());
  dimToggle.addEventListener('click', toggleDim);
  flashToggle.setAttribute('aria-pressed', String(flashOn));
  flashToggle.addEventListener('click', toggleFlash);
  saverStart.addEventListener('click', () => {
    infoPanel.close();
    deps.showSaver();
  });

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
  repeatButton.addEventListener('click', toggleRepeat);

  return {
    outputGain,
    toggleMute,
    toggleRepeat,
    get repeat(): boolean {
      return repeat;
    },
    get flashOn(): boolean {
      return flashOn;
    },
    get saverMinutes(): SaverMinutes {
      return saverMinutes;
    },
    get infoOpen(): boolean {
      return infoPanel.open;
    },
    volumeEl,
    init(): void {
      applyVolume();
      applyRepeat();
      applyDim();
      applySaverMinutes();
    },
  };
}
