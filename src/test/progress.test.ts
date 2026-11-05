import { beforeEach, describe, expect, it } from "vitest";

import {
  ACHIEVEMENTS,
  levelInfo,
  readProgress,
  recordGame,
  recordTournament,
  totalStars,
  xpForLevel,
  type GameSummary,
} from "@/game/progress";
import { TABLES } from "@/game/tables";

const summary = (over: Partial<GameSummary> = {}): GameSummary => ({
  score: 1000,
  durationMs: 60_000,
  ballsLaunched: 3,
  skillShots: 0,
  ballSaves: 0,
  bestCombo: 0,
  missionCompleted: false,
  ...over,
});

describe("NEONVOLT progress (PRD project2 §6.5)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("has exactly 34 achievements with unique ids (22 + 12 of the 4.0)", () => {
    expect(ACHIEVEMENTS).toHaveLength(34);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(34);
  });

  it("starts with default settings (volume 70, no reduced fx)", () => {
    const p = readProgress();
    expect(p.settings.volume).toBe(70);
    expect(p.settings.reducedFx).toBe(false);
  });

  it("unlocks score achievements at 10k/50k/100k", () => {
    const r1 = recordGame("circuito-neon", summary({ score: 9999 }));
    expect(r1.unlocked).toContain("first-game");
    expect(r1.unlocked).not.toContain("score-10k");
    const r2 = recordGame("circuito-neon", summary({ score: 10_000 }));
    expect(r2.unlocked).toContain("score-10k");
    const r3 = recordGame("circuito-neon", summary({ score: 50_000 }));
    expect(r3.unlocked).toContain("score-50k");
    const r4 = recordGame("circuito-neon", summary({ score: 100_000 }));
    expect(r4.unlocked).toContain("score-100k");
  });

  it("unlocks the table mission achievement on the right table only", () => {
    const r = recordGame("abissal", summary({ missionCompleted: true }));
    expect(r.unlocked).toContain("mission-abissal");
    expect(r.unlocked).not.toContain("mission-circuito-neon");
    expect(readProgress().stats.missionsCompleted.abissal).toBe(1);
  });

  it("unlocks skill/saves/combo achievements from cumulative stats", () => {
    for (let i = 0; i < 5; i++) {
      const r = recordGame("circuito-neon", summary({ skillShots: 1 }));
      if (i === 4) expect(r.unlocked).toContain("skill-5");
      else expect(r.unlocked).not.toContain("skill-5");
    }
    for (let i = 0; i < 10; i++) {
      const r = recordGame("circuito-neon", summary({ ballSaves: 1 }));
      if (i === 9) expect(r.unlocked).toContain("saves-10");
    }
    const rCombo = recordGame("circuito-neon", summary({ bestCombo: 20 }));
    expect(rCombo.unlocked).toContain("combo-20");
  });

  it("unlocks all-tables only after every table is played", () => {
    let last = { unlocked: [] as string[] };
    const ids = TABLES.map((t) => t.id);
    for (let i = 0; i < ids.length - 1; i++) {
      const id = ids[i] ?? "circuito-neon";
      last = recordGame(id, summary());
      expect(last.unlocked).not.toContain("all-tables");
    }
    last = recordGame(ids[ids.length - 1] ?? "circuito-neon", summary());
    expect(last.unlocked).toContain("all-tables");
  });

  it("unlocks the 3.0 achievements from the new cumulative stats", () => {
    let r = recordGame("circuito-neon", summary({ wizardModes: 1 }));
    expect(r.unlocked).toContain("wizard-1");
    r = recordGame("circuito-neon", summary({ mysteryHits: 1 }));
    expect(r.unlocked).toContain("mystery-1");
    r = recordGame("circuito-neon", summary({ extraBalls: 1 }));
    expect(r.unlocked).toContain("extra-ball-1");
    r = recordGame("circuito-neon", summary({ dropsBanked: 5 }));
    expect(r.unlocked).toContain("drop-bank-5");
  });

  it("does not unlock the 3.0 achievements below their thresholds", () => {
    const r = recordGame("circuito-neon", summary({ wizardModes: 0, mysteryHits: 0, extraBalls: 0, dropsBanked: 4, score: 1000 }));
    expect(r.unlocked).not.toContain("wizard-1");
    expect(r.unlocked).not.toContain("mystery-1");
    expect(r.unlocked).not.toContain("extra-ball-1");
    expect(r.unlocked).not.toContain("drop-bank-5");
    expect(r.unlocked).not.toContain("score-200k");
  });

  it("keeps the last 5 scores of history per table", () => {
    for (let i = 1; i <= 7; i++) recordGame("forja-solar", summary({ score: i * 100 }));
    expect(readProgress().stats.highscoresHistory["forja-solar"]).toEqual([300, 400, 500, 600, 700]);
  });

  it("tolerates corrupted storage without throwing", () => {
    window.localStorage.setItem("neonvolt.progress.v1", "{not json");
    expect(readProgress().stats.gamesPlayed).toBe(0);
    expect(() => recordGame("circuito-neon", summary())).not.toThrow();
  });

  it("records the tournament achievement and best score", () => {
    const r = recordTournament(88_000);
    expect(r.unlocked).toContain("tournament");
    expect(readProgress().stats.tournamentBest).toBe(88_000);
    expect(recordTournament(500).unlocked).toEqual([]);
    expect(readProgress().stats.tournamentBest).toBe(88_000);
  });

  it("does not re-unlock achievements", () => {
    recordGame("circuito-neon", summary({ score: 10_000 }));
    const again = recordGame("circuito-neon", summary({ score: 20_000 }));
    expect(again.unlocked).not.toContain("score-10k");
  });
});

