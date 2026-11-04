import type { StyleDef } from '../audio/styles';
import { resolvePatch } from '../audio/styles';
import { tickToSeconds, notesBetween } from '../music/timing';
import type { Timeline } from '../music/timing';
import { laneLayout, noteHeight, noteY } from './view';

export interface Score {
  draw(timeline: Timeline | null, position: number, style: StyleDef, tuning: boolean): void;
}

const PAST_SECONDS = 2;
const FUTURE_SECONDS = 6;
const PLAYHEAD_FRACTION = 0.25;

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

export function createScore(canvas: HTMLCanvasElement): Score {
  const maybeContext = canvas.getContext('2d');

  return {
    draw(timeline, position, style, tuning): void {
      const ctx = maybeContext;
      if (!ctx) return;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width <= 0 || height <= 0) return;

      const ratio = Math.max(1, window.devicePixelRatio || 1);
      const pixelWidth = Math.round(width * ratio);
      const pixelHeight = Math.round(height * ratio);
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const playheadX = width * PLAYHEAD_FRACTION;
      const pxPerSecond = (width * (1 - PLAYHEAD_FRACTION)) / FUTURE_SECONDS;
      const xAt = (seconds: number): number => playheadX + (seconds - position) * pxPerSecond;

      if (timeline) {
        const song = timeline.song;

        for (const bar of song.bars) {
          const start = tickToSeconds(song, bar.startTick);
          if (start < position - PAST_SECONDS || start > position + FUTURE_SECONDS) continue;
          const barX = Math.round(xAt(start)) + 0.5;
          ctx.strokeStyle =
            bar.number % 4 === 0 ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.08)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(barX, 0);
          ctx.lineTo(barX, height);
          ctx.stroke();
        }

        const lanes = laneLayout(song, height);
        ctx.textBaseline = 'top';
        ctx.font = '11px system-ui, sans-serif';
        for (const lane of lanes) {
          if (lane.track > 0) {
            ctx.strokeStyle = 'rgba(255,255,255,0.06)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, Math.round(lane.top) + 0.5);
            ctx.lineTo(width, Math.round(lane.top) + 0.5);
            ctx.stroke();
          }
          const track = song.tracks[lane.track];
          if (!track) continue;
          const patch = resolvePatch(style, track);
          ctx.globalAlpha = 0.5;
          ctx.fillStyle = '#ffffff';
          ctx.fillText(patch.name, 8, lane.top + 4);
        }

        const notes = notesBetween(
          timeline,
          position - PAST_SECONDS - 8,
          position + FUTURE_SECONDS,
        );
        for (const note of notes) {
          const startX = xAt(note.start);
          const endX = xAt(note.start + note.duration);
          if (endX < 0 || startX > width) continue;
          const lane = lanes[note.track];
          if (!lane) continue;
          const colour = style.lanes[note.track % style.lanes.length];
          const sounding = note.start <= position && position < note.start + note.duration;
          const barHeight = noteHeight(lane);
          const barWidth = Math.max(2, note.duration * pxPerSecond);

          ctx.fillStyle = colour;
          ctx.globalAlpha = sounding ? 1 : 0.45;
          ctx.shadowColor = sounding ? colour : 'transparent';
          ctx.shadowBlur = sounding ? 12 : 0;
          for (const pitch of note.pitches) {
            roundedRect(ctx, startX, noteY(lane, pitch), barWidth, barHeight, 2);
            ctx.fill();
          }
        }

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
      }

      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillRect(playheadX - 1, 0, 2, height);

      if (tuning) {
        ctx.fillStyle = 'rgba(140,140,150,0.5)';
        for (let dot = 0; dot < 1500; dot += 1) {
          ctx.fillRect(Math.random() * width, Math.random() * height, 2, 2);
        }
      }
    },
  };
}
