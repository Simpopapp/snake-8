// NEONVOLT — canvas renderer. Browser-only; draws everything from TableDef + view.
import { isReducedFx, type FxState } from "./fx";
import { FRAME_WALLS, pathLength, pointAt } from "./frame";
import type { RenderView } from "./engine";
import { TABLE_HEIGHT, TABLE_WIDTH, type BallSkin, type TableDef, type TableElement, type Vec2 } from "./types";

const FONT_DISPLAY = '"Bebas Neue", "Arial Narrow", sans-serif';

function pseudo(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function strokeChain(ctx: CanvasRenderingContext2D, pts: Vec2[], closed = false): void {
  const first = pts[0];
  if (!first) return;
  ctx.beginPath();
  ctx.moveTo(first.x, first.y);
  for (let i = 1; i < pts.length; i++) {
    const pt = pts[i];
    if (pt) ctx.lineTo(pt.x, pt.y);
  }
  if (closed) ctx.closePath();
  ctx.stroke();
}

function glow(ctx: CanvasRenderingContext2D, color: string, blur: number): void {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
}
function noGlow(ctx: CanvasRenderingContext2D): void {
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  table: TableDef,
  view: RenderView,
  fx: FxState,
  t: number,
  skin: BallSkin = "cromada",
): void {
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#04050a";
  ctx.fillRect(0, 0, cw, ch);

  const s = Math.min(cw / TABLE_WIDTH, ch / TABLE_HEIGHT);
  const ox = (cw - TABLE_WIDTH * s) / 2;
  const oy = (ch - TABLE_HEIGHT * s) / 2;

  ctx.setTransform(s, 0, 0, s, ox, oy);
  const p = table.palette;

  // background (not shaken)
  drawBackground(ctx, table, t);

  // shake
  if (fx.shake > 0) {
    ctx.translate((Math.random() - 0.5) * fx.shake, (Math.random() - 0.5) * fx.shake);
  }

  // interior walls from the table
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const w of table.walls) {
    if (w.gate) {
      // ramp gate: dashed arrow line
      ctx.save();
      ctx.strokeStyle = p.glowB;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 8]);
      strokeChain(ctx, w.points);
      ctx.setLineDash([]);
      ctx.restore();
      continue;
    }
    drawWallChain(ctx, w.points, p, w.rail ?? 14);
  }

  // standard frame walls
  for (const fw of FRAME_WALLS) {
    drawWallChain(ctx, fw.pts, p, fw.t);
  }

  // 4.0: elevated ramps (drawn under everything else, above the backdrop)
  for (const el of table.elements) {
    if (el.kind !== "ramp") continue;
    drawRamp(ctx, el, p, view.rampHeat[el.id] ?? 0, t);
  }

  // 4.0: frenzy wash — the table runs hot (desafio)
  if (view.frenzy && !isReducedFx()) {
    const pulse = 0.5 + 0.5 * Math.sin(t / 130);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.05 + pulse * 0.05;
    ctx.fillStyle = "#ff5252";
    ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);
    ctx.restore();
  }

  // lightmap pass: wizard floods the table with color; each hit flashes its ring
  if (view.wizardActive && !isReducedFx()) {
    const pulse = 0.5 + 0.5 * Math.sin(t / 90);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.08 + pulse * 0.05;
    ctx.fillStyle = p.hot;
    ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);
    ctx.restore();
  }
  for (const fw of FRAME_WALLS) {
    if (view.wizardActive && !isReducedFx()) {
      ctx.save();
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t / 110);
      ctx.strokeStyle = p.wall;
      ctx.lineWidth = 3;
      glow(ctx, p.wall, 22);
      strokeChain(ctx, fw.pts);
      noGlow(ctx);
      ctx.restore();
    }
  }
  if (!isReducedFx()) {
    for (const [id, flash] of Object.entries(view.hitFlashes)) {
      const el = table.elements.find((e) => e.id === id);
      if (!el || flash <= 0) continue;
      const c =
        el.kind === "bumper"
          ? el.pos
          : el.kind === "sling"
            ? { x: (el.a.x + el.b.x + el.c.x) / 3, y: (el.a.y + el.b.y + el.c.y) / 3 }
            : el.kind === "kicker" || el.kind === "spinner" || el.kind === "target" || el.kind === "drop" || el.kind === "magnet"
              ? el.pos
              : el.kind === "ramp"
                ? (el.path[0] ?? null)
                : null;
      if (!c) continue;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = flash * 0.8;
      ctx.strokeStyle = p.hot;
      ctx.lineWidth = 2.5 + flash * 3;
      const r = el.kind === "bumper" ? el.radius * (1.1 + (1 - flash) * 0.9) : el.kind === "kicker" || el.kind === "drop" ? 22 + (1 - flash) * 26 : 20;
      glow(ctx, p.hot, 14);
      ctx.beginPath();
      ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
      ctx.stroke();
      noGlow(ctx);
      ctx.restore();
    }
    // ball light: the rolling ball illuminates nearby hardware
    for (const b of view.balls) {
      const g = ctx.createRadialGradient(b.x, b.y, 2, b.x, b.y, 85);
      g.addColorStop(0, p.hot);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 85, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // elements
  for (const el of table.elements) {
    drawElement(ctx, el, table, view, t);
  }

  // skill-shot lamp on the lit element
  if (view.litElementId) {
    const el = table.elements.find((e) => e.id === view.litElementId);
    if (el && "pos" in el) {
      const r = el.kind === "bumper" ? el.radius : 16;
      const pulse = 0.5 + 0.5 * Math.sin(t / 140);
      ctx.save();
      ctx.strokeStyle = p.hot;
      ctx.lineWidth = 3.5;
      glow(ctx, p.hot, 16 + pulse * 10);
      ctx.globalAlpha = 0.55 + 0.45 * pulse;
      ctx.beginPath();
      ctx.arc(el.pos.x, el.pos.y, r + 8 + pulse * 3, 0, Math.PI * 2);
      ctx.stroke();
      noGlow(ctx);
      ctx.restore();
    }
  }

  // ball-save window: pulsing launch lane
  if (view.ballSaveActive) {
    const pulse = 0.5 + 0.5 * Math.sin(t / 120);
    ctx.save();
    ctx.globalAlpha = 0.3 + 0.5 * pulse;
    ctx.strokeStyle = p.glowA;
    ctx.lineWidth = 4;
    glow(ctx, p.glowA, 14);
    ctx.beginPath();
    ctx.moveTo(515, 936);
    ctx.lineTo(515, 700);
    ctx.stroke();
    noGlow(ctx);
    ctx.restore();
  }

  // flippers
  drawFlippers(ctx, table, view);

  // plunger + launch hint
  drawPlunger(ctx, table, view);

  // balls with trails
  for (const b of view.balls) drawBall(ctx, b.x, b.y, b.r, b.trail, b.ice, p, skin);

  // volt charge meter (left rail) + mystery lamp over the kicker
  drawVoltMeter(ctx, table, view, t);
  if (view.mysteryLit) {
    const kick = table.elements.find((e) => e.kind === "kicker");
    if (kick) {
      const pulse = 0.5 + 0.5 * Math.sin(t / 150);
      ctx.save();
      ctx.strokeStyle = p.glowB;
      ctx.lineWidth = 3;
      glow(ctx, p.glowB, 18 + pulse * 12);
      ctx.globalAlpha = 0.5 + 0.5 * pulse;
      ctx.beginPath();
      ctx.arc(kick.pos.x, kick.pos.y, kick.radius + 9 + pulse * 4, 0, Math.PI * 2);
      ctx.stroke();
      noGlow(ctx);
      ctx.restore();
    }
  }

  // 4.0: lock lamp — balls staged in a lock kicker glow over the hole
  if (view.lockedBalls > 0) {
    const pulse = 0.5 + 0.5 * Math.sin(t / 140);
    for (const kick of table.elements.filter(
      (e): e is Extract<TableElement, { kind: "kicker" }> => e.kind === "kicker" && e.lock === true,
    )) {
      ctx.save();
      ctx.strokeStyle = p.glowA;
      ctx.lineWidth = 4;
      glow(ctx, p.glowA, 18 + pulse * 12);
      ctx.globalAlpha = 0.5 + 0.5 * pulse;
      ctx.beginPath();
      ctx.arc(kick.pos.x, kick.pos.y, kick.radius + 8 + pulse * 3, 0, Math.PI * 2);
      ctx.stroke();
      noGlow(ctx);
      ctx.fillStyle = p.glowA;
      ctx.font = `700 13px ${FONT_DISPLAY}`;
      ctx.textAlign = "center";
      ctx.fillText(`LOCK ${view.lockedBalls}`, kick.pos.x, kick.pos.y - kick.radius - 14);
      ctx.restore();
    }
  }

  // particles (additive)
  if (fx.particles.length > 0) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const pt of fx.particles) {
      ctx.globalAlpha = Math.max(0, pt.life) * 0.9;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // jackpot flash
  if (fx.flash > 0) {
    ctx.fillStyle = p.hot;
    ctx.globalAlpha = fx.flash * 0.28;
    ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);
    ctx.globalAlpha = 1;
  }

  // vignette
  const vg = ctx.createRadialGradient(270, 480, 260, 270, 480, 720);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);

  // playfield glass: faint diagonal reflections (skipped in reduced FX)
  if (!isReducedFx()) {
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = "#ffffff";
    for (const [x0, w] of [[70, 26], [180, 14], [300, 30]] as const) {
      ctx.beginPath();
      ctx.moveTo(x0, 0);
      ctx.lineTo(x0 + w, 0);
      ctx.lineTo(x0 + w - 150, TABLE_HEIGHT);
      ctx.lineTo(x0 - 150, TABLE_HEIGHT);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // TILT overlay
  if (view.tilt) {
    ctx.save();
    ctx.globalAlpha = 0.85 + 0.15 * Math.sin(t / 90);
    ctx.font = `700 110px ${FONT_DISPLAY}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    glow(ctx, "#ff3b3b", 40);
    ctx.fillStyle = "#ff5252";
    ctx.fillText("TILT", 270, 470);
    noGlow(ctx);
    ctx.font = `700 26px ${FONT_DISPLAY}`;
    ctx.fillStyle = "#fda4af";
    ctx.fillText("FLIPPERS BLOQUEADOS", 270, 545);
    ctx.restore();
  }

  // launch hint
  if (view.ballReady && !view.tilt) {
    const bob = Math.sin(t / 300) * 6;
    ctx.save();
    ctx.globalAlpha = 0.75 + 0.25 * Math.sin(t / 300);
    ctx.strokeStyle = p.hot;
    ctx.lineWidth = 4;
    glow(ctx, p.hot, 14);
    for (let i = 0; i < 3; i++) {
      const yy = 800 - i * 26 + bob * (1 - i * 0.2);
      ctx.beginPath();
      ctx.moveTo(508, yy + 8);
      ctx.lineTo(515, yy);
      ctx.lineTo(522, yy + 8);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawWallChain(
  ctx: CanvasRenderingContext2D,
  pts: Vec2[],
  p: TableDef["palette"],
  thickness: number,
): void {
  // dark body
  ctx.strokeStyle = "rgba(6,8,16,0.92)";
  ctx.lineWidth = thickness;
  strokeChain(ctx, pts);
  // neon rail
  ctx.strokeStyle = p.wall;
  ctx.lineWidth = Math.max(2.5, thickness * 0.28);
  glow(ctx, p.wall, 12);
  strokeChain(ctx, pts);
  noGlow(ctx);
  // hot core line
  ctx.strokeStyle = "rgba(255,255,255,0.28)";
  ctx.lineWidth = 1.2;
  strokeChain(ctx, pts);
}

/** 4.0: elevated ramp ribbon — trilhos + poço escuro + brilho de travessia. */
function drawRamp(
  ctx: CanvasRenderingContext2D,
  el: Extract<TableElement, { kind: "ramp" }>,
  p: TableDef["palette"],
  heat: number,
  t: number,
): void {
  const w = el.width;
  // shadow projected on the playfield
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = "rgba(0,0,0,0.8)";
  ctx.lineWidth = w + 6;
  ctx.lineCap = "round";
  ctx.translate(4, 6);
  strokeChain(ctx, el.path);
  ctx.restore();
  // dark deck
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(6,8,16,0.94)";
  ctx.lineWidth = w;
  strokeChain(ctx, el.path);
  // side rails
  ctx.strokeStyle = p.wall;
  ctx.lineWidth = 2.5;
  glow(ctx, p.wall, 10);
  strokeChain(ctx, el.path);
  noGlow(ctx);
  // center guide dashed toward the exit
  ctx.setLineDash([7, 9]);
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = p.glowB;
  ctx.lineWidth = 1.6;
  strokeChain(ctx, el.path);
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  // entry/exit head lamps
  const head = el.path[0];
  const tail = el.path[el.path.length - 1];
  for (const [pt, color] of [
    [head, p.glowA],
    [tail, p.hot],
  ] as const) {
    if (!pt) continue;
    ctx.strokeStyle = color;
    glow(ctx, color, 12);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, w * 0.55, 0, Math.PI * 2);
    ctx.stroke();
    noGlow(ctx);
  }
  // traversal heat: bright pulse running along the ribbon
  if (heat > 0) {
    const sweep = ((t / 120) % 1) * pathLength(el.path);
    const pos = pointAt(el.path, sweep);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = heat * 0.8;
    ctx.strokeStyle = p.hot;
    ctx.lineWidth = w * 0.5;
    glow(ctx, p.hot, 18);
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, w * 0.6, 0, Math.PI * 2);
    ctx.stroke();
    noGlow(ctx);
    ctx.restore();
  }
  ctx.restore();
}

// ----------------------------------------------------------- backgrounds

function drawBackground(ctx: CanvasRenderingContext2D, table: TableDef, t: number): void {
  const p = table.palette;
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);

  switch (table.id) {
    case "circuito-neon": {
      // perspective grid + data rain
      ctx.save();
      ctx.globalAlpha = 0.14;
      ctx.strokeStyle = p.bgDetail;
      ctx.lineWidth = 1;
      for (let i = 0; i <= 12; i++) {
        const x = 10 + i * 45;
        ctx.beginPath();
        ctx.moveTo(x, 60);
        ctx.lineTo(x, TABLE_HEIGHT);
        ctx.stroke();
      }
      for (let j = 0; j < 16; j++) {
        const y = 80 + j * 55;
        ctx.globalAlpha = 0.05 + 0.09 * (j / 16);
        ctx.beginPath();
        ctx.moveTo(10, y);
        ctx.lineTo(530, y);
        ctx.stroke();
      }
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = p.bgDetail;
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 22; i++) {
        const x = pseudo(i) * 520 + 10;
        const speed = 90 + pseudo(i + 40) * 160;
        const y = ((t / 1000) * speed + pseudo(i + 90) * 960) % 1000;
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.moveTo(x, y - 26);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }
    case "forja-solar": {
      // heat glow + rising embers
      const g = ctx.createRadialGradient(270, 500, 40, 270, 500, 560);
      g.addColorStop(0, "rgba(249,115,22,0.30)");
      g.addColorStop(0.5, "rgba(239,68,68,0.10)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);
      ctx.fillStyle = p.bgDetail;
      for (let i = 0; i < 30; i++) {
        const x = pseudo(i) * 500 + 20 + Math.sin(t / 900 + i) * 14;
        const speed = 40 + pseudo(i + 50) * 70;
        const y = 990 - (((t / 1000) * speed + pseudo(i + 90) * 1000) % 1000);
        ctx.globalAlpha = 0.25 + 0.45 * pseudo(i + 130);
        ctx.beginPath();
        ctx.arc(x, y, 1 + pseudo(i + 170) * 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case "abissal": {
      // light shafts + drifting plankton
      ctx.save();
      for (let i = 0; i < 4; i++) {
        const x = 80 + i * 120;
        const grad = ctx.createLinearGradient(x, 0, x + 60, 700);
        grad.addColorStop(0, "rgba(56,189,248,0.10)");
        grad.addColorStop(1, "rgba(56,189,248,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(x - 30, 0);
        ctx.lineTo(x + 30, 0);
        ctx.lineTo(x + 90, 720);
        ctx.lineTo(x - 60, 720);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      ctx.fillStyle = p.bgDetail;
      for (let i = 0; i < 36; i++) {
        const x = pseudo(i) * 500 + 20 + Math.sin(t / 1400 + i * 2) * 10;
        const speed = 18 + pseudo(i + 60) * 30;
        const y = 990 - (((t / 1000) * speed + pseudo(i + 100) * 1000) % 1000);
        ctx.globalAlpha = 0.2 + 0.4 * pseudo(i + 140);
        ctx.beginPath();
        ctx.arc(x, y, 0.8 + pseudo(i + 180) * 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case "criogenese": {
      // faceted crystal veins + falling snow
      ctx.save();
      ctx.globalAlpha = 0.16;
      ctx.strokeStyle = p.bgDetail;
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 8; i++) {
        const x0 = 30 + pseudo(i) * 480;
        const y0 = 60 + pseudo(i + 20) * 300;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x0 + (pseudo(i + 40) - 0.5) * 220, y0 + 120 + pseudo(i + 60) * 260);
        ctx.lineTo(x0 + (pseudo(i + 80) - 0.5) * 260, y0 + 300 + pseudo(i + 100) * 300);
        ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = p.bgDetail;
      for (let i = 0; i < 40; i++) {
        const x = pseudo(i) * 500 + 20 + Math.sin(t / 1000 + i) * 18;
        const speed = 24 + pseudo(i + 55) * 40;
        const y = (((t / 1000) * speed + pseudo(i + 95) * 1000) % 1000);
        ctx.globalAlpha = 0.3 + 0.4 * pseudo(i + 135);
        ctx.beginPath();
        ctx.arc(x, y, 1 + pseudo(i + 175) * 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case "supernova": {
      // golden halo behind the core + faint nebula + twinkling starfield
      const g = ctx.createRadialGradient(255, 390, 30, 255, 390, 480);
      g.addColorStop(0, "rgba(255,209,102,0.20)");
      g.addColorStop(0.45, "rgba(69,224,245,0.08)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);
      ctx.fillStyle = p.bgDetail;
      for (let i = 0; i < 46; i++) {
        const x = pseudo(i) * 500 + 20;
        const y = pseudo(i + 200) * 900 + 30;
        const tw = Math.abs(Math.sin(t / (700 + pseudo(i + 300) * 600) + i));
        ctx.globalAlpha = 0.15 + 0.55 * tw * pseudo(i + 400);
        ctx.beginPath();
        ctx.arc(x, y, 0.6 + pseudo(i + 500) * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case "vortice-tesla": {
      // storm clouds + periodic lightning arcs (3.0 base, 4.0 polish)
      const g = ctx.createRadialGradient(270, 140, 20, 270, 140, 520);
      g.addColorStop(0, "rgba(129,140,248,0.18)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);
      if (!isReducedFx()) {
        const flash = Math.sin(t / 1700) > 0.94;
        if (flash) {
          ctx.save();
          ctx.globalAlpha = 0.16;
          ctx.fillStyle = p.glowA;
          ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);
          ctx.restore();
        }
        ctx.save();
        ctx.strokeStyle = p.glowA;
        ctx.lineWidth = 1.6;
        ctx.globalAlpha = 0.4;
        for (let i = 0; i < 3; i++) {
          const phase = (t / 2400 + i * 0.33) % 1;
          if (phase > 0.12) continue;
          let x = pseudo(i) * 480 + 30;
          let y = 30;
          ctx.beginPath();
          ctx.moveTo(x, y);
          for (let s = 0; s < 7; s++) {
            x += (pseudo(i * 10 + s) - 0.5) * 60;
            y += 90;
            ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        ctx.restore();
      }
      break;
    }
    case "nucleo-zero": {
      // terminal grid + falling bytes
      ctx.save();
      ctx.globalAlpha = 0.1;
      ctx.strokeStyle = p.bgDetail;
      ctx.lineWidth = 1;
      for (let i = 0; i < 14; i++) {
        const x = 15 + i * 38;
        ctx.beginPath();
        ctx.moveTo(x, 40);
        ctx.lineTo(x, TABLE_HEIGHT);
        ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = p.bgDetail;
      for (let i = 0; i < 26; i++) {
        const x = pseudo(i) * 500 + 20;
        const speed = 60 + pseudo(i + 45) * 120;
        const y = (((t / 1000) * speed + pseudo(i + 85) * 1000) % 1000);
        ctx.globalAlpha = 0.25 + 0.4 * pseudo(i + 125);
        ctx.fillRect(x, y, 3, 10);
      }
      ctx.globalAlpha = 1;
      break;
    }
    case "orquestra-neural": {
      // neural web: nodes firing along the links
      ctx.save();
      ctx.globalAlpha = 0.2;
      ctx.strokeStyle = p.bgDetail;
      ctx.lineWidth = 1.2;
      const nodes = Array.from({ length: 9 }, (_, i) => ({
        x: 60 + pseudo(i) * 420,
        y: 90 + pseudo(i + 30) * 700,
      }));
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        const b = nodes[(i + 1) % nodes.length];
        const c = nodes[(i + 4) % nodes.length];
        if (a && b && c) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(c.x, c.y);
          ctx.stroke();
        }
      }
      ctx.restore();
      if (!isReducedFx()) {
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          if (!n) continue;
          const fire = Math.abs(Math.sin(t / 900 + i * 1.7));
          ctx.globalAlpha = 0.25 + 0.6 * fire;
          ctx.fillStyle = p.bgDetail;
          ctx.beginPath();
          ctx.arc(n.x, n.y, 2 + fire * 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      break;
    }
    case "deserto-estatico": {
      // dunes + drifting sand + heat mirage
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = p.bgDetail;
      ctx.lineWidth = 10;
      ctx.lineCap = "round";
      for (let i = 0; i < 4; i++) {
        const y = 220 + i * 170;
        ctx.beginPath();
        for (let x = 0; x <= TABLE_WIDTH; x += 40) {
          const yy = y + Math.sin(x / 90 + i * 2) * 18;
          if (x === 0) ctx.moveTo(x, yy);
          else ctx.lineTo(x, yy);
        }
        ctx.stroke();
      }
      ctx.restore();
      if (!isReducedFx()) {
        ctx.fillStyle = p.bgDetail;
        for (let i = 0; i < 34; i++) {
          const x = ((pseudo(i) * 560 + (t / 1000) * (50 + pseudo(i + 50) * 80)) % 560) - 10;
          const y = pseudo(i + 90) * 900 + 30;
          ctx.globalAlpha = 0.2 + 0.35 * pseudo(i + 130);
          ctx.fillRect(x, y, 6, 1.4);
        }
      }
      ctx.globalAlpha = 1;
      break;
    }
    case "catedral-fonica": {
      // organ pipes silhouette + concentric sound waves
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = p.bgDetail;
      for (let i = 0; i < 7; i++) {
        const w = 26 + pseudo(i) * 26;
        const h = 120 + pseudo(i + 40) * 220;
        ctx.fillRect(20 + i * 74, 40, w, h);
      }
      ctx.restore();
      if (!isReducedFx()) {
        ctx.save();
        ctx.strokeStyle = p.bgDetail;
        for (let i = 0; i < 4; i++) {
          const r = ((t / 12 + i * 110) % 440);
          ctx.globalAlpha = 0.3 * (1 - r / 440);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(270, 480, r, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case "cidade-vapor": {
      // giant gear + rising steam
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = p.bgDetail;
      ctx.lineWidth = 8;
      const gr = 150;
      const rot = t / 3000;
      ctx.beginPath();
      ctx.arc(440, 200, gr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 5;
      for (let i = 0; i < 10; i++) {
        const a = rot + (i / 10) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(440 + Math.cos(a) * gr, 200 + Math.sin(a) * gr);
        ctx.lineTo(440 + Math.cos(a) * (gr + 18), 200 + Math.sin(a) * (gr + 18));
        ctx.stroke();
      }
      ctx.restore();
      if (!isReducedFx()) {
        ctx.fillStyle = p.bgDetail;
        for (let i = 0; i < 24; i++) {
          const x = pseudo(i) * 500 + 20 + Math.sin(t / 1100 + i) * 16;
          const speed = 30 + pseudo(i + 55) * 50;
          const y = 990 - (((t / 1000) * speed + pseudo(i + 95) * 1000) % 1000);
          ctx.globalAlpha = 0.12 + 0.25 * pseudo(i + 135);
          ctx.beginPath();
          ctx.arc(x, y, 3 + pseudo(i + 175) * 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      break;
    }
    case "reator-final": {
      // heartbeat pulse + intermittent alarm
      const beat = Math.pow(Math.abs(Math.sin(t / 600)), 6);
      const g = ctx.createRadialGradient(270, 380, 30, 270, 380, 560);
      g.addColorStop(0, `rgba(248,113,113,${0.16 + beat * 0.2})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);
      if (!isReducedFx() && Math.sin(t / 2600) > 0.86) {
        ctx.save();
        ctx.globalAlpha = 0.14;
        ctx.fillStyle = p.wall;
        ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);
        ctx.restore();
      }
      // warning stripes on the rails
      ctx.save();
      ctx.globalAlpha = 0.2 + beat * 0.15;
      ctx.strokeStyle = p.wall;
      ctx.lineWidth = 2;
      ctx.setLineDash([16, 12]);
      ctx.beginPath();
      ctx.moveTo(30, 120);
      ctx.lineTo(30, 900);
      ctx.moveTo(510, 120);
      ctx.lineTo(510, 900);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      ctx.globalAlpha = 1;
      break;
    }
  }
}

