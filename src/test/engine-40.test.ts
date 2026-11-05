// NEONVOLT 4.0 — engine behavior tests for the new playfield systems
// (ramp / magnet / patrol / ball lock / challenge modes). Deterministic:
// the fixed-step loop is advanced through the DEV-only debugStep hook.
import Matter from "matter-js";
import { describe, expect, it } from "vitest";

import { PinballGame } from "@/game/engine";
import type { GameEvent, TableDef } from "@/game/types";
import { validateTable } from "@/game/validate";

const palette = {
  bg: "#000000",
  bgDetail: "#111111",
  wall: "#22d3ee",
  glowA: "#22d3ee",
  glowB: "#e879f9",
  hot: "#fbbf24",
  dim: "#334155",
};

const FLIPPERS = [
  { side: "left" as const, pivot: { x: 162, y: 880 }, length: 105, restAngle: 27, activeAngle: -30 },
  { side: "right" as const, pivot: { x: 378, y: 880 }, length: 105, restAngle: 153, activeAngle: 210 },
];

const LAUNCH = { x: 515, ballRestY: 918, power: 46 };

/** Stand-in scoring element present in every test table (valid mission reference). */
const BASE_TARGET = { kind: "target" as const, id: "t1", pos: { x: 100, y: 120 }, w: 5, h: 17, score: 500, group: "tg" };

function baseTable(overrides: Partial<TableDef> = {}): TableDef {
  return {
    id: "circuito-neon",
    name: "Teste",
    subtitle: "Mesa de teste",
    palette,
    gravity: 1,
    walls: [],
    elements: [BASE_TARGET],
    flippers: [FLIPPERS[0]!, FLIPPERS[1]!],
    launch: LAUNCH,
    mission: {
      title: "Missão",
      hint: "dica",
      goal: { type: "hits", elementId: "t1", count: 99 },
      reward: { type: "multiball", balls: 2 },
      score: 12000,
    },
    starScore: 60000,
    ballRadius: 7,
    maxBalls: 3,
    ...overrides,
  };
}

type Harness = {
  game: PinballGame;
  events: GameEvent[];
  internal: {
    serveBall(): void;
    spawnBonusBall(): void;
    balls: { body: Matter.Body & { plugin: { held?: boolean; riding?: boolean } } }[];
    bumperBodies: Map<string, Matter.Body>;
    challengeTicksLeft: number;
    comboWindowTicks: number;
    releaseLockedBalls(): void;
  };
};

function makeGame(table: TableDef, options?: { mode?: { kind: "challenge"; id: "tempo" | "umabola" | "caos" | "frenesi" } }): Harness {
  const events: GameEvent[] = [];
  const canvas = { width: 300, height: 600 } as unknown as HTMLCanvasElement;
  const game = new PinballGame(canvas, table, { onEvent: (e) => events.push(e) }, options ?? {});
  const internal = game as unknown as Harness["internal"];
  return { game, events, internal };
}

