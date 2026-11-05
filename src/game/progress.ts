// NEONVOLT — metagame persistence: stats, achievements and settings.
// Own storage key, tolerant reads (never throws), additive schema.
import { TABLES } from "./tables";
import type { BallSkin, ChallengeId, TableId } from "./types";

/** Campaign star state per table: [mission done, score reached, wizard played]. */
export type CampaignStars = [boolean, boolean, boolean];
export type CampaignProgress = Partial<Record<TableId, CampaignStars>>;
export type ChallengeBest = Partial<Record<ChallengeId, number>>;

export const PROGRESS_KEY = "neonvolt.progress.v1";

export type AchievementId =
  | "first-game"
  | "score-10k"
  | "score-50k"
  | "score-100k"
  | "score-200k"
  | "mission-circuito-neon"
  | "mission-forja-solar"
  | "mission-abissal"
  | "mission-criogenese"
  | "mission-supernova"
  | "mission-vortice-tesla"
  | "mission-nucleo-zero"
  | "all-missions"
  | "skill-5"
  | "saves-10"
  | "combo-20"
  | "tournament"
  | "all-tables"
  | "wizard-1"
  | "mystery-1"
  | "extra-ball-1"
  | "drop-bank-5"
  | "mission-reator-final"
  | "ramp-10"
  | "magnet-50"
  | "lock-1"
  | "stars-15"
  | "stars-36"
  | "challenge-1"
  | "tempo-50k"
  | "frenesi-100k"
  | "level-5"
  | "level-10"
  | "score-500k";

export interface AchievementDef {
  id: AchievementId;
  title: string;
  desc: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first-game", title: "Primeira Descarga", desc: "Jogue a sua primeira partida" },
  { id: "score-10k", title: "Novato do Volt", desc: "Faça 10.000 pontos em uma partida" },
  { id: "score-50k", title: "Circuito Fechado", desc: "Faça 50.000 pontos em uma partida" },
  { id: "score-100k", title: "Magnata do Neon", desc: "Faça 100.000 pontos em uma partida" },
  { id: "score-200k", title: "Sobretensão", desc: "Faça 200.000 pontos em uma partida" },
  { id: "mission-circuito-neon", title: "Sobrecarga", desc: "Complete a missão do Circuito Neon" },
  { id: "mission-forja-solar", title: "Ignição", desc: "Complete a missão da Forja Solar" },
  { id: "mission-abissal", title: "Leviatã", desc: "Complete a missão da Abissal" },
  { id: "mission-criogenese", title: "Zero Absoluto", desc: "Complete a missão da Criogênese" },
  { id: "mission-supernova", title: "Supernova", desc: "Complete a missão da Supernova" },
  { id: "mission-vortice-tesla", title: "Tempestade Enjaulada", desc: "Complete a missão do Vórtice Tesla" },
  { id: "mission-nucleo-zero", title: "Root Access", desc: "Complete a missão do Núcleo Zero" },
  { id: "all-missions", title: "Rede Completa", desc: "Complete a missão de todas as 7 mesas" },
  { id: "skill-5", title: "Olho Clínico", desc: "Acumule 5 skill shots" },
  { id: "saves-10", title: "Rede de Segurança", desc: "Acumule 10 ball saves" },
  { id: "combo-20", title: "Combo x20", desc: "Alcance combo 20 em uma partida" },
  { id: "tournament", title: "Voltagem Total", desc: "Conclua um torneio" },
  { id: "all-tables", title: "Vetoriano", desc: "Jogue todas as mesas ao menos uma vez" },
  { id: "wizard-1", title: "Feiticeiro", desc: "Entre no modo-wizard pela primeira vez" },
  { id: "mystery-1", title: "Caixa Surpresa", desc: "Receba um prêmio mystery" },
  { id: "extra-ball-1", title: "Mais Uma", desc: "Ganhe uma bola extra" },
  { id: "drop-bank-5", title: "Demolidor", desc: "Derrube 5 bancas de drop targets" },
  { id: "mission-reator-final", title: "Colapso", desc: "Complete a missão do Reator Final" },
  { id: "ramp-10", title: "Piloto de Rampa", desc: "Percorra 10 rampas" },
  { id: "magnet-50", title: "Magnetismo", desc: "Seja desviado por ímãs 50 vezes" },
  { id: "lock-1", title: "Alugador", desc: "Trave uma bola no lock pela primeira vez" },
  { id: "stars-15", title: "Ascensão", desc: "Ganhe 15 estrelas na campanha" },
  { id: "stars-36", title: "Constelação", desc: "Ganhe todas as 36 estrelas da campanha" },
  { id: "challenge-1", title: "Fora da Curva", desc: "Jogue um desafio" },
  { id: "tempo-50k", title: "Contra o Relógio", desc: "Faça 50.000 pontos no desafio Contra o Tempo" },
  { id: "frenesi-100k", title: "Delírio Elétrico", desc: "Faça 100.000 pontos no Frenesi" },
  { id: "level-5", title: "Circuito Fechado II", desc: "Alcance o nível 5" },
  { id: "level-10", title: "Reator Vivo", desc: "Alcance o nível 10" },
  { id: "score-500k", title: "Sobrecarga Máxima", desc: "Faça 500.000 pontos em uma partida" },
];

