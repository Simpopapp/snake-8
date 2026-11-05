// NEONVOLT — shared game types. Pure types only: no React, no Matter imports.
// This module is the contract between engine, renderer, tables and UI.

export interface Vec2 {
  x: number;
  y: number;
}

/** Virtual playfield coordinate space every table is authored in. */
export const TABLE_WIDTH = 540;
export const TABLE_HEIGHT = 960;

export type TableId =
  | "circuito-neon"
  | "forja-solar"
  | "abissal"
  | "criogenese"
  | "supernova"
  | "vortice-tesla"
  | "nucleo-zero"
  | "orquestra-neural"
  | "deserto-estatico"
  | "catedral-fonica"
  | "cidade-vapor"
  | "reator-final";

/** Ball cosmetics unlocked by player level (4.0). */
export type BallSkin = "cromada" | "plasma" | "ouro" | "holo" | "vortice";

/** Alternative rule sets (4.0 desafios). Modifiers live in the engine. */
export type ChallengeId = "tempo" | "umabola" | "caos" | "frenesi";

/** Table color identity — everything in the renderer derives from this. */
export interface TablePalette {
  /** Playfield background base */
  bg: string;
  /** Background detail accent (grid, brasa, plâncton, floco) */
  bgDetail: string;
  /** Wall / rail neon */
  wall: string;
  /** Primary interactive glow (bumpers) */
  glowA: string;
  /** Secondary glow (targets, spinner) */
  glowB: string;
  /** Ball trail + jackpot accent */
  hot: string;
  /** Muted structure lines */
  dim: string;
}

export type TableElement =
  | {
      kind: "bumper";
      id: string;
      pos: Vec2;
      radius: number;
      /** Points per hit */
      score: number;
      /** Impulse strength applied on hit */
      power: number;
      color?: "glowA" | "glowB";
      /** 4.0: patrol path (px/tick) — body loops the path continuously */
      patrol?: { path: Vec2[]; speed: number };
    }
  | {
      kind: "sling";
      id: string;
      /** Triangle: three points, the middle facet is the active face */
      a: Vec2;
      b: Vec2;
      c: Vec2;
      score: number;
      power: number;
    }
  | {
      kind: "target";
      id: string;
      pos: Vec2;
      /** Half width/height of the target plate */
      w: number;
      h: number;
      angle?: number;
      score: number;
      /** Group id — when every target in a group is down, the group awards */
      group: string;
    }
  | {
      kind: "drop";
      id: string;
      pos: Vec2;
      w: number;
      h: number;
      angle?: number;
      score: number;
      group: string;
      /** 4.0: patrol path (px/tick) — body loops the path continuously */
      patrol?: { path: Vec2[]; speed: number };
    }
  | {
      /** 4.0: elevated rail sensor — ball entering the start travels the path and exits boosted */
      kind: "ramp";
      id: string;
      /** Polyline path with >= 3 points; ball must reach the end */
      path: Vec2[];
      /** Visual ribbon width (18–30) */
      width: number;
      score: number;
      /** Exit velocity multiplier (1.05–1.6) */
      boost: number;
    }
  | {
      /** 4.0: force field that curves trajectories inside the radius */
      kind: "magnet";
      id: string;
      pos: Vec2;
      radius: number;
      /** Radial pull per tick inside the radius (0.02–0.12) */
      strength: number;
      score: number;
    }
  | {
      kind: "spinner";
      id: string;
      pos: Vec2;
      length: number;
      /** Points per hit on the spinner blade */
      score: number;
    }
  | {
      kind: "kicker";
      id: string;
      pos: Vec2;
      radius: number;
      /** Where the ball is teleported/ejected */
      ejectTo: Vec2;
      score: number;
      /** Hold seconds before eject */
      hold: number;
      /** 4.0: ball lock — the kicker RETAINS the ball until released (multiball/safety) */
      lock?: boolean;
    };

/** A polyline wall segment chain (static body). */
export interface WallChain {
  id: string;
  points: Vec2[];
  /** Optional arc rendering hint: closed shape gets filled frame styling */
  closed?: boolean;
  /** Visual thickness of the neon rail (physical thickness is fixed) */
  rail?: number;
  /** One-way gate: ball passes only left→right or top→bottom through `points[0]→points[1]` */
  gate?: boolean;
}

