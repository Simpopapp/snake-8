// NEONVOLT 3.0 — dot-matrix display (DMD). Browser-only, no React, no assets.
// Emulates a classic plasma DMD: 128×32 logical dots sampled from text drawn
// on an offscreen canvas, so any glyph/shape renders without a font map.
// Device colors are fixed (amber plasma) — this is a display, not a palette.

export const DMD_COLS = 128;
export const DMD_ROWS = 32;

/** Amber plasma of a real DMD; palette colors are derived per table (4.0). */
const DOT_LIT: [number, number, number] = [255, 176, 78];

export interface DmdShowOptions {
  /** Priority: higher interrupts and outranks queued messages (default 5) */
  priority?: number;
  /** Duration in ms (default 1600) */
  ms?: number;
  /** Flash the whole display while shown */
  flash?: boolean;
  /** 4.0: dot color (default amber plasma; palette colors need setColor) */
  color?: DmdColor;
  /** 4.0: campaign star sweep animation while shown */
  star?: boolean;
}

export type DmdColor = "amber" | "wall" | "glowA" | "glowB" | "hot";

/** Palette colors the DMD can borrow from the current table (4.0 §4.4). */
export interface DmdPalette {
  wall: string;
  glowA: string;
  glowB: string;
  hot: string;
}

interface QueuedMessage {
  text: string;
  priority: number;
  endsAt: number;
  flash: boolean;
  color: DmdColor;
  star: boolean;
}

export interface DmdHandle {
  /** Show a prioritized message (interrupts lower-priority playback). */
  show: (text: string, opts?: DmdShowOptions) => void;
  /** Persistent score readout (right-aligned, large). */
  setScore: (score: number) => void;
  /** Persistent second line (table/objective). */
  setLine: (line: string) => void;
  /** 4.0: palette the colored dots are derived from (table identity). */
  setColor: (palette: DmdPalette) => void;
  /** Drive animations + redraw. Call every animation frame. */
  tick: (t: number) => void;
  destroy: () => void;
}

