import type { LibraryEntry } from '../music/library';
import { nearestStation, stationLabel } from './view';

export interface Dial {
  select(index: number, smooth: boolean): void;
  tuning(): boolean;
}

const SNAP_DELAY = 160;

export function createDial(
  el: HTMLElement,
  songs: LibraryEntry[],
  onTune: (index: number) => void,
): Dial {
  el.textContent = '';

  const track = document.createElement('div');
  track.className = 'dial-track';
  const scale = document.createElement('div');
  scale.className = 'dial-scale';
  scale.setAttribute('aria-hidden', 'true');
  track.append(scale);

  const stations: HTMLButtonElement[] = [];
  let previousSource: string | null = null;

  for (let index = 0; index < songs.length; index += 1) {
    const entry = songs[index];
    const station = document.createElement('button');
    station.type = 'button';
    station.className = 'station';
    station.setAttribute('aria-label', `${entry.song.meta.title}, station ${stationLabel(index)}`);

    if (entry.song.meta.source !== previousSource) {
      const caption = document.createElement('span');
      caption.className = 'station-caption';
      caption.textContent = entry.song.meta.source === 'public-domain' ? 'Classics' : 'Originals';
      station.append(caption);
      previousSource = entry.song.meta.source;
    }

    const frequency = document.createElement('span');
    frequency.className = 'station-freq';
    frequency.textContent = stationLabel(index);
    const title = document.createElement('span');
    title.className = 'station-title';
    title.textContent = entry.song.meta.title;
    station.append(frequency, title);

    station.addEventListener('click', () => {
      if (performance.now() < suppressClickUntil) return;
      select(index, true);
      onTune(index);
    });

    track.append(station);
    stations.push(station);
  }

  el.append(track);

  let current = 0;
  let suppressUntil = 0;
  let suppressClickUntil = 0;
  let snapTimer = 0;
  let userScrolling = false;
  let dragging = false;
  let dragStartX = 0;
  let dragStartScroll = 0;
  let draggedDistance = 0;

  const needleX = (): number => el.clientWidth / 2;

  const stationCenters = (): number[] => {
    const rect = el.getBoundingClientRect();
    return stations.map((station) => {
      const stationRect = station.getBoundingClientRect();
      return stationRect.left - rect.left + stationRect.width / 2;
    });
  };

  const offsetFor = (index: number): number => {
    const station = stations[index];
    if (!station) return 0;
    return station.offsetLeft + station.offsetWidth / 2 - el.clientWidth / 2;
  };

  const updateActive = (): void => {
    for (let index = 0; index < stations.length; index += 1) {
      stations[index].classList.toggle('active', index === current);
    }
  };

  const select = (index: number, smooth: boolean): void => {
    if (index < 0 || index >= stations.length) return;
    current = index;
    updateActive();
    const left = offsetFor(index);
    suppressUntil = performance.now() + (smooth ? 500 : 50);
    if (smooth) el.scrollTo({ left, behavior: 'smooth' });
    else el.scrollLeft = left;
  };

  el.addEventListener(
    'scroll',
    () => {
      userScrolling = true;
      window.clearTimeout(snapTimer);
      snapTimer = window.setTimeout(() => {
        userScrolling = false;
        if (performance.now() < suppressUntil) return;
        const index = nearestStation(stationCenters(), needleX());
        if (index < 0) return;
        const changed = index !== current;
        select(index, true);
        if (changed) onTune(index);
      }, SNAP_DELAY);
    },
    { passive: true },
  );

  el.addEventListener(
    'wheel',
    (event) => {
      if (event.deltaY === 0) return;
      event.preventDefault();
      suppressUntil = 0;
      el.scrollLeft += event.deltaY;
    },
    { passive: false },
  );

  el.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'mouse') return;
    dragging = true;
    draggedDistance = 0;
    dragStartX = event.clientX;
    dragStartScroll = el.scrollLeft;
    suppressUntil = 0;
    el.setPointerCapture(event.pointerId);
  });

  el.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const delta = event.clientX - dragStartX;
    draggedDistance = Math.max(draggedDistance, Math.abs(delta));
    el.scrollLeft = dragStartScroll - delta;
  });

  const endDrag = (event: PointerEvent): void => {
    if (!dragging) return;
    dragging = false;
    if (draggedDistance > 4) suppressClickUntil = performance.now() + 120;
    if (el.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId);
  };
  el.addEventListener('pointerup', endDrag);
  el.addEventListener('pointercancel', endDrag);

  el.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    event.stopPropagation();
    if (stations.length === 0) return;
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const next = (current + delta + stations.length) % stations.length;
    select(next, true);
    onTune(next);
  });

  // Station spacing changes with the screen width, so keep the current station under the needle.
  new ResizeObserver(() => select(current, false)).observe(el);

  return {
    select,
    tuning(): boolean {
      if (!userScrolling) return false;
      const centers = stationCenters();
      const index = nearestStation(centers, needleX());
      if (index < 0) return false;
      return Math.abs(centers[index] - needleX()) > 24;
    },
  };
}
