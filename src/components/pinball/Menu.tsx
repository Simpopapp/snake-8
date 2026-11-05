// NEONVOLT — main menu 3.0: tabs (tables / campaign / challenges / stats /
// achievements / settings), keyboard navigation, table carousel with live
// previews, stars, unlocks and challenge records.
import { Layers, Lock, Play, RotateCcw, Star, Timer, Trophy, Volume2, VolumeX, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AchievementsPanel, SettingsPanel, StatsPanel } from "@/components/pinball/Meta";
import { TablePreview } from "@/components/pinball/TablePreview";
import { TABLES } from "@/game/tables";
import { challengeBestOf, levelInfo, readProgress, totalStars, type Settings } from "@/game/progress";
import type { ChallengeId, HighScores, TableDef } from "@/game/types";
import { cn } from "@/lib/utils";

type Tab = "mesas" | "campanha" | "desafios" | "stats" | "conquistas" | "ajustes";

const TABS: { id: Tab; label: string }[] = [
  { id: "mesas", label: "MESAS" },
  { id: "campanha", label: "CAMPANHA" },
  { id: "desafios", label: "DESAFIOS" },
  { id: "stats", label: "ESTATÍSTICAS" },
  { id: "conquistas", label: "CONQUISTAS" },
  { id: "ajustes", label: "AJUSTES" },
];

const CHALLENGES: { id: ChallengeId; name: string; desc: string }[] = [
  { id: "tempo", name: "CONTRA O TEMPO", desc: "120s · 1 bola · salva-bola 3s" },
  { id: "umabola", name: "UMA BOLA", desc: "1 bola · sem save · sem bola extra" },
  { id: "caos", name: "CAOS", desc: "3 bolas de uma vez · sem save" },
  { id: "frenesi", name: "FRENESI", desc: "score ×2 · dreno acelerado · combo curto" },
];

const SKIN_LABELS: Record<string, string> = {
  cromada: "Cromada",
  plasma: "Plasma",
  ouro: "Ouro",
  holo: "Holográfica",
  vortice: "Vórtice",
};

interface MenuProps {
  scores: HighScores;
  selected: number;
  onSelect: (index: number) => void;
  onPlay: (table: TableDef) => void;
  onTournament: () => void;
  onChallenge: (id: ChallengeId, table: TableDef) => void;
  muted: boolean;
  onToggleMute: () => void;
  settings: Settings;
  onSettingsChange: (s: Settings) => void;
}

