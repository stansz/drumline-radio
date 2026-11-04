export interface Meters {
  draw(levels: [number, number], accent: string): void;
}

const SEGMENTS = 16;
const SEGMENT_WIDTH = 5;
const SEGMENT_GAP = 1.5;
const SEGMENT_HEIGHT = 9;
const LEFT = 14;
const ROW_Y = [8, 28];

export function createMeters(canvas: HTMLCanvasElement): Meters {
  const ctx = canvas.getContext('2d');
  const peaks = [0, 0];
  const peakAt = [0, 0];

  return {
    draw(levels: [number, number], accent: string): void {
      if (!ctx) return;
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);
      const now = performance.now() / 1000;

      for (let row = 0; row < 2; row += 1) {
        const level = levels[row] ?? 0;
        const lit = Math.round(Math.min(1, level * 3) * SEGMENTS);

        if (lit >= peaks[row]) {
          peaks[row] = lit;
          peakAt[row] = now;
        } else if (now - peakAt[row] > 0.6) {
          peaks[row] = lit;
        }

        ctx.font = '14px VT323, monospace';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = accent;
        ctx.globalAlpha = 1;
        ctx.fillText(row === 0 ? 'L' : 'R', 2, ROW_Y[row] + SEGMENT_HEIGHT / 2);

        for (let segment = 0; segment < SEGMENTS; segment += 1) {
          const colour = segment < 11 ? accent : segment < 14 ? '#ffd84f' : '#ff4f4f';
          const shown = segment < lit || segment === peaks[row];
          ctx.globalAlpha = shown ? 1 : 0.15;
          ctx.fillStyle = colour;
          const x = LEFT + segment * (SEGMENT_WIDTH + SEGMENT_GAP);
          ctx.fillRect(x, ROW_Y[row], SEGMENT_WIDTH, SEGMENT_HEIGHT);
        }
      }

      ctx.globalAlpha = 1;
    },
  };
}