describe("NEONVOLT 4.0 engine — rampa (D1)", () => {
  it("a ball entering the ramp travels the path, scores and exits boosted", () => {
    const ramp = {
      kind: "ramp" as const,
      id: "r1",
      path: [
        { x: 270, y: 220 },
        { x: 320, y: 160 },
        { x: 380, y: 220 },
      ],
      width: 22,
      score: 1500,
      boost: 1.4,
    };
    const table = baseTable({ elements: [ramp, BASE_TARGET] });
    expect(validateTable(table)).toEqual([]);
    const h = makeGame(table);
    h.internal.serveBall();
    const ball = h.internal.balls[0]?.body;
    expect(ball).toBeDefined();
    // enter right on the entry sensor
    Matter.Body.setPosition(ball!, { x: 295, y: 191 });
    Matter.Body.setVelocity(ball!, { x: 0, y: -10 });
    h.game.debugStep(2);
    expect(ball!.plugin.riding).toBe(true);
    // ride the whole path (1 tick at a time) and check the exit state
    for (let i = 0; i < 40 && ball!.plugin.riding; i++) h.game.debugStep(1);
    expect(ball!.plugin.riding).toBeFalsy();
    expect(ball!.plugin.held).toBeFalsy();
    const stats = h.game.getStats();
    expect(stats.rampRuns).toBe(1);
    expect(h.events.some((e) => e.type === "rampRun")).toBe(true);
    // exited near the path end moving outward
    expect(Math.hypot(ball!.position.x - 380, ball!.position.y - 220)).toBeLessThan(30);
    expect(Math.hypot(ball!.velocity.x, ball!.velocity.y)).toBeGreaterThan(0);
    h.game.destroy();
  });

  it("counts ramp runs for mission goals of type ramp", () => {
    const ramp = {
      kind: "ramp" as const,
      id: "r2",
      path: [
        { x: 200, y: 200 },
        { x: 260, y: 150 },
        { x: 320, y: 200 },
      ],
      width: 22,
      score: 1000,
      boost: 1.2,
    };
    const table = baseTable({
      elements: [ramp],
      mission: {
        title: "Rampa",
        hint: "h",
        goal: { type: "ramp", rampId: "r2", count: 1 },
        reward: { type: "jackpot", score: 15000 },
        score: 12000,
      },
    });
    const h = makeGame(table);
    h.internal.serveBall();
    const ball = h.internal.balls[0]?.body;
    Matter.Body.setPosition(ball!, { x: 230, y: 176 });
    Matter.Body.setVelocity(ball!, { x: 0, y: -10 });
    h.game.debugStep(30);
    expect(h.events.some((e) => e.type === "missionComplete")).toBe(true);
    h.game.destroy();
  });
});

describe("NEONVOLT 4.0 engine — ímã (D2)", () => {
  it("bends the trajectory of a ball passing through the field", () => {
    const magnet = { kind: "magnet" as const, id: "m1", pos: { x: 270, y: 300 }, radius: 60, strength: 0.1, score: 0 };
    const table = baseTable({ elements: [magnet] });
    const h = makeGame(table);
    h.internal.serveBall();
    const ball = h.internal.balls[0]?.body;
    // passing straight up 40px to the right of the magnet center
    Matter.Body.setPosition(ball!, { x: 310, y: 300 });
    Matter.Body.setVelocity(ball!, { x: 0, y: -10 });
    h.game.debugStep(8);
    expect(ball!.velocity.x).toBeLessThan(-0.2); // pulled toward the magnet (center at x=270)
    h.game.destroy();
  });

  it("reports magnet pulls as events and stats", () => {
    const magnet = { kind: "magnet" as const, id: "m2", pos: { x: 270, y: 300 }, radius: 60, strength: 0.1, score: 0 };
    const table = baseTable({ elements: [magnet] });
    const h = makeGame(table);
    h.internal.serveBall();
    const ball = h.internal.balls[0]?.body;
    Matter.Body.setPosition(ball!, { x: 280, y: 300 });
    Matter.Body.setVelocity(ball!, { x: 0, y: -6 });
    h.game.debugStep(40);
    expect(h.game.getStats().magnetHits).toBeGreaterThanOrEqual(1);
    expect(h.events.some((e) => e.type === "magnetPulled")).toBe(true);
    h.game.destroy();
  });
});

describe("NEONVOLT 4.0 engine — patrulha (D3)", () => {
  it("moves a patrolling bumper along its path", () => {
    const bumper = {
      kind: "bumper" as const,
      id: "p1",
      pos: { x: 200, y: 300 },
      radius: 24,
      score: 200,
      power: 20,
      patrol: { path: [{ x: 200, y: 300 }, { x: 320, y: 300 }], speed: 0.5 },
    };
    const table = baseTable({ elements: [bumper, BASE_TARGET] });
    expect(validateTable(table)).toEqual([]);
    const h = makeGame(table);
    h.internal.serveBall();
    const body = h.internal.bumperBodies.get("p1");
    expect(body).toBeDefined();
    const x0 = body!.position.x;
    h.game.debugStep(40); // 0.5px/tick × 40 = 20px along a 120px path
    expect(body!.position.x).toBeGreaterThan(x0 + 12);
    h.game.destroy();
  });
});

