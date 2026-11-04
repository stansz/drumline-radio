import { driftPosition } from './view';

export interface Saver {
  show(): void;
  hide(): void;
  readonly visible: boolean;
  update(title: string, time: string): void;
}

const DRIFT_MS = 20000;

/** The black screensaver overlay: a slowly drifting title and time, tapped to exit. */
export function createSaver(
  overlay: HTMLElement,
  box: HTMLElement,
  titleEl: HTMLElement,
  timeEl: HTMLElement,
  onExit: () => void,
): Saver {
  let driftTimer = 0;
  let visible = false;
  let lastTitle = '';
  let lastTime = '';

  const drift = (): void => {
    const at = driftPosition(
      Math.random(),
      Math.random(),
      window.innerWidth,
      window.innerHeight,
      box.offsetWidth,
      box.offsetHeight,
    );
    box.style.transform = `translate(${at.x}px, ${at.y}px)`;
  };

  function hide(): void {
    overlay.hidden = true;
    window.clearInterval(driftTimer);
    driftTimer = 0;
    visible = false;
  }

  // Exit on click, not pointerdown: the overlay stays up for the whole tap, so the tap can't land
  // on the player underneath.
  overlay.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    hide();
    onExit();
  });

  return {
    show(): void {
      overlay.hidden = false;
      visible = true;
      drift();
      window.clearInterval(driftTimer);
      driftTimer = window.setInterval(drift, DRIFT_MS);
    },
    hide,
    get visible(): boolean {
      return visible;
    },
    update(title: string, time: string): void {
      if (title !== lastTitle) {
        lastTitle = title;
        titleEl.textContent = title;
      }
      if (time !== lastTime) {
        lastTime = time;
        timeEl.textContent = time;
      }
    },
  };
}