export interface GameStats {
  gamesPlayed: number;
  timePlayedMs: number;
  ballsLaunched: number;
  skillShots: number;
  ballSaves: number;
  bestCombo: number;
  /** Signature missions completed, per table (cumulative) */
  missionsCompleted: Partial<Record<TableId, number>>;
  /** Last 5 scores per table */
  highscoresHistory: Partial<Record<TableId, number[]>>;
  /** Tables played at least once */
  tablesPlayed: TableId[];
  /** Best cumulative tournament score */
  tournamentBest: number;
  /** Drop-target banks cleared (3.0) */
  dropsBanked: number;
  /** Mystery awards collected (3.0) */
  mysteryHits: number;
  /** Wizard modes entered (3.0) */
  wizardModes: number;
  /** Extra balls awarded (3.0) */
  extraBalls: number;
  /** Full volt charges collected (3.0) */
  voltCharges: number;
  /** Ramp traversals (4.0) */
  rampRuns: number;
  /** Times a magnet deflected the ball (4.0) */
  magnetHits: number;
  /** Balls staged into lock kickers (4.0) */
  locksStaged: number;
  /** Challenge games played (4.0) */
  challengesPlayed: number;
}

export interface AchievementState {
  unlocked: AchievementId[];
  /** When each achievement was unlocked (epoch ms) */
  unlockedAt: Partial<Record<AchievementId, number>>;
}

export interface Settings {
  /** 0–100 */
  volume: number;
  /** Fewer particles, no shake */
  reducedFx: boolean;
  /** Ambient music on/off (3.0) */
  music: boolean;
  /** Ball trail rendering on/off (3.0) */
  ballTrail: boolean;
  /** "How to play" overlay already shown */
  tutorialSeen: boolean;
  /** Ball cosmetic unlocked by level (4.0) */
  ballSkin: BallSkin;
}

export interface Progress {
  stats: GameStats;
  achievements: AchievementState;
  settings: Settings;
  /** Campaign stars per table (4.0) */
  campaign: CampaignProgress;
  /** Best score per challenge mode (4.0) */
  challengeBest: ChallengeBest;
  /** Lifetime XP (score/100 per game; challenges score/200) */
  xp: number;
}

