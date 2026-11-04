import { marqueeTiming } from './view';

/**
 * Scrolls an element's text gently back and forth when it is too long to fit.
 * `refit()` re-measures after a resize or a font load.
 */
export function createMarquee(el: HTMLElement): { set(text: string): void; refit(): void } {
  el.textContent = '';
  const inner = document.createElement('span');
  inner.className = 'marquee-inner';
  el.append(inner);

  function refit(): void {
    const overflow = inner.scrollWidth - el.clientWidth;
    if (overflow > 1) {
      const { shift, seconds } = marqueeTiming(overflow);
      el.classList.add('scrolling');
      el.style.setProperty('--marquee-shift', `${shift}px`);
      el.style.setProperty('--marquee-time', `${seconds}s`);
    } else {
      el.classList.remove('scrolling');
    }
  }

  function set(text: string): void {
    if (inner.textContent === text) return;
    inner.textContent = text;
    refit();
  }

  return { set, refit };
}
