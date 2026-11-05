// NEONVOLT — metagame panels: statistics, achievements and settings.
import { CheckCircle2, Gem, Lock, Music, RotateCcw, Volume2, Waves } from "lucide-react";
import { useState } from "react";

import { ACHIEVEMENTS, levelInfo, readProgress, resetProgress, saveSettings, type Settings } from "@/game/progress";
import { setMusicEnabled, setVolume } from "@/game/audio";
import { setReducedFx } from "@/game/fx";
import { TABLES } from "@/game/tables";
import { totalStars } from "@/game/progress";
import type { BallSkin } from "@/game/types";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

const format = (n: number) => n.toLocaleString("pt-BR");

/** Ball skins and the level that unlocks each (4.0 §6.6). */
const BALL_SKINS: { id: BallSkin; label: string; level: number }[] = [
  { id: "cromada", label: "Cromada", level: 1 },
  { id: "plasma", label: "Plasma", level: 2 },
  { id: "ouro", label: "Ouro", level: 4 },
  { id: "holo", label: "Holográfica", level: 6 },
  { id: "vortice", label: "Vórtice", level: 8 },
];

function formatDuration(ms: number): string {
  const totalMin = Math.floor(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

// ------------------------------------------------------------- statistics

export function StatsPanel() {
  const p = readProgress();
  const s = p.stats;
  const lvl = levelInfo(p.xp);
  const cells = [
    { label: "partidas", value: format(s.gamesPlayed) },
    { label: "tempo jogado", value: formatDuration(s.timePlayedMs) },
    { label: "bolas lançadas", value: format(s.ballsLaunched) },
    { label: "skill shots", value: format(s.skillShots) },
    { label: "ball saves", value: format(s.ballSaves) },
    { label: "maior combo", value: s.bestCombo > 0 ? `×${s.bestCombo}` : "—" },
    { label: "melhor torneio", value: s.tournamentBest > 0 ? format(s.tournamentBest) : "—" },
    { label: "missões concluídas", value: format(Object.values(s.missionsCompleted).reduce((a, b) => a + (b ?? 0), 0)) },
    { label: "bancas derrubadas", value: format(s.dropsBanked) },
    { label: "prêmios mystery", value: format(s.mysteryHits) },
    { label: "modos-wizard", value: format(s.wizardModes) },
    { label: "jackpots", value: format(s.voltCharges) },
    { label: "bolas extra", value: format(s.extraBalls) },
    { label: "estrelas", value: `${totalStars()}/36` },
    { label: "desafios", value: format(s.challengesPlayed) },
    { label: "travessias de rampa", value: format(s.rampRuns) },
    { label: "desvios de ímã", value: format(s.magnetHits) },
    { label: "locks armados", value: format(s.locksStaged) },
  ];
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-primary/40 bg-card/60 p-4">
        <div className="flex items-baseline justify-between">
          <p className="font-display text-xl tracking-widest text-primary nv-glow-text">
            NÍVEL {lvl.level}
          </p>
          <p className="text-xs tabular-nums text-muted-foreground">
            {format(lvl.into)} / {format(lvl.span)} XP
          </p>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.round(lvl.pct * 100)}%` }} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cells.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-card/60 p-4 text-center">
            <p className="font-display text-3xl text-foreground">{c.value}</p>
            <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card/60 p-4">
        <p className="font-display mb-3 text-lg tracking-widest text-primary">HISTÓRICO POR MESA</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {TABLES.map((t) => {
            const hist = s.highscoresHistory[t.id] ?? [];
            return (
              <div key={t.id} className="flex items-center justify-between gap-4 rounded-lg bg-background/40 px-3 py-2">
                <span className="truncate text-sm" style={{ color: t.palette.wall }}>{t.name}</span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {hist.length > 0 ? hist.map(format).join(" · ") : "sem partidas"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------ achievements

export function AchievementsPanel() {
  const unlocked = new Set(readProgress().achievements.unlocked);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {ACHIEVEMENTS.map((a) => {
        const got = unlocked.has(a.id);
        return (
          <div
            key={a.id}
            className={cn(
              "flex items-start gap-3 rounded-xl border p-4",
              got ? "border-primary/50 bg-primary/5" : "border-border bg-card/40 opacity-70",
            )}
          >
            {got ? (
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
            ) : (
              <Lock className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
            )}
            <div>
              <p className={cn("font-display text-lg tracking-wide", got ? "text-primary nv-glow-text" : "text-muted-foreground")}>
                {a.title}
              </p>
              <p className="text-xs text-muted-foreground">{a.desc}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- settings

interface SettingsPanelProps {
  settings: Settings;
  onChange: (s: Settings) => void;
}

export function SettingsPanel({ settings, onChange }: SettingsPanelProps) {
  const [confirmReset, setConfirmReset] = useState(false);
  const apply = (next: Settings): void => {
    onChange(next);
    saveSettings(next);
    setVolume(next.volume);
    setReducedFx(next.reducedFx);
    setMusicEnabled(next.music);
  };
  const level = levelInfo(readProgress().xp).level;
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <div className="rounded-xl border border-border bg-card/60 p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-display flex items-center gap-2 text-lg tracking-widest">
            <Volume2 className="size-4" /> VOLUME
          </p>
          <span className="text-sm tabular-nums text-muted-foreground">{settings.volume}%</span>
        </div>
        <Slider
          aria-label="Volume"
          value={[settings.volume]}
          min={0}
          max={100}
          step={5}
          onValueChange={([v]) => apply({ ...settings, volume: v ?? settings.volume })}
        />
      </div>
      <div className="flex items-center justify-between rounded-xl border border-border bg-card/60 p-5">
        <div>
          <p className="font-display flex items-center gap-2 text-lg tracking-widest">
            <Music className="size-4" /> MÚSICA
          </p>
          <p className="text-xs text-muted-foreground">Trilha ambiente por mesa</p>
        </div>
        <Switch
          aria-label="Música"
          checked={settings.music}
          onCheckedChange={(v) => apply({ ...settings, music: v })}
        />
      </div>
      <div className="flex items-center justify-between rounded-xl border border-border bg-card/60 p-5">
        <div>
          <p className="font-display flex items-center gap-2 text-lg tracking-widest">
            <Waves className="size-4" /> RASTRO DA BOLA
          </p>
          <p className="text-xs text-muted-foreground">Trilha luminosa atrás da bola</p>
        </div>
        <Switch
          aria-label="Rastro da bola"
          checked={settings.ballTrail}
          onCheckedChange={(v) => apply({ ...settings, ballTrail: v })}
        />
      </div>
      <div className="flex items-center justify-between rounded-xl border border-border bg-card/60 p-5">
        <div>
          <p className="font-display text-lg tracking-widest">REDUZIR EFEITOS</p>
          <p className="text-xs text-muted-foreground">Menos partículas, sem tremor de tela</p>
        </div>
        <Switch
          aria-label="Reduzir efeitos"
          checked={settings.reducedFx}
          onCheckedChange={(v) => apply({ ...settings, reducedFx: v })}
        />
      </div>
      <div className="flex items-center justify-between rounded-xl border border-destructive/40 bg-card/60 p-5">
        <div>
          <p className="font-display flex items-center gap-2 text-lg tracking-widest">
            <RotateCcw className="size-4" /> ZERAR PROGRESSO
          </p>
          <p className="text-xs text-muted-foreground">Apaga recordes, estatísticas e conquistas</p>
        </div>
        <button
          type="button"
          className={cn(
            "font-display rounded-lg px-4 py-2 text-sm tracking-widest transition-colors",
            confirmReset
              ? "bg-destructive text-destructive-foreground"
              : "border border-destructive/50 text-destructive hover:bg-destructive/10",
          )}
          onClick={() => {
            if (!confirmReset) {
              setConfirmReset(true);
              return;
            }
            const fresh = resetProgress();
            apply(fresh.settings);
            setConfirmReset(false);
          }}
        >
          {confirmReset ? "CONFIRMAR" : "APAGAR"}
        </button>
      </div>
      <div className="rounded-xl border border-border bg-card/60 p-5">
        <p className="font-display mb-1 flex items-center gap-2 text-lg tracking-widest">
          <Gem className="size-4" /> BOLA
        </p>
        <p className="mb-3 text-xs text-muted-foreground">Pele da bola — desbloqueada por nível</p>
        <div className="flex flex-wrap gap-2">
          {BALL_SKINS.map((skin) => {
            const locked = level < skin.level;
            const active = settings.ballSkin === skin.id;
            return (
              <button
                key={skin.id}
                type="button"
                disabled={locked}
                aria-label={`Bola ${skin.label}${locked ? ` — nível ${skin.level}` : ""}`}
                onClick={() => apply({ ...settings, ballSkin: skin.id })}
                className={cn(
                  "font-display rounded-lg border px-3 py-2 text-sm tracking-widest transition-colors",
                  active
                    ? "border-primary/70 bg-primary/15 text-primary nv-glow-text"
                    : "border-border text-muted-foreground hover:text-foreground",
                  locked && "cursor-not-allowed opacity-40",
                )}
              >
                {locked ? `🔒 N${skin.level}` : skin.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card/60 p-5 text-xs text-muted-foreground">
        <p className="font-display mb-2 text-sm tracking-widest text-foreground">CONTROLES</p>
        <p>
          <kbd className="rounded bg-muted px-1.5 py-0.5">←</kbd>{" "}
          <kbd className="rounded bg-muted px-1.5 py-0.5">→</kbd> flippers ·{" "}
          <kbd className="rounded bg-muted px-1.5 py-0.5">↓</kbd>/<kbd className="rounded bg-muted px-1.5 py-0.5">Espaço</kbd>{" "}
          segure e solte para lançar · <kbd className="rounded bg-muted px-1.5 py-0.5">Shift</kbd> empurrar ·{" "}
          <kbd className="rounded bg-muted px-1.5 py-0.5">Esc</kbd> pausa
        </p>
        <p className="mt-2">No celular: toque nas metades da tela (flippers) e no centro (lançador) · 3 empurrões = TILT</p>
      </div>
    </div>
  );
}