export function Menu({
  scores,
  selected,
  onSelect,
  onPlay,
  onTournament,
  onChallenge,
  muted,
  onToggleMute,
  settings,
  onSettingsChange,
}: MenuProps) {
  const [tab, setTab] = useState<Tab>("mesas");
  const table = TABLES[selected] ?? TABLES[0];
  const format = (n: number) => n.toLocaleString("pt-BR");
  const lastInteraction = useRef(Date.now());

  // metagame snapshot for the menu (stars, level, challenge bests)
  const progress = readProgress();
  const starsTotal = totalStars();
  const level = levelInfo(progress.xp).level;
  const campaign = progress.campaign;
  const tableLocked = (t: TableDef): boolean => (t.lockedByStars ?? 0) > starsTotal;

  const playTable = (t: TableDef): void => {
    if (tableLocked(t)) {
      toast.error(`${t.name} trancada`, {
        description: `Ganhe ${t.lockedByStars} estrelas na campanha para desbloquear (${starsTotal}/${t.lockedByStars}).`,
      });
      return;
    }
    onPlay(t);
  };

  // attract mode: the carousel presents itself when the arcade is idle (PRD 3.0 §6.7)
  useEffect(() => {
    const bump = () => {
      lastInteraction.current = Date.now();
    };
    window.addEventListener("keydown", bump);
    window.addEventListener("pointerdown", bump);
    return () => {
      window.removeEventListener("keydown", bump);
      window.removeEventListener("pointerdown", bump);
    };
  }, []);
  useEffect(() => {
    const iv = setInterval(() => {
      if (tab !== "mesas") return;
      if (Date.now() - lastInteraction.current < 6000) return;
      lastInteraction.current = Date.now();
      onSelect((selected + 1) % TABLES.length);
    }, 3000);
    return () => clearInterval(iv);
  }, [tab, selected, onSelect]);

  // keyboard navigation: ←/→ select tables (mesas tab) or switch tabs
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        if (tab === "mesas") onSelect((selected + 1) % TABLES.length);
        else setTab(TABS[(TABS.findIndex((t) => t.id === tab) + 1) % TABS.length]?.id ?? "mesas");
        e.preventDefault();
      } else if (e.key === "ArrowLeft") {
        if (tab === "mesas") onSelect((selected - 1 + TABLES.length) % TABLES.length);
        else
          setTab(
            TABS[(TABS.findIndex((t) => t.id === tab) - 1 + TABS.length) % TABS.length]?.id ?? "mesas",
          );
        e.preventDefault();
      } else if (e.key === "Enter" && tab === "mesas") {
        playTable(table);
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, selected, table, onSelect, onPlay]);

  return (
    <div className="relative flex min-h-dvh flex-col items-center overflow-hidden bg-background px-4 py-6">
      {/* backdrop glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(60% 45% at 50% 0%, color-mix(in srgb, var(--color-primary) 30%, transparent), transparent 70%)",
        }}
      />
      <header className="relative z-10 flex w-full max-w-5xl items-start justify-between">
        <div>
          <h1 className="nv-glow-text font-display text-6xl tracking-wider text-primary sm:text-7xl">
            NEONVOLT
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pinball elétrico · física real · 12 mesas
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="font-display text-2xl text-foreground">{format(scores.global)}</p>
            <p className="text-xs text-muted-foreground">recorde global</p>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl text-primary nv-glow-text">{level}</p>
            <p className="text-xs text-muted-foreground">nível · {starsTotal}★</p>
          </div>
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? "Ativar som" : "Silenciar"}
            className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </button>
        </div>
      </header>

      {/* tabs */}
      <nav className="relative z-10 mt-5 flex w-full max-w-5xl flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "font-display flex-1 rounded-lg border px-2 py-2 text-sm tracking-widest transition-colors sm:text-base",
              tab === t.id
                ? "border-primary/70 bg-primary/10 text-primary nv-glow-text"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* panels */}
      <div className="relative z-10 mt-5 w-full max-w-5xl">
        {tab === "mesas" && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {TABLES.map((t, i) => {
                const active = i === selected;
                const best = scores.perTable[t.id] ?? 0;
                const locked = tableLocked(t);
                const stars = campaign[t.id] ?? [false, false, false];
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onSelect(i)}
                    onDoubleClick={() => playTable(t)}
                    className={cn(
                      "group relative flex flex-col overflow-hidden rounded-2xl border text-left transition-all duration-200",
                      active
                        ? "scale-[1.02] border-primary/70 shadow-[0_0_36px_-8px_var(--color-primary)]"
                        : "border-border hover:border-primary/40",
                      locked && "opacity-70",
                    )}
                  >
                    <div className="relative h-44 w-full overflow-hidden rounded-t-2xl">
                      <TablePreview tableId={t.id} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
                      <span className="absolute left-3 top-3 rounded-md bg-black/60 px-2 py-0.5 font-display text-xs tracking-widest text-white/90">
                        MESA {i + 1}
                      </span>
                      {best > 0 && (
                        <span className="absolute right-3 top-3 flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-xs text-amber-300">
                          <Trophy className="size-3" />
                          {format(best)}
                        </span>
                      )}
                      {locked && (
                        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/60">
                          <Lock className="size-7 text-amber-300" />
                          <span className="font-display text-xs tracking-widest text-amber-300">
                            {t.lockedByStars}★ PARA DESBLOQUEAR
                          </span>
                        </span>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-1 p-3">
                      <h2 className="font-display text-xl tracking-wide" style={{ color: t.palette.wall }}>
                        {t.name}
                      </h2>
                      <p className="text-xs text-muted-foreground">{t.subtitle}</p>
                      <div className="mt-auto flex items-center gap-1 pt-1" aria-label="Estrelas da mesa">
                        {stars.map((got, si) => (
                          <Star
                            key={si}
                            className={cn("size-3.5", got ? "fill-amber-300 text-amber-300" : "text-muted-foreground/40")}
                          />
                        ))}
                      </div>
                    </div>
                    {active && !locked && (
                      <div className="flex items-center justify-center gap-2 border-t border-primary/30 bg-primary/10 py-2 font-display text-base tracking-widest text-primary">
                        <Play className="size-4" />
                        JOGAR
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-7 flex flex-col items-center gap-4">
              <button
                type="button"
                onClick={() => playTable(table)}
                className="font-display flex items-center gap-3 rounded-xl bg-primary px-10 py-4 text-2xl tracking-widest text-primary-foreground shadow-[0_0_40px_-10px_var(--color-primary)] transition-transform hover:scale-[1.03] active:scale-[0.98]"
              >
                <Play className="size-6" />
                JOGAR · {table.name.toUpperCase()}
              </button>
              <button
                type="button"
                onClick={onTournament}
                className="font-display flex items-center gap-2 rounded-xl border border-accent/60 px-6 py-2.5 text-lg tracking-widest text-accent transition-transform hover:scale-[1.03] active:scale-[0.98]"
              >
                <Zap className="size-4" />
                TORNEIO · VOLTAGEM TOTAL
              </button>
              <p className="text-center text-xs text-muted-foreground">
                12 mesas × 2 bolas · placar cumulativo
              </p>
            </div>
          </>
        )}

        {tab === "campanha" && (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-border bg-card/60 p-5">
              <div className="flex items-baseline justify-between">
                <p className="font-display text-xl tracking-widest text-primary nv-glow-text">
                  CAMPANHA · {starsTotal}/36★
                </p>
                <p className="text-xs text-muted-foreground">
                  missão concluída · score ≥ meta · modo-wizard
                </p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(100, (starsTotal / 36) * 100)}%` }}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {TABLES.map((t, i) => {
                const stars = campaign[t.id] ?? [false, false, false];
                const locked = tableLocked(t);
                const count = stars.filter(Boolean).length;
                return (
                  <div
                    key={t.id}
                    className={cn(
                      "flex items-center gap-4 rounded-xl border p-4",
                      locked ? "border-border bg-card/30" : "border-border bg-card/60",
                    )}
                  >
                    <span className="font-display text-sm text-muted-foreground">M{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-display truncate text-lg" style={{ color: t.palette.wall }}>
                        {t.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        meta de score: {format(t.starScore)}
                      </p>
                    </div>
                    {locked ? (
                      <span className="flex items-center gap-1.5 rounded-md bg-black/40 px-2 py-1 text-xs text-amber-300">
                        <Lock className="size-3.5" />
                        {t.lockedByStars}★
                      </span>
                    ) : (
                      <span className="flex items-center gap-1" aria-label={`${count} de 3 estrelas`}>
                        {stars.map((got, si) => (
                          <Star
                            key={si}
                            className={cn("size-5", got ? "fill-amber-300 text-amber-300" : "text-muted-foreground/30")}
                          />
                        ))}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "desafios" && (
          <div className="grid gap-4 sm:grid-cols-2">
            {CHALLENGES.map((c) => {
              const best = challengeBestOf(c.id);
              return (
                <div
                  key={c.id}
                  className="flex flex-col gap-2 rounded-2xl border border-border bg-card/60 p-5"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-display flex items-center gap-2 text-xl tracking-widest text-accent">
                      <Timer className="size-4" />
                      {c.name}
                    </p>
                    {best > 0 && (
                      <span className="flex items-center gap-1 text-sm text-amber-300">
                        <Trophy className="size-3.5" />
                        {format(best)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{c.desc}</p>
                  <button
                    type="button"
                    onClick={() => onChallenge(c.id, table)}
                    className="font-display mt-2 flex items-center justify-center gap-2 self-start rounded-xl bg-primary px-6 py-2.5 text-lg tracking-widest text-primary-foreground shadow-[0_0_30px_-12px_var(--color-primary)] transition-transform hover:scale-[1.03] active:scale-[0.97]"
                  >
                    <Play className="size-4" />
                    JOGAR · {table.name.toUpperCase()}
                  </button>
                </div>
              );
            })}
            <p className="text-xs text-muted-foreground sm:col-span-2">
              Desafios usam a mesa selecionada na aba MESAS ({table.name}) · XP conta pela metade.
            </p>
          </div>
        )}

        {tab === "stats" && <StatsPanel />}
        {tab === "conquistas" && <AchievementsPanel />}
        {tab === "ajustes" && <SettingsPanel settings={settings} onChange={onSettingsChange} />}
      </div>

      {tab === "mesas" && (
        <div className="relative z-10 mt-8 grid w-full max-w-5xl gap-x-10 gap-y-1 text-center text-xs text-muted-foreground sm:grid-cols-2">
          <p>
            <kbd className="rounded bg-muted px-1.5 py-0.5">←</kbd>{" "}
            <kbd className="rounded bg-muted px-1.5 py-0.5">→</kbd> escolher mesa ·{" "}
            <kbd className="rounded bg-muted px-1.5 py-0.5">Enter</kbd> jogar ·{" "}
            <kbd className="rounded bg-muted px-1.5 py-0.5">↓</kbd> segure e solte para lançar ·{" "}
            <kbd className="rounded bg-muted px-1.5 py-0.5">Shift</kbd> empurrar
          </p>
          <p>
            No celular: toque nas metades da tela · 3 empurrões = TILT ·{" "}
            <kbd className="rounded bg-muted px-1.5 py-0.5">Esc</kbd> pausa
          </p>
        </div>
      )}

      <footer className="relative z-10 mt-auto flex items-center gap-2 pt-8 text-[10px] text-muted-foreground/60">
        <Layers className="inline size-3" />
        progresso salvo neste navegador
        <RotateCcw className="ml-2 inline size-3" />
        recordes salvos neste navegador
      </footer>
    </div>
  );
}