/** Maps text to the offscreen sample canvas and blits lit dots. */
export function createDmd(canvas: HTMLCanvasElement): DmdHandle {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("DMD: no 2d context");

  // offscreen sample buffer: 1 px per dot
  const sample = document.createElement("canvas");
  sample.width = DMD_COLS;
  sample.height = DMD_ROWS;
  const sctx = sample.getContext("2d", { willReadFrequently: true });
  if (!sctx) throw new Error("DMD: no sample context");

  let score = 0;
  let line = "";
  let flashUntil = 0;
  const queue: QueuedMessage[] = [];
  let destroyed = false;
  let lastLayout = "";
  let currentColor: DmdColor = "amber";

  let palette: DmdPalette | null = null;
  const hexCache = new Map<string, [number, number, number]>();
  const hexToRgb = (hex: string): [number, number, number] => {
    const cached = hexCache.get(hex);
    if (cached) return cached;
    const clean = hex.replace("#", "");
    const value =
      clean.length === 3
        ? clean
            .split("")
            .map((c) => c + c)
            .join("")
        : clean;
    const num = parseInt(value.slice(0, 6), 16);
    const rgb: [number, number, number] = [(num >> 16) & 255, (num >> 8) & 255, num & 255];
    hexCache.set(hex, rgb);
    return rgb;
  };
  const litFor = (color: DmdColor): [number, number, number] => {
    if (color === "amber" || !palette) return DOT_LIT;
    return hexToRgb(palette[color]);
  };

  const resize = (): void => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.floor(rect.width * dpr));
    const h = Math.max(1, Math.floor(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      lastLayout = "";
    }
  };

  const drawText = (text: string, x: number, y: number, size: number, align: CanvasTextAlign): void => {
    if (!text) return;
    sctx.font = `700 ${size}px "Bebas Neue", "Arial Narrow", sans-serif`;
    sctx.textAlign = align;
    sctx.textBaseline = "middle";
    sctx.fillStyle = "#fff";
    sctx.fillText(text.toUpperCase(), x, y);
  };

  /** Fills the sample buffer with the current frame's content. */
  const compose = (t: number): DmdColor => {
    sctx.clearRect(0, 0, DMD_COLS, DMD_ROWS);
    sctx.fillStyle = "#fff";
    const active = queue.length > 0 ? queue[queue.length - 1] : undefined;
    if (active) {
      if (active.flash && t < flashUntil) {
        // invert-ish flash: bright field
        sctx.globalAlpha = 0.25;
        sctx.fillRect(0, 0, DMD_COLS, DMD_ROWS);
        sctx.globalAlpha = 1;
      }
      const shown = active.text.length > 21 ? `${active.text.slice(0, 20)}…` : active.text;
      drawText(shown, DMD_COLS / 2, DMD_ROWS / 2 + 2, 22, "center");
      // thin progress underline while the message plays
      const life = Math.max(0, active.endsAt - t);
      const total = 1600;
      const frac = Math.min(1, life / Math.max(1, total));
      sctx.globalAlpha = 0.8;
      sctx.fillRect(4, DMD_ROWS - 4, (DMD_COLS - 8) * frac, 2);
      sctx.globalAlpha = 1;
      if (active.star) {
        // campaign star: bright comet sweeping the border (4.0 §4.4)
        const period = 1200;
        const p = ((t % period) / period) * 4;
        const edge = Math.floor(p);
        const along = p - edge;
        const m = 2;
        const w = DMD_COLS - m * 2;
        const h = DMD_ROWS - m * 2;
        let cx = 0;
        let cy = 0;
        if (edge === 0) {
          cx = m + w * along;
          cy = m;
        } else if (edge === 1) {
          cx = m + w;
          cy = m + h * along;
        } else if (edge === 2) {
          cx = m + w * (1 - along);
          cy = m + h;
        } else {
          cx = m;
          cy = m + h * (1 - along);
        }
        sctx.globalAlpha = 1;
        sctx.fillRect(cx - 2, cy - 2, 5, 5);
        // faint border ring so the sweep reads as a frame
        sctx.globalAlpha = 0.35;
        sctx.fillRect(m, m, w, 1);
        sctx.fillRect(m, m + h - 1, w, 1);
        sctx.fillRect(m, m, 1, h);
        sctx.fillRect(m + w - 1, m, 1, h);
        sctx.globalAlpha = 1;
      }
      return active.color;
    }
    // default: score (big, right) + line (small, marquee)
    drawText(score.toLocaleString("pt-BR"), DMD_COLS - 3, 10, 19, "right");
    if (line) {
      const fits = line.length <= 26;
      const text = fits ? line : marquee(line, t);
      drawText(text, fits ? 3 : 3, 25, 10, "left");
    }
    return "amber";
  };

  const marquee = (text: string, t: number): string => {
    const cycle = text.length + 4;
    const shift = Math.floor(t / 90) % cycle;
    const padded = `${text}   `;
    return padded.slice(shift) + padded.slice(0, shift);
  };

  const render = (t: number): void => {
    resize();
    currentColor = compose(t);
    const lit = litFor(currentColor);
    const mid: [number, number, number] = [
      Math.round(lit[0] * 0.55),
      Math.round(lit[1] * 0.55),
      Math.round(lit[2] * 0.55),
    ];
    const img = sctx.getImageData(0, 0, DMD_COLS, DMD_ROWS).data;

    const cw = canvas.width;
    const ch = canvas.height;
    ctx.fillStyle = "#0a0605";
    ctx.fillRect(0, 0, cw, ch);
    const pad = Math.min(cw, ch) * 0.06;
    const gridW = cw - pad * 2;
    const gridH = ch - pad * 2;
    const pitchX = gridW / DMD_COLS;
    const pitchY = gridH / DMD_ROWS;
    const r = Math.min(pitchX, pitchY) * 0.42;

    for (let y = 0; y < DMD_ROWS; y++) {
      for (let x = 0; x < DMD_COLS; x++) {
        const alpha = img[(y * DMD_COLS + x) * 4 + 3] ?? 0;
        if (alpha < 40) continue;
        const a = Math.min(1, alpha / 255);
        const c = a > 0.6 ? lit : mid;
        ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
        ctx.globalAlpha = 0.35 + a * 0.65;
        ctx.beginPath();
        ctx.arc(pad + (x + 0.5) * pitchX, pad + (y + 0.5) * pitchY, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  };

  return {
    show(text, opts) {
      if (destroyed || !text) return;
      const now = performance.now();
      const priority = opts?.priority ?? 5;
      // replace any queued message of equal/lower priority
      for (let i = queue.length - 1; i >= 0; i--) {
        const m = queue[i];
        if (m && m.priority <= priority) queue.splice(i, 1);
      }
      const ms = opts?.ms ?? 1600;
      queue.push({
        text,
        priority,
        endsAt: now + ms,
        flash: opts?.flash ?? false,
        color: opts?.color ?? "amber",
        star: opts?.star ?? false,
      });
      if (opts?.flash) flashUntil = now + ms;
    },
    setScore(n) {
      score = n;
    },
    setLine(l) {
      if (line !== l) lastLayout = "";
      line = l;
    },
    setColor(p) {
      palette = p;
      hexCache.clear();
    },
    tick(t) {
      if (destroyed) return;
      const now = t;
      while (queue.length > 0) {
        const head = queue[0];
        if (head && head.endsAt <= now) queue.shift();
        else break;
      }
      render(now);
    },
    destroy() {
      destroyed = true;
      queue.length = 0;
    },
  };
}