export interface LaunchLane {
  /** Inner lane wall chain from plunger bottom to lane top */
  x: number;
  /** y where the ball waits on the plunger */
  ballRestY: number;
  /** Plunger release impulse base */
  power: number;
}

export interface FlipperDef {
  /** Pivot point */
  pivot: Vec2;
  length: number;
  /** Rest angle (degrees, 0 = pointing right/left horizontally inward) */
  restAngle: number;
  /** Deployed (pressed) angle in degrees */
  activeAngle: number;
  side: "left" | "right";
}

export type MissionKind =
  | { type: "hits"; elementId: string; count: number }
  | { type: "group"; groupId: string }
  | { type: "spinnerHold"; spinnerId: string; seconds: number }
  | { type: "ramp"; rampId: string; count: number };

export type MissionReward =
  | { type: "multiball"; balls: number }
  | { type: "jackpot"; score: number }
  | { type: "iceBall"; seconds: number };

export interface TableMission {
  /** Signature objective shown on the HUD */
  title: string;
  /** One-line description */
  hint: string;
  goal: MissionKind;
  reward: MissionReward;
  /** Points for completing */
  score: number;
}

/** Secondary mission: smaller goal, score-only reward, re-armable like the signature. */
export interface MiniMission {
  id: string;
  title: string;
  hint: string;
  goal: MissionKind;
  score: number;
}

export interface TableDef {
  id: TableId;
  name: string;
  subtitle: string;
  palette: TablePalette;
  gravity: number;
  walls: WallChain[];
  elements: TableElement[];
  flippers: [FlipperDef, FlipperDef];
  launch: LaunchLane;
  mission: TableMission;
  /** Secondary missions (2 per table); score-only rewards */
  miniMissions?: MiniMission[];
  /** Extra engine tuning */
  ballRestitution?: number;
  ballRadius?: number;
  /** Max simultaneous balls (multiball cap) */
  maxBalls?: number;
  /** 4.0: score threshold for campaign star ② */
  starScore: number;
  /** 4.0: menu unlocks the table only with >= N campaign stars (UI gate) */
  lockedByStars?: number;
}

// ---------- Runtime types (engine → UI) ----------

export interface MiniMissionHud {
  id: string;
  title: string;
  progress: string;
  done: boolean;
}

export interface HudSnapshot {
  tableId: TableId;
  tableName: string;
  score: number;
  balls: number;
  ballNumber: number;
  multiplier: number;
  multiball: number;
  objective: string;
  objectiveProgress: string;
  objectiveDone: boolean;
  paused: boolean;
  tilt: boolean;
  kickbackArmed: boolean;
  muted: boolean;
  fps: number;
  /** Element id currently lit for the skill shot (null when none) */
  skillShotId: string | null;
  /** Seconds left in the ball-save window (0 when off) */
  ballSaveSeconds: number;
  /** Current combo streak (consecutive hits inside the combo window) */
  combo: number;
  /** Secondary missions with live progress */
  miniMissions: MiniMissionHud[];
  /** Volt charge collected this ball (gates) and the table's max */
  voltCharge: number;
  voltMax: number;
  /** Mystery lamp lit (awarded by the kicker) */
  mysteryLit: boolean;
  /** Ticks left in wizard mode (0 when off) */
  wizardTicks: number;
  /** Tilt warnings issued before the full tilt (0–2) */
  tiltWarnings: number;
  /** Drop-target banks: how many are down / total */
  drops: { groupId: string; down: number; total: number }[];
  /** 4.0: balls currently held by kickers with lock */
  lockedBalls: number;
  /** 4.0: seconds left in a timed challenge (null when not a timed mode) */
  challengeSecondsLeft: number | null;
  /** 4.0: active challenge id (null in normal play) */
  challengeId: ChallengeId | null;
  /** 4.0: frenzy challenge active (score ×2) */
  frenzy: boolean;
  /** 4.0: campaign star state of the current table (UI-computed) */
  stars?: [boolean, boolean, boolean];
}