export interface GameSummary {
  score: number;
  durationMs: number;
  ballsLaunched: number;
  skillShots: number;
  ballSaves: number;
  bestCombo: number;
  /** Signature mission completed in this game? */
  missionCompleted: boolean;
  /** Drop banks cleared this game (3.0) */
  dropsBanked?: number;
  /** Mystery awards this game (3.0) */
  mysteryHits?: number;
  /** Wizard modes this game (3.0) */
  wizardModes?: number;
  /** Extra balls this game (3.0) */
  extraBalls?: number;
  /** Full volt charges this game (3.0) */
  voltCharges?: number;
  /** Ramp traversals this game (4.0) */
  rampRuns?: number;
  /** Magnet deflections this game (4.0) */
  magnetHits?: number;
  /** Locks staged this game (4.0) */
  locksStaged?: number;
  /** Was this a challenge game (4.0)? Records the best and half XP */
  challenge?: ChallengeId;
  /** Campaign stars earned this game (4.0; normal play only) */
  stars?: CampaignStars;
  /** Was this a tournament table (score counts toward tournament)? */
  tournament?: boolean;
}

const HISTORY_SIZE = 5;

function defaultProgress(): Progress {
  return {
    stats: {
      gamesPlayed: 0,
      timePlayedMs: 0,
      ballsLaunched: 0,
      skillShots: 0,
      ballSaves: 0,
      bestCombo: 0,
      missionsCompleted: {},
      highscoresHistory: {},
      tablesPlayed: [],
      tournamentBest: 0,
      dropsBanked: 0,
      mysteryHits: 0,
      wizardModes: 0,
      extraBalls: 0,
      voltCharges: 0,
      rampRuns: 0,
      magnetHits: 0,
      locksStaged: 0,
      challengesPlayed: 0,
    },
    achievements: { unlocked: [], unlockedAt: {} },
    settings: { volume: 70, reducedFx: false, music: true, ballTrail: true, tutorialSeen: false, ballSkin: "cromada" },
    campaign: {},
    challengeBest: {},
    xp: 0,
  };
}

export function readProgress(): Progress {
  if (typeof window === "undefined") return defaultProgress();
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    if (!raw) return defaultProgress();
    const parsed = JSON.parse(raw) as Partial<Progress>;
    const d = defaultProgress();
    return {
      stats: { ...d.stats, ...(parsed.stats ?? {}) },
      achievements: { ...d.achievements, ...(parsed.achievements ?? {}) },
      settings: { ...d.settings, ...(parsed.settings ?? {}) },
      campaign: { ...d.campaign, ...(parsed.campaign ?? {}) },
      challengeBest: { ...d.challengeBest, ...(parsed.challengeBest ?? {}) },
      xp: parsed.xp ?? 0,
    };
  } catch {
    return defaultProgress();
  }
}

function writeProgress(p: Progress): void {
  try {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
  } catch {
    // storage unavailable: keep in memory only
  }
}

/** Low-level mutation for stats/settings screens; returns the new progress. */
export function updateProgress(fn: (p: Progress) => Progress): Progress {
  const next = fn(readProgress());
  writeProgress(next);
  return next;
}

export function saveSettings(settings: Settings): Progress {
  return updateProgress((p) => ({ ...p, settings }));
}

/** Marks the "how to play" overlay as seen (shown once, PRD 3.0 §6.8). */
export function markTutorialSeen(): Progress {
  return updateProgress((p) => ({ ...p, settings: { ...p.settings, tutorialSeen: true } }));
}

/** Wipes progress, achievements and settings (settings screen reset). */
export function resetProgress(): Progress {
  const fresh = defaultProgress();
  writeProgress(fresh);
  return fresh;
}

/** Cumulative XP needed to reach `level` (level 1 = 0 XP). */
export function xpForLevel(level: number): number {
  const n = Math.max(1, level) - 1;
  return 2000 * n + (1500 * n * (n - 1)) / 2;
}

