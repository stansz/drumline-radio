import { STYLE_DEFS } from '../audio/styles';
import type { StyleFilter } from './view';

/**
 * Turns a style-filter button into one that opens a small "Filter" menu under it: All styles, then
 * each style that has songs. Picking one calls `pick` and closes the menu; so do a click outside and
 * Escape. `options` is read each time the menu opens, so it follows the current preset.
 */
export function attachFilterMenu(
  button: HTMLButtonElement,
  options: () => StyleFilter[],
  current: () => StyleFilter,
  pick: (filter: StyleFilter) => void,
): void {
  const menu = document.createElement('div');
  menu.className = 'filter-menu';
  menu.setAttribute('role', 'dialog');
  menu.setAttribute('aria-label', 'Filter');
  menu.hidden = true;
  document.body.append(menu);
  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute('aria-expanded', 'false');

  const close = (): void => {
    if (menu.hidden) return;
    menu.hidden = true;
    button.setAttribute('aria-expanded', 'false');
  };

  const open = (): void => {
    menu.textContent = '';
    const heading = document.createElement('div');
    heading.className = 'filter-menu-title';
    heading.textContent = 'Filter';
    menu.append(heading);
    const list = document.createElement('div');
    list.setAttribute('role', 'radiogroup');
    list.setAttribute('aria-label', 'Style filter');
    for (const filter of options()) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'filter-menu-item';
      item.setAttribute('role', 'radio');
      item.dataset.style = filter;
      item.textContent = filter === 'all' ? 'All styles' : STYLE_DEFS[filter].name;
      item.setAttribute('aria-checked', String(filter === current()));
      item.addEventListener('click', () => {
        close();
        pick(filter);
        button.focus();
      });
      list.append(item);
    }
    menu.append(list);
    menu.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    // Under the button, kept on screen.
    const rect = button.getBoundingClientRect();
    const width = menu.offsetWidth;
    const left = Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8);
    const below = rect.bottom + 6;
    const top = below + menu.offsetHeight > window.innerHeight - 8 ? rect.top - menu.offsetHeight - 6 : below;
    menu.style.left = `${Math.round(left)}px`;
    menu.style.top = `${Math.round(Math.max(8, top))}px`;
    menu.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
  };

  button.addEventListener('click', () => (menu.hidden ? open() : close()));
  document.addEventListener('pointerdown', (event) => {
    const target = event.target as Node;
    if (!menu.contains(target) && !button.contains(target)) close();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !menu.hidden) {
      event.stopPropagation();
      close();
      button.focus();
    }
  }, true);
  window.addEventListener('resize', close);
}
