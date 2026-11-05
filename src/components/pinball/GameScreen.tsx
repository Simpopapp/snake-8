// NEONVOLT 3.0 — game screen: canvas, engine wiring, HUD, DMD display,
// overlays, controls, music lifecycle, metagame results.
import { Pause, Star, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { ensureAudio, playEvent, setMusicChallenge, setMusicEnabled, setMusicIntensity, startMusic, stopMusic } from "@/game/audio";
import { createDmd, type DmdHandle } from "@/game/dmd";
import { PinballGame, type RenderView } from "@/game/engine";
import { drawFrame } from "@/game/renderer";
import type { FxState } from "@/game/fx";
import { markTutorialSeen, type AchievementId, type Settings } from "@/game/progress";
import type { ChallengeId, GameEvent, GameStatsSummary, HudSnapshot, TableDef } from "@/game/types";
import { cn } from "@/lib/utils";

export interface GameResult {
  score: number;
  stats: GameStatsSummary;
  isRecord: boolean;
  unlocked: AchievementId[];
  /** Campaign stars earned this game (single-table normal play) */
  stars?: [boolean, boolean, boolean];
  /** Challenge mode this game was played in */
  challenge?: ChallengeId;
  /** XP granted for this game */
  xpGained?: number;
  /** Player level after this game */
  level?: number;
  /** Tournament: cumulative total after this table */
  tournamentTotal?: number;
  /** Tournament: this was the last table */
  tournamentFinal?: boolean;
}

const CHALLENGE_LABEL: Record<ChallengeId, string> = {
  tempo: "CONTRA O TEMPO",
  umabola: "UMA BOLA",
  caos: "CAOS",
  frenesi: "FRENESI",
};

export interface TournamentInfo {
  tableIndex: number;
  totalSoFar: number;
  tablesTotal: number;
}

interface GameScreenProps {
  table: TableDef;
  tournament?: TournamentInfo | undefined;
  challenge?: ChallengeId | undefined;
  result: GameResult | null;
  onExit: () => void;
  onRestart: () => void;
  onGameOver: (finalScore: number, stats: GameStatsSummary) => void;
  onTournamentNext: () => void;
  muted: boolean;
  onToggleMute: () => void;
  settings: Settings;
  /** 4.0: keeps PinballApp settings state in sync (e.g. tutorialSeen). */
  onSettingsChange?: (s: Settings) => void;
}

const INITIAL_HUD: HudSnapshot = {
  tableId: "circuito-neon",
  tableName: "",
  score: 0,
  balls: 3,
  ballNumber: 1,
  multiplier: 1,
  multiball: 1,
  objective: "",
  objectiveProgress: "",
  objectiveDone: false,
  paused: false,
  tilt: false,
  kickbackArmed: true,
  muted: false,
  fps: 60,
  skillShotId: null,
  ballSaveSeconds: 0,
  combo: 0,
  miniMissions: [],
  voltCharge: 0,
  voltMax: 5,
  mysteryLit: false,
  wizardTicks: 0,
  tiltWarnings: 0,
  drops: [],
  lockedBalls: 0,
  challengeSecondsLeft: null,
  challengeId: null,
  frenzy: false,
};

export function GameScreen({
  table,
  tournament,
  challenge,
  result,
  onExit,
  onRestart,
  onGameOver,
  onTournamentNext,
  muted,
  onToggleMute,
  settings,
  onSettingsChange,
}: GameScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dmdCanvasRef = useRef<HTMLCanvasElement>(null);
  const dmdRef = useRef<DmdHandle | null>(null);
  const hudRef = useRef<HudSnapshot>({ ...INITIAL_HUD, tableId: table.id, tableName: table.name });
  const gameRef = useRef<PinballGame | null>(null);
  // ball skin lives in a ref so the render loop always reads the live setting
  const skinRef = useRef(settings.ballSkin);
  skinRef.current = settings.ballSkin;
  const pausedRef = useRef(false);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const [hud, setHud] = useState<HudSnapshot>({ ...INITIAL_HUD, tableId: table.id, tableName: table.name });
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [shownScore, setShownScore] = useState(0);
  const [showTutorial, setShowTutorial] = useState(!settings.tutorialSeen);
  // star ③ tracker: wizard mode entered at least once this game
  const [wizardSeen, setWizardSeen] = useState(false);

  const wakeRef = useRef<() => void>(() => {});
  wakeRef.current = () => {
    ensureAudio();
    if (!mutedRef.current && settings.music) startMusic(table.id);
  };

  /** Priority-ranked DMD choreography for one event (PRD 3.0 §6.6). */
  const announceRef = useRef<(evt: GameEvent) => void>(() => {});
  announceRef.current = (evt: GameEvent) => {
    const dmd = dmdRef.current;
    if (!dmd) return;
    const show = (text: string, priority: number, ms = 1600, flash = false): void =>
      dmd.show(text, { priority, ms, flash });
    switch (evt.type) {
      case "wizardStarted":
        show("WIZARD MODE", 9, 2500, true);
        break;
      case "wizardEnded":
        show(`WIZARD +${evt.score.toLocaleString("pt-BR")}`, 9, 2500, true);
        break;
      case "jackpot":
        show("JACKPOT!", 8, 2200, true);
        break;
      case "multiballStarted":
        show(`MULTIBALL x${evt.balls}`, 7, 2200, true);
        break;
      case "mysteryAward":
        show(
          evt.award === "score"
            ? "MYSTERY +5.000"
            : evt.award === "mult"
              ? `MYSTERY x${evt.score}`
              : evt.award === "ball"
                ? "MYSTERY BOLA"
                : "MYSTERY SAVE",
          6,
          2000,
          true,
        );
        break;
      case "extraBall":
        show("BOLA EXTRA", 6, 2200, true);
        break;
      case "missionComplete":
        show(evt.title, 5);
        break;
      case "miniMissionComplete":
        show(evt.title, 5);
        break;
      case "combo":
        if (evt.count >= 10) show(`COMBO x${evt.count}`, 4);
        break;
      case "ballSaveUsed":
        show("SAVE!", 4);
        break;
      case "skillShotHit":
        show(`SKILL +${evt.score.toLocaleString("pt-BR")}`, 3);
        break;
      case "bankCleared":
        show("BANCA +5.000", 3);
        break;
      case "lockStaged":
        show(evt.total > 1 ? `LOCK x${evt.total}` : "LOCK!", 5, 1800, true);
        break;
      case "lockReleased":
        show(`LOCK SOLTO x${evt.balls}`, 7, 2200, true);
        break;
      case "rampRun":
        show(`RAMPA +${evt.score.toLocaleString("pt-BR")}`, 3);
        break;
      case "frenzyActive":
        show(evt.on ? "FRENESI ×2" : "FRENESI FIM", 8, 2500, true);
        break;
      case "challengeEnded":
        show(evt.timeout ? "TEMPO ESGOTADO" : "DESAFIO FIM", 10, 4000, true);
        break;
      case "gameOver":
        show("FIM DE JOGO", 10, 4000, true);
        break;
      default:
        break;
    }
  };

  // engine lifecycle
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const game = new PinballGame(
      canvas,
      table,
      {
        onHud: (snapshot) => {
          hudRef.current = snapshot;
          setHud(snapshot);
          // music intensity follows the heat of the game (PRD 3.0 §6.7)
          setMusicIntensity(Math.min(1, (snapshot.multiball > 1 ? 0.5 : 0) + snapshot.combo / 20));
        },
        onEvent: (evt: GameEvent) => {
          playEvent(evt);
          announceRef.current(evt);
          if (evt.type === "wizardStarted") setWizardSeen(true);
          if (evt.type === "gameOver") {
            stopMusic();
            setGameOver(true);
            onGameOver(evt.finalScore, game.getStats());
          }
        },
      },
      {
        balls: tournament ? 2 : 3,
        ...(challenge ? { mode: { kind: "challenge" as const, id: challenge } } : {}),
      },
    );
    game.setDrawFn((view: RenderView, fx: FxState, t: number) => drawFrame(ctx, table, view, fx, t, skinRef.current));
    // challenge "tempo" runs the music 10% faster (4.0 §6.5)
    setMusicChallenge(challenge === "tempo");
    game.start();
    gameRef.current = game;
    if (import.meta.env.DEV) {
      // E2E/test hook: exposes the engine handle to the browser console.
      (window as unknown as { __nvGame?: PinballGame }).__nvGame = game;
    }

    const releaseAndPause = () => {
      game.releaseInputs();
      touchLeft.current.clear();
      touchRight.current.clear();
      activePointers.current.clear();
      game.pause();
      stopMusic();
      pausedRef.current = true;
      setPaused(true);
    };
    const onHidden = () => {
      if (document.hidden) releaseAndPause();
    };
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("blur", releaseAndPause);

    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("blur", releaseAndPause);
      observer.disconnect();
      delete (window as unknown as { __nvGame?: unknown }).__nvGame;
      setMusicChallenge(false);
      stopMusic();
      game.destroy();
      gameRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table.id]);

  // mute toggle controls the ambient music too
  useEffect(() => {
    if (muted) stopMusic();
    else if (!pausedRef.current && !gameOver && settings.music) startMusic(table.id);
  }, [muted, table.id, gameOver, settings.music]);

  // DMD display: own animation loop, score/line mirrors + message queue
  useEffect(() => {
    const canvas = dmdCanvasRef.current;
    if (!canvas) return;
    const dmd = createDmd(canvas);
    dmdRef.current = dmd;
    dmd.setLine(table.name);
    // 4.0: the DMD borrows the table palette for colored messages
    dmd.setColor(table.palette);
    let raf = 0;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      dmd.setScore(hudRef.current.score);
      dmd.setLine(tournament ? `TORNEIO ${tournament.tableIndex + 1}/${tournament.tablesTotal}` : hudRef.current.objective);
      dmd.tick(t);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      dmd.destroy();
      dmdRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table.id]);

  // music on/off setting
  useEffect(() => {
    setMusicEnabled(settings.music);
  }, [settings.music]);

  // game-over score count-up (PRD 3.0 §6.8)
  useEffect(() => {
    if (!gameOver || !result) {
      setShownScore(0);
      return;
    }
    const target = result.score;
    const started = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - started) / 1200);
      const eased = 1 - Math.pow(1 - k, 3);
      setShownScore(Math.round(target * eased));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [gameOver, result]);

  // keyboard
  useEffect(() => {
    const game = () => gameRef.current;
    const down = (e: KeyboardEvent) => {
      wakeRef.current();
      switch (e.code) {
        case "ArrowLeft":
        case "KeyZ":
        case "KeyA":
          game()?.input("leftDown");
          e.preventDefault();
          break;
        case "ArrowRight":
        case "KeyX":
        case "KeyL":
          game()?.input("rightDown");
          e.preventDefault();
          break;
        case "ArrowDown":
        case "Space":
        case "Enter":
          game()?.input("plungerDown");
          e.preventDefault();
          break;
        case "ShiftLeft":
        case "ShiftRight":
          if (!e.repeat) game()?.input("nudge");
          break;
        case "Escape":
        case "KeyP": {
          if (e.repeat) break;
          const g = game();
          if (!g) break;
          pausedRef.current = !pausedRef.current;
          if (pausedRef.current) {
            g.pause();
            stopMusic();
          } else if (!mutedRef.current) {
            g.resume();
            startMusic(table.id);
          } else {
            g.resume();
          }
          setPaused(pausedRef.current);
          e.preventDefault();
          break;
        }
        default:
          break;
      }
    };
    const up = (e: KeyboardEvent) => {
      switch (e.code) {
        case "ArrowLeft":
        case "KeyZ":
        case "KeyA":
          game()?.input("leftUp");
          break;
        case "ArrowRight":
        case "KeyX":
        case "KeyL":
          game()?.input("rightUp");
          break;
        case "ArrowDown":
        case "Space":
        case "Enter":
          game()?.input("plungerUp");
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table.id]);

  // touch flippers: multitouch via pointer events on the two halves
  const touchLeft = useRef(new Set<number>());
  const touchRight = useRef(new Set<number>());
  const activePointers = useRef(new Map<number, "left" | "right" | "plunger">());

  const pointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    wakeRef.current();
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - rect.left) / rect.width;
    if (rel < 0.44) {
      touchLeft.current.add(e.pointerId);
      activePointers.current.set(e.pointerId, "left");
      gameRef.current?.input("leftDown");
    } else if (rel > 0.56) {
      touchRight.current.add(e.pointerId);
      activePointers.current.set(e.pointerId, "right");
      gameRef.current?.input("rightDown");
    } else {
      activePointers.current.set(e.pointerId, "plunger");
      gameRef.current?.input("plungerDown");
    }
  }, []);

  const pointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const kind = activePointers.current.get(e.pointerId);
    activePointers.current.delete(e.pointerId);
    if (kind === "left") {
      touchLeft.current.delete(e.pointerId);
      if (touchLeft.current.size === 0) gameRef.current?.input("leftUp");
    } else if (kind === "right") {
      touchRight.current.delete(e.pointerId);
      if (touchRight.current.size === 0) gameRef.current?.input("rightUp");
    } else if (kind === "plunger") {
      gameRef.current?.input("plungerUp");
    }
  }, []);

  const resume = () => {
    pausedRef.current = false;
    setPaused(false);
    gameRef.current?.resume();
    if (!mutedRef.current) startMusic(table.id);
  };

  const restart = () => {
    onRestart();
  };

  const format = (n: number) => n.toLocaleString("pt-BR");
  const formatTime = (ms: number) => {
    const s = Math.round(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };

  /** Rank title for the final score (PRD 3.0 §6.8). */
  const rankFor = (score: number): string =>
    score >= 250_000
      ? "LENDA SUPREMA"
      : score >= 120_000
        ? "LENDA"
        : score >= 60_000
          ? "MESTRE"
          : score >= 20_000
            ? "VETERANO"
            : "APRENDIZ";

  const overlayTitle = tournament
    ? result?.tournamentFinal
      ? "TORNEIO COMPLETO"
      : `MESA ${tournament.tableIndex + 1} CONCLUÍDA`
    : challenge
      ? "DESAFIO ENCERRADO"
      : "FIM DE JOGO";

  return (
    <div className="relative flex h-dvh flex-col bg-background">
      {/* HUD */}
      <div className="flex items-center justify-between gap-3 px-3 py-2 sm:px-5">
        <div className="min-w-0">
          <p className="font-display truncate text-3xl leading-none text-foreground tabular-nums sm:text-4xl">
            {format(hud.score)}
          </p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {table.name} · bola {hud.ballNumber}/{hud.balls}
          </p>
        </div>
        <div className="flex flex-col items-center px-2">
          <p className="font-display text-2xl leading-none text-accent nv-glow-text">
            ×{hud.multiplier}
          </p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">mult.</p>
        </div>
        <div className="min-w-0 flex-1 text-center sm:flex-none sm:px-4">
          <p
            className={cn(
              "truncate font-display text-lg tracking-wide sm:text-xl",
              hud.objectiveDone ? "text-primary nv-glow-text" : "text-muted-foreground",
            )}
          >
            {hud.objective}
          </p>
          <p className="text-[10px] text-muted-foreground">{hud.objectiveProgress}</p>
        </div>
        <div className="flex items-center gap-2">
          {challenge && (
            <span className="font-display rounded-md bg-accent/20 px-2 py-1 text-sm text-accent">
              {CHALLENGE_LABEL[challenge]}
            </span>
          )}
          {hud.challengeSecondsLeft !== null && (
            <span
              className={cn(
                "font-display rounded-md px-2 py-1 text-sm tabular-nums",
                hud.challengeSecondsLeft <= 15 ? "animate-pulse bg-destructive/25 text-destructive" : "bg-primary/20 text-primary",
              )}
            >
              ⏱ {Math.ceil(hud.challengeSecondsLeft)}s
            </span>
          )}
          {hud.frenzy && (
            <span className="font-display animate-pulse rounded-md bg-primary/25 px-2 py-1 text-sm text-primary nv-glow-text">
              FRENESI ×2
            </span>
          )}
          {/* star tracker (4.0): missão · score · wizard */}
          <div className="flex items-center gap-1" aria-label="Estrelas da mesa">
            {(
              [
                ["M", hud.objectiveDone],
                ["P", hud.score >= table.starScore],
                ["W", wizardSeen],
              ] as const
            ).map(([label, lit]) => (
              <span
                key={label}
                className={cn(
                  "flex size-5 items-center justify-center rounded-full border text-[9px] font-bold",
                  lit
                    ? "border-primary bg-primary/20 text-primary nv-glow-text"
                    : "border-border text-muted-foreground/60",
                )}
              >
                {label}
              </span>
            ))}
          </div>
          {tournament && (
            <span className="font-display hidden rounded-md bg-accent/15 px-2 py-1 text-xs text-accent sm:inline">
              TORNEIO {tournament.tableIndex + 1}/{tournament.tablesTotal}
            </span>
          )}
          {hud.multiball > 1 && (
            <span className="font-display animate-pulse rounded-md bg-primary/20 px-2 py-1 text-sm text-primary">
              {hud.multiball} BOLAS
            </span>
          )}
          {hud.combo >= 2 && (
            <span className="font-display rounded-md bg-accent/20 px-2 py-1 text-sm text-accent">
              COMBO ×{hud.combo}
            </span>
          )}
          {hud.wizardTicks > 0 && (
            <span className="font-display animate-pulse rounded-md bg-primary/30 px-2 py-1 text-sm text-primary nv-glow-text">
              WIZARD {Math.ceil(hud.wizardTicks)}s
            </span>
          )}
          {hud.mysteryLit && (
            <span className="font-display animate-pulse rounded-md bg-accent/20 px-2 py-1 text-sm text-accent">
              MYSTERY
            </span>
          )}
          {hud.voltCharge >= hud.voltMax && (
            <span className="font-display animate-pulse rounded-md bg-primary/30 px-2 py-1 text-sm text-primary">
              JACKPOT PRONTO
            </span>
          )}
          {hud.tiltWarnings > 0 && !hud.tilt && (
            <span className="font-display animate-pulse rounded-md bg-destructive/25 px-2 py-1 text-sm text-destructive">
              AVISO {hud.tiltWarnings}/2
            </span>
          )}
          {hud.ballSaveSeconds > 0 && (
            <span className="font-display rounded-md bg-primary/20 px-2 py-1 text-sm text-primary">
              SALVA-BOLA {Math.ceil(hud.ballSaveSeconds)}s
            </span>
          )}
          <span
            className={cn(
              "rounded-md px-2 py-1 text-xs",
              hud.kickbackArmed ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground/50",
            )}
          >
            KICKBACK
          </span>
          <button
            type="button"
            aria-label={muted ? "Ativar som" : "Silenciar"}
            className="rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground"
            onClick={onToggleMute}
          >
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
          <button
            type="button"
            aria-label="Pausar"
            className="rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground"
            onClick={() => {
              pausedRef.current = true;
              gameRef.current?.pause();
              stopMusic();
              setPaused(true);
            }}
          >
            <Pause className="size-4" />
          </button>
        </div>
      </div>

      {/* mini missions strip */}
      {hud.miniMissions.length > 0 && (
        <div className="flex items-center justify-center gap-4 px-3 pb-1 sm:gap-6">
          {hud.miniMissions.map((m) => (
            <span
              key={m.id}
              className={cn(
                "text-[10px] uppercase tracking-widest",
                m.done ? "text-primary nv-glow-text" : "text-muted-foreground",
              )}
            >
              {m.title} {m.progress}
            </span>
          ))}
        </div>
      )}

      {/* DMD: dot-matrix display above the playfield */}
      <div className="relative z-10 mx-auto flex h-14 w-full max-w-xl items-center justify-center px-3 sm:h-16">
        <div className="nv-scanlines relative h-full w-full overflow-hidden rounded-lg border border-primary/25 bg-black shadow-[0_0_30px_-10px_var(--color-primary)]">
          <canvas ref={dmdCanvasRef} className="h-full w-full" aria-label="Painel de pontos" />
        </div>
      </div>

      {/* playfield */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-1 pb-1 sm:px-3 sm:pb-3">
        <div className="relative h-full w-full max-w-[min(100cqh*0.5625,100%)]">
          <canvas ref={canvasRef} className="h-full w-full" />
          {/* touch zones (only useful with touch, harmless with mouse) */}
          <div
            className="absolute inset-0 grid grid-cols-[44fr_12fr_44fr] touch-none select-none"
            onPointerDown={pointerDown}
            onPointerUp={pointerUp}
            onPointerCancel={pointerUp}
            onPointerLeave={pointerUp}
          >
            <div className="col-start-1 h-full" aria-label="Flipper esquerdo (toque)" />
            <div className="col-start-2 h-full" aria-label="Lançador (toque)" />
            <div className="col-start-3 h-full" aria-label="Flipper direito (toque)" />
          </div>
        </div>
      </div>

      {/* pause overlay */}
      {paused && !gameOver && (
        <Overlay title="PAUSA">
          <div className="flex flex-col gap-3">
            <MenuButton onClick={resume}>CONTINUAR</MenuButton>
            {!tournament && (
              <MenuButton variant="ghost" onClick={restart}>
                REINICIAR
              </MenuButton>
            )}
            <MenuButton variant="ghost" onClick={onExit}>
              SAIR PARA O MENU
            </MenuButton>
          </div>
        </Overlay>
      )}

      {/* first-run tutorial (PRD 3.0 §6.8) */}
      {showTutorial && !gameOver && !paused && (
        <Overlay title="COMO JOGAR">
          <div className="flex flex-col gap-3 text-left text-sm text-muted-foreground">
            <p>
              <span className="font-display text-accent">1.</span> Segure{" "}
              <kbd className="rounded bg-muted px-1.5 py-0.5">↓</kbd> para carregar o lançador e solte para
              lançar a bola.
            </p>
            <p>
              <span className="font-display text-accent">2.</span>{" "}
              <kbd className="rounded bg-muted px-1.5 py-0.5">←</kbd>{" "}
              <kbd className="rounded bg-muted px-1.5 py-0.5">→</kbd> movem os flippers. No celular, toque nas
              metades da tela.
            </p>
            <p>
              <span className="font-display text-accent">3.</span> Passe pelas órbitas para carregar o{" "}
              <span className="text-primary">JACKPOT</span> e complete as missões.{" "}
              <kbd className="rounded bg-muted px-1.5 py-0.5">Shift</kbd> empurra a mesa (3 = TILT).
            </p>
          </div>
          <MenuButton
            onClick={() => {
              markTutorialSeen();
              setShowTutorial(false);
            }}
          >
            ENTENDI, JOGAR
          </MenuButton>
        </Overlay>
      )}

      {/* result overlay: game over or tournament table complete */}
      {gameOver && result && (
        <Overlay title={overlayTitle}>
          <p className="font-display text-5xl text-primary nv-glow-text tabular-nums">{format(shownScore)}</p>
          <p className="text-sm text-muted-foreground">
            {result.tournamentFinal ? "mesa final" : tournament ? "pontos nesta mesa" : "pontos finais"}
          </p>
          {!tournament && (
            <p className="font-display text-lg tracking-widest text-accent nv-glow-text">
              PATENTE: {rankFor(result.score)}
            </p>
          )}
          {result.isRecord && (
            <p className="font-display text-lg tracking-widest text-accent nv-glow-text">★ NOVO RECORDE ★</p>
          )}
          {result.challenge && (
            <p className="font-display text-sm tracking-widest text-accent">
              DESAFIO: {CHALLENGE_LABEL[result.challenge]}
            </p>
          )}
          {result.stars && (
            <div className="flex items-center justify-center gap-2" aria-label="Estrelas da partida">
              {result.stars.map((got, i) => (
                <span key={i} className="flex flex-col items-center gap-0.5">
                  <Star className={cn("size-7", got ? "fill-primary text-primary nv-glow-text" : "text-muted-foreground/40")} />
                  <span className="text-[9px] uppercase tracking-widest text-muted-foreground">
                    {["missão", "score", "wizard"][i]}
                  </span>
                </span>
              ))}
            </div>
          )}
          {result.xpGained !== undefined && result.xpGained > 0 && (
            <p className="text-sm text-muted-foreground">
              +{result.xpGained} XP · NÍVEL {result.level}
            </p>
          )}
          {result.tournamentTotal !== undefined && (
            <p className="font-display text-2xl tracking-widest text-accent">
              TOTAL: {format(result.tournamentTotal)}
            </p>
          )}
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground sm:grid-cols-4">
            <span>tempo: {formatTime(result.stats.durationMs)}</span>
            <span>lançamentos: {result.stats.ballsLaunched}</span>
            <span>skill shots: {result.stats.skillShots}</span>
            <span>ball saves: {result.stats.ballSaves}</span>
            <span>maior combo: ×{result.stats.bestCombo}</span>
            <span>missão: {result.stats.missionCompleted ? "concluída" : "—"}</span>
            <span>bancas: {result.stats.dropsBanked}</span>
            <span>mystery: {result.stats.mysteryHits}</span>
            <span>wizards: {result.stats.wizardModes}</span>
            <span>jackpots: {result.stats.voltCharges}</span>
            <span>bolas extra: {result.stats.extraBalls}</span>
            <span>score: {format(result.score)}</span>
          </div>
          <div className="flex flex-col gap-3">
            {tournament && !result.tournamentFinal && (
              <MenuButton onClick={onTournamentNext}>PRÓXIMA MESA</MenuButton>
            )}
            {tournament && result.tournamentFinal && (
              <MenuButton onClick={onTournamentNext}>VOLTAR AO MENU</MenuButton>
            )}
            {!tournament && (
              <MenuButton
                onClick={() => {
                  setGameOver(false);
                  restart();
                }}
              >
                JOGAR NOVAMENTE
              </MenuButton>
            )}
            <MenuButton variant="ghost" onClick={onExit}>
              MENU
            </MenuButton>
          </div>
        </Overlay>
      )}
    </div>
  );
}

function Overlay({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="flex max-h-[90dvh] flex-col items-center gap-4 overflow-y-auto rounded-2xl border border-border bg-card/90 p-8 text-center shadow-2xl">
        <h2 className="font-display text-4xl tracking-widest text-foreground">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function MenuButton({
  children,
  onClick,
  variant = "solid",
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "solid" | "ghost";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "font-display rounded-xl px-8 py-3 text-xl tracking-widest transition-transform hover:scale-[1.03] active:scale-[0.97]",
        variant === "solid"
          ? "bg-primary text-primary-foreground shadow-[0_0_30px_-10px_var(--color-primary)]"
          : "border border-border text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