/** Level state for a given XP amount (pure, testable — PRD 4.0 §6.6). */
export function levelInfo(xp: number): { level: number; into: number; span: number; pct: number } {
  let level = 1;
  while (level < 999 && xpForLevel(level + 1) <= xp) level++;
  const into = xp - xpForLevel(level);
  const span = 2000 + (level - 1) * 1500;
  return { level, into, span, pct: Math.min(1, into / Math.max(1, span)) };
}

/** Adds XP for a finished game (half rate in challenges — PRD 4.0 §6.5). */
export function grantXp(score: number, challenge = false): { xp: number; level: number } {
  const gained = Math.max(0, Math.floor(score / (challenge ? 200 : 100)));
  const next = updateProgress((p) => ({ ...p, xp: p.xp + gained }));
  return { xp: next.xp, level: levelInfo(next.xp).level };
}

/** Total campaign stars collected across all tables (0–36). */
export function totalStars(): number {
  const campaign = readProgress().campaign;
  let total = 0;
  for (const stars of Object.values(campaign)) {
    if (!stars) continue;
    total += (stars[0] ? 1 : 0) + (stars[1] ? 1 : 0) + (stars[2] ? 1 : 0);
  }
  return total;
}

/** Best recorded score of a challenge mode. */
export function challengeBestOf(id: ChallengeId): number {
  return readProgress().challengeBest[id] ?? 0;
}

/**
 * Records a finished game: merges stats, appends score history, merges
 * campaign stars / challenge records / XP and unlocks achievements.
 * Returns the ids unlocked by THIS call (deduped).
 */
