import { STYLE_DEFS } from '../audio/styles';
import { renderSong } from '../audio/engine';
import { encodeWav } from '../audio/wav';
import { buildTimeline } from '../music/timing';
import type { LibraryEntry } from '../music/library';
import type { StyleId } from '../music/roles';
import { categoryLabel, songFacts } from './view';
import { formatShareTime, songHash } from './share';
import { linkUrl, sendLink } from './links';
import { required } from './dom';

export interface SongCardDeps {
  entry(): LibraryEntry | undefined;
  position(): number | null;
  style(): StyleId;
}

export interface SongCard {
  open(): void;
  readonly isOpen: boolean;
}

/** The song card: the facts about the current song and the links to share it. */
export function createSongCard(deps: SongCardDeps): SongCard {
  const readoutEl = required<HTMLElement>('.readout');
  const songCard = required<HTMLDialogElement>('#song-card');
  const cardTitle = required<HTMLElement>('#card-title');
  const cardByline = required<HTMLElement>('#card-byline');
  const cardFacts = required<HTMLElement>('#card-facts');
  const cardAbout = required<HTMLElement>('#card-about');
  const cardShare = required<HTMLButtonElement>('#card-link');
  const cardShareAt = required<HTMLButtonElement>('#card-link-at');
  const cardSave = required<HTMLButtonElement>('#card-save');
  const cardClose = required<HTMLButtonElement>('#card-close');

  // The position the song card's "Share from" button will use.
  let shareAtPosition: number | null = null;
  let saving = false;

  function openSongCard(): void {
    const entry = deps.entry();
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
    const position = deps.position();
    if (position !== null && position >= 5) {
      shareAtPosition = position;
      cardShareAt.hidden = false;
      cardShareAt.textContent = `Share from ${formatShareTime(shareAtPosition)}`;
    } else {
      shareAtPosition = null;
      cardShareAt.hidden = true;
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

  cardShare.addEventListener('click', () => {
    const entry = deps.entry();
    if (!entry) return;
    void sendLink(
      linkUrl(songHash(entry.id, deps.style(), null)),
      entry.song.meta.title,
      cardShare,
    );
  });
  cardShareAt.addEventListener('click', () => {
    const entry = deps.entry();
    if (!entry || shareAtPosition === null) return;
    void sendLink(
      linkUrl(songHash(entry.id, deps.style(), shareAtPosition)),
      entry.song.meta.title,
      cardShareAt,
    );
  });
  cardSave.addEventListener('click', () => {
    if (saving) return;
    const entry = deps.entry();
    if (!entry) return;
    const style = deps.style();
    saving = true;
    cardSave.disabled = true;
    cardSave.textContent = 'Rendering 0%';
    const restore = (): void => {
      cardSave.textContent = 'Save as WAV';
      cardSave.disabled = false;
      saving = false;
    };
    void renderSong(entry.song, style, (fraction) => {
      cardSave.textContent = `Rendering ${Math.round(fraction * 100)}%`;
    })
      .then((buffer) => {
        const wav = encodeWav(
          [buffer.getChannelData(0), buffer.getChannelData(1)],
          buffer.sampleRate,
        );
        const url = URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }));
        const anchor = document.createElement('a');
        anchor.href = url;
        // Characters a file system won't allow in a file name.
        const title = entry.song.meta.title.replace(/[\\/:*?"<>|]/g, '');
        anchor.download = `${title} (${STYLE_DEFS[style].name}).wav`;
        document.body.append(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
        restore();
      })
      .catch((error: unknown) => {
        console.error(error);
        cardSave.textContent = "Couldn't save";
        setTimeout(restore, 3_000);
      });
  });

  return {
    open(): void {
      openSongCard();
    },
    get isOpen(): boolean {
      return songCard.open;
    },
  };
}