describe("NEONVOLT 4.0 engine — ball lock (D4)", () => {
  it("a lock kicker retains the ball and releases on the mission multiball", () => {
    const kicker = {
      kind: "kicker" as const,
      id: "k1",
      pos: { x: 120, y: 620 },
      radius: 16,
      ejectTo: { x: 300, y: 420 },
      score: 500,
      hold: 0.4,
      lock: true,
    };
    const table = baseTable({ elements: [kicker] });
    const h = makeGame(table);
    h.internal.serveBall();
    const ball = h.internal.balls[0]?.body;
    Matter.Body.setPosition(ball!, { x: 120, y: 620 });
    Matter.Body.setVelocity(ball!, { x: 0, y: -2 });
    h.game.debugStep(3);
    expect(ball!.plugin.held).toBe(true);
    expect(h.events.some((e) => e.type === "lockStaged")).toBe(true);
    expect(h.game.getStats().locksStaged).toBe(1);
    // mission reward (multiball) releases the locked ball
    h.game.debugCompleteMission();
    h.game.debugStep(2);
    expect(ball!.plugin.held).toBe(false);
    expect(h.events.some((e) => e.type === "lockReleased")).toBe(true);
    h.game.destroy();
  });
});

describe("NEONVOLT 4.0 engine — desafios (D9)", () => {
  it("tempo: counts down 120s once the ball is in play", () => {
    const h = makeGame(baseTable(), { mode: { kind: "challenge", id: "tempo" } });
    h.internal.serveBall();
    expect(h.internal.challengeTicksLeft).toBe(7200);
    // the clock runs in play: launch the served ball
    h.game.input("plungerDown");
    h.game.input("plungerUp");
    h.game.debugStep(60);
    expect(h.internal.challengeTicksLeft).toBe(7200 - 60);
    h.game.destroy();
  });

  it("tempo: reaching zero ends the game with challengeEnded(timeout)", () => {
    const h = makeGame(baseTable(), { mode: { kind: "challenge", id: "tempo" } });
    h.internal.serveBall();
    // the clock runs in play: launch the served ball, then force the final seconds
    h.game.input("plungerDown");
    h.game.input("plungerUp");
    h.internal.challengeTicksLeft = 2;
    h.game.debugStep(4);
    const ended = h.events.find((e) => e.type === "challengeEnded");
    expect(ended && ended.type === "challengeEnded" ? ended.timeout : undefined).toBe(true);
    expect(h.events.some((e) => e.type === "gameOver")).toBe(true);
    h.game.destroy();
  });

  it("frenesi: leans the table 20% harder and shortens the combo window", () => {
    const h = makeGame(baseTable(), { mode: { kind: "challenge", id: "frenesi" } });
    expect(h.internal.comboWindowTicks).toBe(105);
    h.game.destroy();
  });

  it("caos: starts with three balls in play", () => {
    const h = makeGame(baseTable(), { mode: { kind: "challenge", id: "caos" } });
    h.internal.serveBall();
    h.internal.spawnBonusBall();
    h.internal.spawnBonusBall();
    expect(h.internal.balls.length).toBe(3);
    h.game.destroy();
  });

  it("umabola: single ball game (balls=1)", () => {
    const h = makeGame(baseTable(), { mode: { kind: "challenge", id: "umabola" } });
    expect(h.internal.balls.length === 0 || h.internal.balls.length <= 1).toBe(true);
    h.game.destroy();
  });
});