export function recordGame(tableId: TableId, s: GameSummary): { unlocked: AchievementId[] } {
  const before = readProgress();
  const st = before.stats;
  const isChallenge = s.challenge !== undefined;
  const stats: GameStats = {
    ...st,
    gamesPlayed: st.gamesPlayed + 1,
    timePlayedMs: st.timePlayedMs + s.durationMs,
    ballsLaunched: st.ballsLaunched + s.ballsLaunched,
    skillShots: st.skillShots + s.skillShots,
    ballSaves: st.ballSaves + s.ballSaves,
    bestCombo: Math.max(st.bestCombo, s.bestCombo),
    dropsBanked: st.dropsBanked + (s.dropsBanked ?? 0),
    mysteryHits: st.mysteryHits + (s.mysteryHits ?? 0),
    wizardModes: st.wizardModes + (s.wizardModes ?? 0),
    extraBalls: st.extraBalls + (s.extraBalls ?? 0),
    voltCharges: st.voltCharges + (s.voltCharges ?? 0),
    rampRuns: st.rampRuns + (s.rampRuns ?? 0),
    magnetHits: st.magnetHits + (s.magnetHits ?? 0),
    locksStaged: st.locksStaged + (s.locksStaged ?? 0),
    challengesPlayed: st.challengesPlayed + (isChallenge ? 1 : 0),
    missionsCompleted: s.missionCompleted
      ? { ...st.missionsCompleted, [tableId]: (st.missionsCompleted[tableId] ?? 0) + 1 }
      : st.missionsCompleted,
    highscoresHistory: {
      ...st.highscoresHistory,
      [tableId]: [...(st.highscoresHistory[tableId] ?? []), s.score].slice(-HISTORY_SIZE),
    },
    tablesPlayed: st.tablesPlayed.includes(tableId) ? st.tablesPlayed : [...st.tablesPlayed, tableId],
    tournamentBest: s.tournament ? Math.max(st.tournamentBest, s.score) : st.tournamentBest,
  };

  // campaign stars: normal play only (PRD 4.0 §6.4)
  const campaign = { ...before.campaign };
  if (s.stars && !isChallenge) {
    const prev = campaign[tableId] ?? [false, false, false];
    campaign[tableId] = [prev[0] || s.stars[0], prev[1] || s.stars[1], prev[2] || s.stars[2]];
  }

  // challenge record (4.0 §6.5)
  const challengeBest = { ...before.challengeBest };
  if (isChallenge && s.challenge) {
    challengeBest[s.challenge] = Math.max(challengeBest[s.challenge] ?? 0, s.score);
  }

  // XP: score/100 per game, half in challenges (4.0 §6.6)
  const xp = before.xp + Math.max(0, Math.floor(s.score / (isChallenge ? 200 : 100)));
  const level = levelInfo(xp).level;

  const unlocked = new Set<AchievementId>(before.achievements.unlocked);
  const now = Date.now();
  const fresh: AchievementId[] = [];
  const grant = (id: AchievementId, condition: boolean): void => {
    if (condition && !unlocked.has(id)) {
      unlocked.add(id);
      fresh.push(id);
    }
  };
  grant("first-game", stats.gamesPlayed >= 1);
  grant("score-10k", s.score >= 10_000);
  grant("score-50k", s.score >= 50_000);
  grant("score-100k", s.score >= 100_000);
  grant("score-200k", s.score >= 200_000);
  if (s.missionCompleted) grant(`mission-${tableId}` as AchievementId, true);
  grant("skill-5", stats.skillShots >= 5);
  grant("saves-10", stats.ballSaves >= 10);
  grant("combo-20", stats.bestCombo >= 20);
  grant("all-tables", TABLES.every((t) => stats.tablesPlayed.includes(t.id)));
  grant("wizard-1", stats.wizardModes >= 1);
  grant("mystery-1", stats.mysteryHits >= 1);
  grant("extra-ball-1", stats.extraBalls >= 1);
  grant("drop-bank-5", stats.dropsBanked >= 5);
  grant("all-missions", TABLES.every((t) => (stats.missionsCompleted[t.id] ?? 0) >= 1));
  grant("ramp-10", stats.rampRuns >= 10);
  grant("magnet-50", stats.magnetHits >= 50);
  grant("lock-1", stats.locksStaged >= 1);
  const starsNow = Object.values(campaign).reduce<number>(
    (acc, st3) => acc + (st3 ? (st3[0] ? 1 : 0) + (st3[1] ? 1 : 0) + (st3[2] ? 1 : 0) : 0),
    0,
  );
  grant("stars-15", starsNow >= 15);
  grant("stars-36", starsNow >= 36);
  grant("challenge-1", stats.challengesPlayed >= 1);
  grant("tempo-50k", (challengeBest.tempo ?? 0) >= 50_000);
  grant("frenesi-100k", (challengeBest.frenesi ?? 0) >= 100_000);
  grant("level-5", level >= 5);
  grant("level-10", level >= 10);
  grant("score-500k", s.score >= 500_000);

  const achievements: AchievementState = { unlocked: [...unlocked], unlockedAt: { ...before.achievements.unlockedAt } };
  for (const id of fresh) achievements.unlockedAt[id] = now;

  const next: Progress = { stats, achievements, settings: before.settings, campaign, challengeBest, xp };
  writeProgress(next);
  return { unlocked: fresh };
}

/** Marks a full tournament completion with the given cumulative score. */
export function recordTournament(totalScore: number): { unlocked: AchievementId[] } {
  const before = readProgress();
  const unlocked = new Set<AchievementId>(before.achievements.unlocked);
  const fresh: AchievementId[] = [];
  if (totalScore > 0 && !unlocked.has("tournament")) {
    unlocked.add("tournament");
    fresh.push("tournament");
  }
  const now = Date.now();
  const achievements: AchievementState = { unlocked: [...unlocked], unlockedAt: { ...before.achievements.unlockedAt } };
  for (const id of fresh) achievements.unlockedAt[id] = now;
  const next: Progress = {
    stats: { ...before.stats, tournamentBest: Math.max(before.stats.tournamentBest, totalScore) },
    achievements,
    settings: before.settings,
    campaign: before.campaign,
    challengeBest: before.challengeBest,
    xp: before.xp,
  };
  writeProgress(next);
  return { unlocked: fresh };
}