// ------------------------------------------------------------- elements

/** Volt charge meter on the left rail — fills with every gate pass. */
function drawVoltMeter(
  ctx: CanvasRenderingContext2D,
  table: TableDef,
  view: RenderView,
  t: number,
): void {
  const p = table.palette;
  const max = 5;
  const x = 20;
  const y0 = 180;
  const h = 150;
  const frac = Math.min(1, view.voltCharge / max);
  // track
  ctx.save();
  ctx.strokeStyle = p.dim;
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, y0);
  ctx.lineTo(x, y0 + h);
  ctx.stroke();
  // charge
  if (frac > 0) {
    const full = view.voltCharge >= max;
    const pulse = full ? 0.5 + 0.5 * Math.sin(t / 110) : 0;
    ctx.strokeStyle = full ? p.hot : p.glowA;
    ctx.lineWidth = 6;
    glow(ctx, full ? p.hot : p.glowA, full ? 18 + pulse * 14 : 10);
    ctx.beginPath();
    ctx.moveTo(x, y0 + h);
    ctx.lineTo(x, y0 + h - h * frac);
    ctx.stroke();
    noGlow(ctx);
    if (full) {
      ctx.fillStyle = p.hot;
      ctx.font = `700 15px ${FONT_DISPLAY}`;
      ctx.textAlign = "left";
      ctx.fillText("JACKPOT", x + 12, y0 + h * 0.45 + pulse * 3);
    }
  }
  ctx.restore();
}

