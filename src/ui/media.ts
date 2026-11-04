import { positionDrifted } from './view';

export interface MediaHandlers {
  play(): void;
  pause(): void;
  next(): void;
  previous(): void;
  seek(seconds: number): void;
}

export interface MediaState {
  title: string;
  artist: string;
  playing: boolean;
  position: number;
  duration: number;
}

const SEEK_STEP = 10;

/**
 * Shows the current song in the phone's media controls and lock screen. `update` is cheap to call
 * often: it only pushes the parts of the state that changed.
 */
export function createMediaSession(
  handlers: MediaHandlers,
): { update(state: MediaState): void } {
  if (!('mediaSession' in navigator)) return { update() {} };
  const session = navigator.mediaSession;

  // The last state passed to update(), used by the seek-by actions.
  let latestPosition = 0;
  let latestDuration = 0;

  const setHandler = (action: MediaSessionAction, handler: MediaSessionActionHandler): void => {
    try {
      session.setActionHandler(action, handler);
    } catch {
      // Some actions are not supported on every browser.
    }
  };

  const seekBy = (delta: number): void => {
    const target = Math.min(Math.max(latestPosition + delta, 0), latestDuration);
    handlers.seek(target);
  };

  setHandler('play', () => handlers.play());
  setHandler('pause', () => handlers.pause());
  setHandler('nexttrack', () => handlers.next());
  setHandler('previoustrack', () => handlers.previous());
  setHandler('seekto', (details) => {
    if (details.seekTime !== undefined) handlers.seek(details.seekTime);
  });
  setHandler('seekbackward', () => seekBy(-SEEK_STEP));
  setHandler('seekforward', () => seekBy(SEEK_STEP));

  let lastTitle: string | null = null;
  let lastArtist: string | null = null;
  let lastPlaying: boolean | null = null;
  let lastPosition = 0;
  let lastAt = 0;
  let lastDuration = -1;

  return {
    update(state: MediaState): void {
      latestPosition = state.position;
      latestDuration = state.duration;

      if (state.title !== lastTitle || state.artist !== lastArtist) {
        lastTitle = state.title;
        lastArtist = state.artist;
        session.metadata = new MediaMetadata({
          title: state.title,
          artist: state.artist,
          album: 'Drumline Radio',
          artwork: [
            {
              src: `${import.meta.env.BASE_URL}icons/icon-192.png`,
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: `${import.meta.env.BASE_URL}icons/icon-512.png`,
              sizes: '512x512',
              type: 'image/png',
            },
          ],
        });
      }

      const playingChanged = state.playing !== lastPlaying;
      if (playingChanged) {
        lastPlaying = state.playing;
        session.playbackState = state.playing ? 'playing' : 'paused';
      }

      const durationChanged = state.duration !== lastDuration;
      const now = performance.now() / 1000;
      if (
        state.duration > 0 &&
        (playingChanged ||
          durationChanged ||
          positionDrifted(lastPosition, lastAt, now, state.position, state.playing))
      ) {
        try {
          session.setPositionState({
            duration: state.duration,
            position: Math.min(state.position, state.duration),
            playbackRate: 1,
          });
        } catch {
          // Some browsers reject a position state they cannot represent.
        }
        lastPosition = state.position;
        lastAt = now;
        lastDuration = state.duration;
      }
    },
  };
}