describe("NEONVOLT 4.0 — XP, campaign stars and challenges", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("level thresholds follow the cumulative curve", () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(2000);
    expect(xpForLevel(3)).toBe(5500);
    expect(levelInfo(0).level).toBe(1);
    expect(levelInfo(1999).level).toBe(1);
    expect(levelInfo(2000).level).toBe(2);
    expect(levelInfo(5499).level).toBe(2);
    expect(levelInfo(5500).level).toBe(3);
    const info = levelInfo(3000);
    expect(info.into).toBe(1000);
    expect(info.span).toBe(3500);
    expect(info.pct).toBeCloseTo(1000 / 3500);
  });

  it("grants XP at score/100 (half in challenges)", () => {
    const r = recordGame("circuito-neon", summary({ score: 12_345 }));
    expect(r.unlocked).not.toContain("level-5");
    expect(readProgress().xp).toBe(123);
    const c = recordGame("circuito-neon", { ...summary({ score: 100_000 }), challenge: "tempo" });
    expect(c.unlocked).toContain("challenge-1");
    // 100.000/200 = 500 added to the previous 123 → 623
    expect(readProgress().xp).toBe(623);
    expect(readProgress().stats.challengesPlayed).toBe(1);
  });

  it("records challenge bests and unlocks the thresholds", () => {
    const r = recordGame("circuito-neon", { ...summary({ score: 60_000 }), challenge: "tempo" });
    expect(r.unlocked).toContain("tempo-50k");
    expect(readProgress().challengeBest.tempo).toBe(60_000);
    const lower = recordGame("circuito-neon", { ...summary({ score: 10_000 }), challenge: "tempo" });
    expect(lower.unlocked).not.toContain("tempo-50k");
    expect(readProgress().challengeBest.tempo).toBe(60_000);
  });

  it("merges campaign stars without losing previous ones", () => {
    const first = recordGame("circuito-neon", summary({ stars: [true, false, false] }));
    expect(first.unlocked).not.toContain("stars-15");
    expect(readProgress().campaign["circuito-neon"]).toEqual([true, false, false]);
    recordGame("circuito-neon", summary({ stars: [false, true, true] }));
    expect(readProgress().campaign["circuito-neon"]).toEqual([true, true, true]);
    expect(totalStars()).toBe(3);
    // challenges never grant stars
    recordGame("forja-solar", { ...summary({ stars: [true, true, true] }), challenge: "frenesi" });
    expect(readProgress().campaign["forja-solar"]).toBeUndefined();
    expect(totalStars()).toBe(3);
  });

  it("unlocks the 4.0 achievements from cumulative stats", () => {
    let r = recordGame("circuito-neon", summary({ rampRuns: 10 }));
    expect(r.unlocked).toContain("ramp-10");
    r = recordGame("circuito-neon", summary({ magnetHits: 50 }));
    expect(r.unlocked).toContain("magnet-50");
    r = recordGame("circuito-neon", summary({ locksStaged: 1 }));
    expect(r.unlocked).toContain("lock-1");
    r = recordGame("circuito-neon", summary({ score: 500_000 }));
    expect(r.unlocked).toContain("score-500k");
  });

  it("does not unlock the 4.0 stats achievements below thresholds", () => {
    const r = recordGame("circuito-neon", summary({ rampRuns: 9, magnetHits: 49, locksStaged: 0 }));
    expect(r.unlocked).not.toContain("ramp-10");
    expect(r.unlocked).not.toContain("magnet-50");
    expect(r.unlocked).not.toContain("lock-1");
  });

  it("defaults the ball skin to cromada and tolerates v1 progress without it", () => {
    expect(readProgress().settings.ballSkin).toBe("cromada");
    window.localStorage.setItem("neonvolt.progress.v1", JSON.stringify({ stats: {} }));
    expect(readProgress().settings.ballSkin).toBe("cromada");
    expect(readProgress().campaign).toEqual({});
    expect(readProgress().xp).toBe(0);
  });

  it("merges the new stats from the game summary", () => {
    recordGame("circuito-neon", summary({ rampRuns: 3, magnetHits: 7, locksStaged: 2 }));
    const stats = readProgress().stats;
    expect(stats.rampRuns).toBe(3);
    expect(stats.magnetHits).toBe(7);
    expect(stats.locksStaged).toBe(2);
  });
});