function drawElement(
  ctx: CanvasRenderingContext2D,
  el: TableElement,
  table: TableDef,
  view: RenderView,
  t: number,
): void {
  const p = table.palette;
  // 4.0: patrolling elements are drawn at their live path position
  const patrolPos = (el: { patrol?: { path: Vec2[] } | undefined; id: string; pos: Vec2 }): Vec2 => {
    if (!el.patrol) return el.pos;
    const phase = view.patrolPhase[el.id] ?? 0;
    return pointAt(el.patrol.path, phase * pathLength(el.patrol.path));
  };
  switch (el.kind) {
    case "bumper": {
      const pos = patrolPos(el);
      const pulse = 1 + 0.05 * Math.sin(t / 260 + pos.x);
      const color = el.color === "glowB" ? p.glowB : p.glowA;
      // outer glow disc
      const g = ctx.createRadialGradient(pos.x, pos.y, el.radius * 0.3, pos.x, pos.y, el.radius * 1.9);
      g.addColorStop(0, color);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, el.radius * 1.9 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      // cap
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, el.radius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(8,10,20,0.9)";
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = color;
      glow(ctx, color, 18);
      ctx.stroke();
      noGlow(ctx);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, el.radius * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.beginPath();
      ctx.arc(pos.x - el.radius * 0.18, pos.y - el.radius * 0.2, el.radius * 0.16, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "sling": {
      ctx.beginPath();
      ctx.moveTo(el.a.x, el.a.y);
      ctx.lineTo(el.b.x, el.b.y);
      ctx.lineTo(el.c.x, el.c.y);
      ctx.closePath();
      ctx.fillStyle = "rgba(8,10,20,0.9)";
      ctx.fill();
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = p.glowB;
      glow(ctx, p.glowB, 14);
      ctx.stroke();
      noGlow(ctx);
      break;
    }
    case "target": {
      const down = view.targetsDown.has(el.id);
      ctx.save();
      ctx.translate(el.pos.x, el.pos.y);
      ctx.rotate(el.angle ?? 0);
      if (down) {
        ctx.globalAlpha = 0.28;
        ctx.strokeStyle = p.dim;
        ctx.lineWidth = 2;
        ctx.strokeRect(-el.w, -el.h, el.w * 2, el.h * 2);
      } else {
        const col = p.glowB;
        ctx.fillStyle = "rgba(8,10,20,0.85)";
        ctx.fillRect(-el.w, -el.h, el.w * 2, el.h * 2);
        ctx.lineWidth = 3;
        ctx.strokeStyle = col;
        glow(ctx, col, 12);
        ctx.strokeRect(-el.w, -el.h, el.w * 2, el.h * 2);
        noGlow(ctx);
        ctx.fillStyle = col;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(-el.w + 3, -el.h + 3, el.w * 2 - 6, 5);
      }
      ctx.restore();
      break;
    }
    case "drop": {
      const down = view.dropsDown.has(el.id);
      const pos = patrolPos(el);
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(el.angle ?? 0);
      if (down) {
        // fallen: dark slot with a thin floor line
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = "rgba(4,6,12,0.95)";
        ctx.fillRect(-el.w, -el.h, el.w * 2, el.h * 2);
        ctx.strokeStyle = p.dim;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-el.w, -el.h, el.w * 2, el.h * 2);
      } else {
        // standing plate: bright face with a lit cap strip
        ctx.fillStyle = "rgba(8,10,20,0.9)";
        ctx.fillRect(-el.w, -el.h, el.w * 2, el.h * 2);
        ctx.lineWidth = 3;
        ctx.strokeStyle = p.glowB;
        glow(ctx, p.glowB, 14);
        ctx.strokeRect(-el.w, -el.h, el.w * 2, el.h * 2);
        noGlow(ctx);
        ctx.fillStyle = p.glowB;
        ctx.globalAlpha = 0.75;
        ctx.fillRect(-el.w + 2, -el.h + 2, el.w * 2 - 4, el.h - 2);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      break;
    }
    case "spinner": {
      const ang = view.spinnerAngles[el.id] ?? 0;
      const dx = Math.cos(ang) * (el.length / 2);
      const dy = Math.sin(ang) * (el.length / 2);
      ctx.save();
      // lane
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = p.dim;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(el.pos.x - el.length / 2 - 8, el.pos.y - 14);
      ctx.lineTo(el.pos.x + el.length / 2 + 8, el.pos.y - 14);
      ctx.moveTo(el.pos.x - el.length / 2 - 8, el.pos.y + 14);
      ctx.lineTo(el.pos.x + el.length / 2 + 8, el.pos.y + 14);
      ctx.stroke();
      ctx.globalAlpha = 1;
      // blade
      ctx.strokeStyle = p.glowB;
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      glow(ctx, p.glowB, 16);
      ctx.beginPath();
      ctx.moveTo(el.pos.x - dx, el.pos.y - dy);
      ctx.lineTo(el.pos.x + dx, el.pos.y + dy);
      ctx.stroke();
      noGlow(ctx);
      // hub
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath();
      ctx.arc(el.pos.x, el.pos.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;
    }
    case "kicker": {
      const pulse = 0.5 + 0.5 * Math.sin(t / 320);
      ctx.save();
      ctx.strokeStyle = p.hot;
      ctx.globalAlpha = 0.5 + 0.5 * pulse;
      ctx.lineWidth = 3;
      glow(ctx, p.hot, 16 + pulse * 10);
      ctx.beginPath();
      ctx.arc(el.pos.x, el.pos.y, el.radius, 0, Math.PI * 2);
      ctx.stroke();
      noGlow(ctx);
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(el.pos.x, el.pos.y, el.radius * 0.45, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      // volt jackpot ready: golden charge ring over the hole
      if (view.voltCharge >= 5) {
        const pulse = 0.5 + 0.5 * Math.sin(t / 110);
        ctx.strokeStyle = p.hot;
        ctx.lineWidth = 4;
        glow(ctx, p.hot, 20 + pulse * 12);
        ctx.globalAlpha = 0.6 + 0.4 * pulse;
        ctx.beginPath();
        ctx.arc(el.pos.x, el.pos.y, el.radius + 7 + pulse * 3, 0, Math.PI * 2);
        ctx.stroke();
        noGlow(ctx);
        ctx.globalAlpha = 1;
      }
      break;
    }
    case "ramp": {
      // the ribbon itself is drawn before the elements; keep the skill lamp aligned
      break;
    }
    case "magnet": {
      const pulse = view.magnetPulse[el.id] ?? 0;
      const idle = 0.25 + 0.25 * Math.sin(t / 420 + el.pos.x);
      const strength = Math.max(idle, pulse);
      ctx.save();
      // field rings
      for (let i = 0; i < 3; i++) {
        const r = el.radius * (0.35 + i * 0.32);
        ctx.globalAlpha = strength * (0.55 - i * 0.14);
        ctx.strokeStyle = p.glowB;
        ctx.lineWidth = 2;
        glow(ctx, p.glowB, 10 + strength * 12);
        ctx.beginPath();
        ctx.arc(el.pos.x, el.pos.y, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      noGlow(ctx);
      // core
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = p.glowB;
      ctx.beginPath();
      ctx.arc(el.pos.x, el.pos.y, 6 + strength * 5, 0, Math.PI * 2);
      ctx.fill();
      // label
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = p.glowB;
      ctx.font = `700 12px ${FONT_DISPLAY}`;
      ctx.textAlign = "center";
      ctx.fillText("ÍMÃ", el.pos.x, el.pos.y + el.radius + 14);
      ctx.restore();
      break;
    }
  }
}

// ----------------------------------------------------------- actors

function drawFlippers(ctx: CanvasRenderingContext2D, table: TableDef, view: RenderView): void {
  const p = table.palette;
  const [flipL, flipR] = table.flippers;
  const defs = flipL && flipR ? [flipL, flipR] : [];
  for (let i = 0; i < defs.length; i++) {
    const def = defs[i];
    if (!def) continue;
    const ang = view.flipperAngles[i] ?? 0;
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);
    const nx = -dy;
    const ny = dx;
    const w0 = 11;
    const w1 = 6;
    const tipX = def.pivot.x + dx * def.length;
    const tipY = def.pivot.y + dy * def.length;
    ctx.beginPath();
    ctx.moveTo(def.pivot.x + nx * w0, def.pivot.y + ny * w0);
    ctx.lineTo(tipX + nx * w1, tipY + ny * w1);
    ctx.lineTo(tipX - nx * w1, tipY - ny * w1);
    ctx.lineTo(def.pivot.x - nx * w0, def.pivot.y - ny * w0);
    ctx.closePath();
    ctx.fillStyle = view.tilt ? "rgba(60,20,25,0.95)" : "rgba(10,12,24,0.95)";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = view.tilt ? "#ff5252" : p.wall;
    glow(ctx, view.tilt ? "#ff5252" : p.wall, 14);
    ctx.stroke();
    noGlow(ctx);
    // pivot cap
    ctx.fillStyle = p.wall;
    ctx.beginPath();
    ctx.arc(def.pivot.x, def.pivot.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlunger(
  ctx: CanvasRenderingContext2D,
  table: TableDef,
  view: RenderView,
): void {
  const p = table.palette;
  const laneX = table.launch.x;
  const charge = view.plungerCharge;
  const knobY = table.launch.ballRestY + 26 + charge * 26;
  // spring
  ctx.strokeStyle = p.dim;
  ctx.lineWidth = 3;
  ctx.beginPath();
  const coils = 6;
  for (let i = 0; i <= coils; i++) {
    const yy = table.launch.ballRestY + 48 - (i / coils) * (table.launch.ballRestY + 48 - knobY);
    const xx = laneX + (i % 2 === 0 ? -6 : 6);
    if (i === 0) ctx.moveTo(xx, yy);
    else ctx.lineTo(xx, yy);
  }
  ctx.stroke();
  // knob
  ctx.fillStyle = p.hot;
  glow(ctx, p.hot, 12 + charge * 20);
  ctx.beginPath();
  ctx.roundRect(laneX - 18, knobY, 36, 16, 6);
  ctx.fill();
  noGlow(ctx);
}

/** 4.0: ball cosmetics unlocked by level (D12). */
const SKINS: Record<BallSkin, { stops: [number, string][]; trail: string }> = {
  cromada: { stops: [[0, "#ffffff"], [0.35, "#e2e8f0"], [0.7, "#8b96a8"], [1, "#2f3644"]], trail: "" },
  plasma: { stops: [[0, "#fdf4ff"], [0.4, "#c084fc"], [0.75, "#7c3aed"], [1, "#2e1065"]], trail: "#c084fc" },
  ouro: { stops: [[0, "#fffbeb"], [0.4, "#fcd34d"], [0.75, "#d97706"], [1, "#78350f"]], trail: "#fbbf24" },
  holo: { stops: [[0, "#ecfeff"], [0.4, "#67e8f9"], [0.75, "#0891b2"], [1, "#164e63"]], trail: "#67e8f9" },
  vortice: { stops: [[0, "#ffffff"], [0.3, "#e879f9"], [0.65, "#22d3ee"], [1, "#1e1b4b"]], trail: "#e879f9" },
};

function drawBall(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  trail: Vec2[],
  ice: boolean,
  p: TableDef["palette"],
  skin: BallSkin = "cromada",
): void {
  // trail
  if (trail.length > 1) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    const trailColor = ice ? "#a5f3fc" : SKINS[skin]?.trail || p.hot;
    for (let i = 1; i < trail.length; i++) {
      const prev = trail[i - 1];
      const cur = trail[i];
      if (!prev || !cur) continue;
      const a = (i / trail.length) * 0.35;
      ctx.strokeStyle = trailColor;
      ctx.globalAlpha = a;
      ctx.lineWidth = r * 1.4 * (i / trail.length);
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(cur.x, cur.y);
      ctx.stroke();
    }
    ctx.restore();
  }
  // body: chrome with a highlight that follows the direction of travel
  let hx = x - r * 0.35;
  let hy = y - r * 0.4;
  if (trail.length > 1) {
    const prev = trail[trail.length - 2];
    const last = trail[trail.length - 1];
    if (prev && last) {
      const dx = last.x - prev.x;
      const dy = last.y - prev.y;
      const len = Math.hypot(dx, dy) || 1;
      hx = x - (dx / len) * r * 0.5;
      hy = y - (dy / len) * r * 0.5;
    }
  }
  const g = ctx.createRadialGradient(hx, hy, r * 0.15, x, y, r);
  if (ice) {
    g.addColorStop(0, "#e0f2fe");
    g.addColorStop(0.6, "#7dd3fc");
    g.addColorStop(1, "#0369a1");
  } else {
    const def = SKINS[skin] ?? SKINS.cromada!;
    for (const [offset, color] of def.stops) g.addColorStop(offset, color);
  }
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  // chrome rim
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(x, y, r - 0.6, 0, Math.PI * 2);
  ctx.stroke();
  // glow
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = ice ? "#7dd3fc" : SKINS[skin]?.trail || p.hot;
  ctx.beginPath();
  ctx.arc(x, y, r * 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