export type GameEvent =
  | { type: "bumperHit"; elementId: string; score: number; pos: Vec2 }
  | { type: "slingHit"; elementId: string; score: number; pos: Vec2 }
  | { type: "targetDown"; elementId: string; groupId: string; pos: Vec2 }
  | { type: "groupCleared"; groupId: string; score: number }
  | { type: "spinner"; score: number }
  | { type: "ramp"; elementId: string; score: number }
  | { type: "kicker"; pos: Vec2 }
  | { type: "kickback"; pos: Vec2 }
  | { type: "launch"; power: number }
  | { type: "ballLost"; ballsRemaining: number }
  | { type: "bonusAwarded"; score: number; multiplier: number }
  | { type: "missionComplete"; score: number; title: string }
  | { type: "reward"; reward: MissionReward }
  | { type: "multiballStarted"; balls: number }
  | { type: "tilt" }
  | { type: "gameOver"; finalScore: number }
  | { type: "shake"; strength: number }
  | { type: "nudge" }
  | { type: "skillShotLit"; elementId: string }
  | { type: "skillShotHit"; elementId: string; score: number }
  | { type: "skillShotMiss" }
  | { type: "ballSaveUsed" }
  | { type: "ballSaved" }
  | { type: "combo"; count: number; score: number }
  | { type: "miniMissionComplete"; id: string; title: string; score: number }
  | { type: "dropHit"; elementId: string; groupId: string; pos: Vec2 }
  | { type: "bankCleared"; groupId: string; score: number; pos: Vec2 }
  | { type: "voltCharged"; charge: number; max: number }
  | { type: "jackpot"; score: number; pos: Vec2 }
  | { type: "mysteryLit" }
  | { type: "mysteryAward"; award: "score" | "mult" | "ball" | "save"; score: number }
  | { type: "wizardStarted" }
  | { type: "wizardEnded"; score: number }
  | { type: "extraBall"; total: number }
  | { type: "tiltWarning"; warnings: number }
  | { type: "tournamentTableComplete"; tableId: TableId; score: number }
  | { type: "rampRun"; elementId: string; score: number; pos: Vec2 }
  | { type: "magnetPulled"; elementId: string; pos: Vec2 }
  | { type: "lockStaged"; total: number; pos: Vec2 }
  | { type: "lockReleased"; balls: number }
  | { type: "starEarned"; tableId: TableId; index: 1 | 2 | 3 }
  | { type: "challengeEnded"; id: ChallengeId; score: number; timeout: boolean }
  | { type: "frenzyActive"; on: boolean };

export interface GameCallbacks {
  onHud?: (hud: HudSnapshot) => void;
  onEvent?: (event: GameEvent) => void;
}

export type GameInput =
  | "leftDown"
  | "leftUp"
  | "rightDown"
  | "rightUp"
  | "plungerDown"
  | "plungerUp"
  | "nudge";

export interface GameHandle {
  start: () => void;
  pause: () => void;
  resume: () => void;
  input: (input: GameInput) => void;
  destroy: () => void;
}

/** Per-game numbers collected by the engine for the meta layer. */
export interface GameStatsSummary {
  durationMs: number;
  ballsLaunched: number;
  skillShots: number;
  ballSaves: number;
  bestCombo: number;
  missionCompleted: boolean;
  /** Drop-target banks cleared */
  dropsBanked: number;
  /** Mystery awards collected */
  mysteryHits: number;
  /** Wizard modes entered */
  wizardModes: number;
  /** Extra balls awarded */
  extraBalls: number;
  /** Full volt charges collected */
  voltCharges: number;
  /** Ramp traversals (4.0) */
  rampRuns: number;
  /** Times a magnet deflected the ball (4.0) */
  magnetHits: number;
  /** Balls staged into lock kickers (4.0) */
  locksStaged: number;
}

// ---------- Persistence ----------

export interface HighScores {
  global: number;
  perTable: Partial<Record<TableId, number>>;
}

export const STORAGE_KEY = "neonvolt.v1";
