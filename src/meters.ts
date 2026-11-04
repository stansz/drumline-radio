export interface Meters {
  draw(levels: [number, number], accent: string): void;
}

/** Shared with the volume row in style.css, so all three rows line up segment for segment. */
export const SEGMENTS = 16;
const SEGMENT_GAP = 2;

export function createMeters(canvas: HTMLCanvasElement): Meters {
  const ctx = canvas.getContext('2d');
  const peaks = [0, 0];
  const peakAt = [0, 0];

  return {
    draw(levels: [number, number], accent: string): void {
      if (!ctx) return;
      const ratio = window.devicePixelRatio || 1;
      const width = Math.round(canvas.clientWidth * ratio);
      const height = Math.round(canvas.clientHeight * ratio);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      ctx.clearRect(0, 0, width, height);
      const now = performance.now() / 1000;

      // Two rows with a gap between them; the gap matches the grid row gap in style.css.
      const rowHeight = Math.round((height * 5) / 13);
      const rowY = [0, height - rowHeight];
      const period = width / SEGMENTS;
      const segmentWidth = period - SEGMENT_GAP * ratio;

      for (let row = 0; row < 2; row += 1) {
        const level = levels[row] ?? 0;
        const lit = Math.round(Math.min(1, level * 3) * SEGMENTS);

        if (lit >= peaks[row]) {
          peaks[row] = lit;
          peakAt[row] = now;
        } else if (now - peakAt[row] > 0.6) {
          peaks[row] = lit;
        }

        for (let segment = 0; segment < SEGMENTS; segment += 1) {
          const colour = segment < 11 ? accent : segment < 14 ? '#ffd84f' : '#ff4f4f';
          const shown = segment < lit || segment === peaks[row] - 1;
          ctx.globalAlpha = shown ? 1 : 0.15;
          ctx.fillStyle = colour;
          ctx.fillRect(Math.round(segment * period), rowY[row], Math.round(segmentWidth), rowHeight);
        }
      }

      ctx.globalAlpha = 1;
    },
  };
}
