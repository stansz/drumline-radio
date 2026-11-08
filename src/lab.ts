// The instrument page (instruments.html): every bank instrument as a card that plays a short phrase.
import './ui/style.css';
import './ui/lab.css';
import { Engine } from './audio/engine';
import { STYLE_DEFS } from './audio/styles';
import { STYLES, type StyleId } from './music/roles';
import { parseSong } from './music/song';
import { auditions, auditionSongText, defaultStyle, type Audition, type Family } from './ui/audition';
import { required } from './ui/dom';

const FAMILY_NAMES: Record<Family, string> = {
  leads: 'Leads',
  keys: 'Keys and plucks',
  pads: 'Pads',
  basses: 'Basses',
  kits: 'Drum kits',
};

const AUTO = 'auto';
const root = document.documentElement;
const styleSelect = required<HTMLSelectElement>('#lab-style');
const filterInput = required<HTMLInputElement>('#lab-filter');
const familiesEl = required<HTMLDivElement>('#lab-families');

let engine: Engine | null = null;
let playingCard: HTMLButtonElement | null = null;

styleSelect.append(new Option('Auto: a style that uses it', AUTO));
for (const id of STYLES) styleSelect.append(new Option(STYLE_DEFS[id].name, id));

function styleFor(audition: Audition): StyleId {
  return styleSelect.value === AUTO ? defaultStyle(audition) : (styleSelect.value as StyleId);
}

function setPlaying(card: HTMLButtonElement | null): void {
  playingCard?.classList.remove('playing');
  playingCard?.setAttribute('aria-pressed', 'false');
  playingCard = card;
  card?.classList.add('playing');
  card?.setAttribute('aria-pressed', 'true');
}

function play(audition: Audition, card: HTMLButtonElement): void {
  if (playingCard === card) {
    engine?.pause();
    setPlaying(null);
    return;
  }
  const style = styleFor(audition);
  const parsed = parseSong(auditionSongText(audition, style));
  if (!parsed.ok) {
    console.error(parsed.errors);
    return;
  }
  if (!engine) {
    engine = new Engine(new AudioContext());
    engine.onEnded = () => setPlaying(null);
  }
  engine.load(parsed.song);
  engine.play();
  root.dataset.style = style;
  setPlaying(card);
}

function card(audition: Audition): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'lab-card';
  button.setAttribute('aria-pressed', 'false');
  button.dataset.search = [audition.name, audition.id, ...audition.techniques].join(' ').toLowerCase();

  const name = document.createElement('span');
  name.className = 'lab-name';
  name.textContent = audition.name;
  const id = document.createElement('code');
  id.className = 'lab-id';
  id.textContent = `bank:${audition.id}`;
  const tags = document.createElement('span');
  tags.className = 'lab-tags';
  for (const technique of audition.techniques) {
    const tag = document.createElement('span');
    tag.className = 'lab-tag';
    tag.textContent = technique;
    tags.append(tag);
  }
  const uses = document.createElement('span');
  uses.className = 'lab-uses';
  uses.textContent =
    audition.uses.length === 0
      ? 'Not in a style yet'
      : audition.uses
          .map((use) => {
            const where = use.roles.length > 0 ? use.roles.join(', ') : `inst=${use.local}`;
            return `${STYLE_DEFS[use.style].name}: ${where}`;
          })
          .join(' · ');

  button.append(name, id, tags, uses);
  button.addEventListener('click', () => play(audition, button));
  return button;
}

const all = auditions();
for (const family of Object.keys(FAMILY_NAMES) as Family[]) {
  const section = document.createElement('section');
  section.className = 'lab-family';
  const heading = document.createElement('h2');
  heading.textContent = FAMILY_NAMES[family];
  const grid = document.createElement('div');
  grid.className = 'lab-grid';
  for (const audition of all.filter((item) => item.family === family)) grid.append(card(audition));
  section.append(heading, grid);
  familiesEl.append(section);
}

filterInput.addEventListener('input', () => {
  const query = filterInput.value.trim().toLowerCase();
  for (const section of familiesEl.querySelectorAll<HTMLElement>('.lab-family')) {
    let shown = 0;
    for (const item of section.querySelectorAll<HTMLButtonElement>('.lab-card')) {
      const match = query === '' || (item.dataset.search ?? '').includes(query);
      item.hidden = !match;
      if (match) shown += 1;
    }
    section.hidden = shown === 0;
  }
});
