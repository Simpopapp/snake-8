// NEONVOLT — synthesized WebAudio sound bank. No external assets.
// Lazily created on first user gesture; muted state persists in localStorage.
import type { GameEvent } from "./types";

const MUTE_KEY = "neonvolt.v1.muted";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicBus: GainNode | null = null;
let leadBus: GainNode | null = null;
let muted = false;
let volume = 70; // 0–100, runtime mirror of progress settings
let musicOn = true; // settings.music mirror (3.0)

/** Gain = base * (volume/100), clamped. */
function masterGain(): number {
  return 0.5 * Math.max(0, Math.min(100, volume)) / 70;
}

function readMuted(): boolean {
  try {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return muted;
  }
}

if (typeof window !== "undefined") {
  muted = readMuted();
}

export function isMuted(): boolean {
  return muted;
}

export function toggleMute(): boolean {
  muted = !muted;
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    }
  } catch {
    // storage unavailable: keep mute in memory only
  }
  if (master && ctx) {
    master.gain.setTargetAtTime(muted ? 0 : masterGain(), ctx.currentTime, 0.02);
  }
  return muted;
}

/** Volume 0–100 (persisted by the progress module; this is the runtime mirror). */
export function setVolume(v: number): void {
  volume = Math.max(0, Math.min(100, Math.round(v)));
  if (master && ctx) {
    master.gain.setTargetAtTime(muted ? 0 : masterGain(), ctx.currentTime, 0.02);
  }
}

export function getVolume(): number {
  return volume;
}

/** Call from a user-gesture handler (click/keydown) to unlock audio. */
export function ensureAudio(): void {
  if (ctx) {
    if (ctx.state === "suspended") void ctx.resume();
    return;
  }
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : masterGain();
  master.connect(ctx.destination);
  musicBus = ctx.createGain();
  musicBus.gain.value = 0.16;
  musicBus.connect(master);
  // dynamic lead layer: gain grows with combo/multiball (3.0)
  leadBus = ctx.createGain();
  leadBus.gain.value = 0;
  leadBus.connect(master);
}

/** Runtime mirror of settings.music — silences the sequencer without touching sfx. */
export function setMusicEnabled(on: boolean): void {
  musicOn = on;
  if (!on) stopMusic();
}

// ------------------------------------------------------------ ambient music

type MusicPattern = {
  bpm: number;
  wave: OscillatorType;
  bass: number[];
  arp: number[];
};

// 8 eighth-note steps per pattern; frequencies in Hz (chord tones, kept low).
const MUSIC: Record<string, MusicPattern> = {
  "circuito-neon": {
    bpm: 122,
    wave: "square",
    bass: [110, 110, 146.8, 146.8, 110, 110, 130.8, 130.8],
    arp: [440, 523, 659, 523, 440, 587, 659, 587],
  },
  "forja-solar": {
    bpm: 108,
    wave: "sawtooth",
    bass: [98, 98, 116.5, 116.5, 98, 98, 87.3, 87.3],
    arp: [392, 466, 587, 466, 392, 466, 523, 466],
  },
  abissal: {
    bpm: 84,
    wave: "sine",
    bass: [73.4, 73.4, 87.3, 87.3, 73.4, 73.4, 65.4, 65.4],
    arp: [293.7, 349.2, 440, 349.2, 293.7, 392, 440, 392],
  },
  criogenese: {
    bpm: 100,
    wave: "triangle",
    bass: [82.4, 82.4, 98, 98, 82.4, 82.4, 110, 110],
    arp: [659, 784, 988, 784, 659, 880, 988, 880],
  },
  supernova: {
    bpm: 96,
    wave: "square",
    bass: [92.5, 92.5, 123.5, 123.5, 92.5, 92.5, 138.6, 138.6],
    arp: [494, 587, 740, 587, 494, 622, 740, 622],
  },
  "vortice-tesla": {
    bpm: 128,
    wave: "square",
    bass: [110, 110, 138.6, 138.6, 110, 110, 123.5, 123.5],
    arp: [587, 698, 880, 698, 587, 740, 880, 740],
  },
  "nucleo-zero": {
    bpm: 118,
    wave: "sawtooth",
    bass: [82.4, 82.4, 103.8, 103.8, 82.4, 82.4, 92.5, 92.5],
    arp: [523, 622, 784, 622, 523, 698, 784, 698],
  },
  "orquestra-neural": {
    bpm: 104,
    wave: "triangle",
    bass: [87.3, 87.3, 110, 110, 87.3, 87.3, 98, 98],
    arp: [440, 523, 622, 523, 440, 494, 622, 494],
  },
  "deserto-estatico": {
    bpm: 92,
    wave: "sine",
    bass: [98, 98, 123.5, 123.5, 98, 98, 110, 110],
    arp: [392, 466, 587, 466, 392, 440, 587, 440],
  },
  "catedral-fonica": {
    bpm: 88,
    wave: "sine",
    bass: [73.4, 73.4, 92.5, 92.5, 73.4, 73.4, 82.4, 82.4],
    arp: [349, 440, 523, 440, 349, 392, 523, 392],
  },
  "cidade-vapor": {
    bpm: 112,
    wave: "sawtooth",
    bass: [92.5, 92.5, 116.5, 116.5, 92.5, 92.5, 103.8, 103.8],
    arp: [466, 554, 698, 554, 466, 523, 698, 523],
  },
  "reator-final": {
    bpm: 134,
    wave: "sawtooth",
    bass: [73.4, 73.4, 87.3, 87.3, 69.3, 69.3, 87.3, 87.3],
    arp: [622, 740, 932, 740, 622, 831, 932, 831],
  },
};

let musicTimer: ReturnType<typeof setInterval> | null = null;
let musicStep = 0;
let musicNextTime = 0;
let musicTable: string | null = null;
let intensity = 0; // 0..1 from combo/multiball (3.0)
let bpmScale = 1; // challenge "tempo" raises the tempo 10% (4.0)
const activeMusicNodes: { stop: (when?: number) => void }[] = [];

/** 4.0: challenge music modifier — "tempo" runs 10% faster. */
export function setMusicChallenge(on: boolean): void {
  bpmScale = on ? 1.1 : 1;
}

/** Music intensity 0..1: lead layer + hats appear as the game heats up. */
export function setMusicIntensity(level: number): void {
  intensity = Math.max(0, Math.min(1, level));
  if (leadBus && ctx) {
    leadBus.gain.setTargetAtTime(0.09 * intensity, ctx.currentTime, 0.3);
  }
}

function scheduleMusicStep(pattern: MusicPattern, time: number, step: number): void {
  if (!ctx || !musicBus) return;
  const stepDur = 60 / (pattern.bpm * bpmScale) / 2; // eighth notes
  const bass = pattern.bass[step % 8];
  const arp = pattern.arp[step % 8];
  if (bass) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = pattern.wave;
    osc.frequency.setValueAtTime(bass, time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(0.22, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, time + stepDur * 0.95);
    osc.connect(gain);
    gain.connect(musicBus);
    osc.start(time);
    osc.stop(time + stepDur);
    activeMusicNodes.push(osc);
  }
  if (arp) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = pattern.wave === "square" ? "triangle" : "sine";
    osc.frequency.setValueAtTime(arp, time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(0.1, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, time + stepDur * 1.4);
    osc.connect(gain);
    gain.connect(musicBus);
    osc.start(time);
    osc.stop(time + stepDur * 1.5);
    activeMusicNodes.push(osc);
  }
  // percussion: hats on every step once the game is hot (3.0)
  if (intensity > 0.25) {
    const len = Math.max(1, Math.floor(ctx.sampleRate * 0.03));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 6000;
    const gain = ctx.createGain();
    gain.gain.value = 0.05 + 0.06 * intensity;
    src.connect(hp);
    hp.connect(gain);
    gain.connect(musicBus);
    src.start(time);
    activeMusicNodes.push(src);
  }
  // lead layer: doubles the arp an octave up while intensity is high (3.0)
  if (intensity > 0.45 && arp && leadBus) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(arp * 2, time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(0.05, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, time + stepDur * 1.2);
    osc.connect(gain);
    gain.connect(leadBus);
    osc.start(time);
    osc.stop(time + stepDur * 1.3);
    activeMusicNodes.push(osc);
  }
}

/** Starts the ambient loop for a table (no-op if already playing it). */
export function startMusic(tableId: string): void {
  if (!ctx || !musicBus || muted || !musicOn) return;
  if (musicTable === tableId && musicTimer) return;
  const pattern = MUSIC[tableId] ?? MUSIC["circuito-neon"];
  if (!pattern) return;
  stopMusic();
  musicTable = tableId;
  musicStep = 0;
  musicNextTime = ctx.currentTime + 0.1;
  musicTimer = setInterval(() => {
    if (!ctx || muted || !musicOn) {
      // keep the cursor fresh so unmute never replays a stale backlog
      if (ctx) musicNextTime = ctx.currentTime + 0.2;
      return;
    }
    const stepDur = 60 / (pattern.bpm * bpmScale) / 2;
    // lookahead scheduling: keep ~0.4s of music queued
    while (musicNextTime < ctx.currentTime + 0.4) {
      scheduleMusicStep(pattern, musicNextTime, musicStep++);
      musicNextTime += stepDur;
    }
  }, 100);
}

export function stopMusic(): void {
  if (musicTimer) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
  musicTable = null;
  // cut already-scheduled voices so nothing keeps ringing after stop
  for (const node of activeMusicNodes) {
    try {
      node.stop(0);
    } catch {
      // already finished
    }
  }
  activeMusicNodes.length = 0;
}

interface ToneOpts {
  type?: OscillatorType;
  freq: number;
  endFreq?: number;
  dur?: number;
  vol?: number;
  delay?: number;
  /** Stereo pan −1..1 (position on the playfield) */
  pan?: number;
}

/** Stereo pan for an event x position (table center = 0). */
function panOf(x?: number): number {
  if (x === undefined) return 0;
  return Math.max(-0.7, Math.min(0.7, (x - 270) / 270));
}

function tone({ type = "square", freq, endFreq, dur = 0.08, vol = 0.3, delay = 0, pan = 0 }: ToneOpts): void {
  if (!ctx || !master || muted) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t0 + dur);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain);
  if (pan !== 0 && ctx.createStereoPanner) {
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;
    gain.connect(panner);
    panner.connect(master);
  } else {
    gain.connect(master);
  }
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noiseBurst(dur = 0.06, vol = 0.2, freq = 1800, pan = 0): void {
  if (!ctx || !master || muted) return;
  const t0 = ctx.currentTime;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = freq;
  const gain = ctx.createGain();
  gain.gain.value = vol;
  src.connect(filter);
  filter.connect(gain);
  if (pan !== 0 && ctx.createStereoPanner) {
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;
    gain.connect(panner);
    panner.connect(master);
  } else {
    gain.connect(master);
  }
  src.start(t0);
}

export function playEvent(evt: GameEvent): void {
  switch (evt.type) {
    case "bumperHit":
      tone({ type: "square", freq: 340 + (evt.pos.x % 7) * 40, endFreq: 220, dur: 0.07, vol: 0.28, pan: panOf(evt.pos.x) });
      break;
    case "slingHit":
      noiseBurst(0.05, 0.25, 2400, panOf(evt.pos.x));
      tone({ type: "triangle", freq: 520, endFreq: 300, dur: 0.05, vol: 0.2, pan: panOf(evt.pos.x) });
      break;
    case "targetDown":
      tone({ type: "square", freq: 660, endFreq: 440, dur: 0.09, vol: 0.25, pan: panOf(evt.pos.x) });
      noiseBurst(0.04, 0.15, 3200, panOf(evt.pos.x));
      break;
    case "dropHit":
      tone({ type: "square", freq: 300, endFreq: 180, dur: 0.1, vol: 0.28, pan: panOf(evt.pos.x) });
      noiseBurst(0.08, 0.2, 900, panOf(evt.pos.x));
      break;
    case "bankCleared":
      [440, 554, 659, 880].forEach((f, i) =>
        tone({ type: "square", freq: f, dur: 0.12, vol: 0.28, delay: i * 0.07 }),
      );
      noiseBurst(0.12, 0.2, 1400, panOf(evt.pos.x));
      break;
    case "groupCleared":
      tone({ type: "triangle", freq: 523, dur: 0.12, vol: 0.3 });
      tone({ type: "triangle", freq: 659, dur: 0.12, vol: 0.3, delay: 0.09 });
      tone({ type: "triangle", freq: 784, dur: 0.2, vol: 0.32, delay: 0.18 });
      break;
    case "spinner":
      tone({ type: "sawtooth", freq: 900 + Math.random() * 300, endFreq: 1300, dur: 0.05, vol: 0.14 });
      break;
    case "ramp":
      tone({ type: "sawtooth", freq: 300, endFreq: 1200, dur: 0.25, vol: 0.22 });
      break;
    case "voltCharged":
      tone({ type: "triangle", freq: 500 + evt.charge * 90, endFreq: 700 + evt.charge * 90, dur: 0.09, vol: 0.16 });
      break;
    case "kicker":
      tone({ type: "sine", freq: 180, endFreq: 90, dur: 0.18, vol: 0.35, pan: panOf(evt.pos.x) });
      tone({ type: "triangle", freq: 880, dur: 0.1, vol: 0.2, delay: 0.05, pan: panOf(evt.pos.x) });
      break;
    case "jackpot":
      [523, 659, 784, 1046, 1318].forEach((f, i) =>
        tone({ type: "square", freq: f, dur: 0.16, vol: 0.3, delay: i * 0.07 }),
      );
      noiseBurst(0.2, 0.25, 2000);
      break;
    case "mysteryLit":
      [660, 880, 660].forEach((f, i) =>
        tone({ type: "triangle", freq: f, dur: 0.1, vol: 0.2, delay: i * 0.09 }),
      );
      break;
    case "mysteryAward":
      [784, 988, 1174, 1568].forEach((f, i) =>
        tone({ type: "triangle", freq: f, dur: 0.13, vol: 0.26, delay: i * 0.08 }),
      );
      break;
    case "wizardStarted":
      [262, 330, 392, 523, 659, 784].forEach((f, i) =>
        tone({ type: "sawtooth", freq: f, dur: 0.2, vol: 0.24, delay: i * 0.06 }),
      );
      break;
    case "wizardEnded":
      [784, 659, 523, 392].forEach((f, i) =>
        tone({ type: "triangle", freq: f, dur: 0.2, vol: 0.26, delay: i * 0.1 }),
      );
      break;
    case "extraBall":
      [880, 1174].forEach((f, i) =>
        tone({ type: "square", freq: f, dur: 0.15, vol: 0.3, delay: i * 0.12 }),
      );
      break;
    case "tiltWarning":
      tone({ type: "square", freq: 300, endFreq: 240, dur: 0.15, vol: 0.3 });
      noiseBurst(0.05, 0.2, 500);
      break;
    case "kickback":
      tone({ type: "sawtooth", freq: 120, endFreq: 700, dur: 0.3, vol: 0.35, pan: panOf(evt.pos.x) });
      break;
    case "launch":
      tone({ type: "sawtooth", freq: 140 + evt.power * 120, endFreq: 900, dur: 0.28, vol: 0.3 });
      break;
    case "ballLost":
      tone({ type: "sine", freq: 420, endFreq: 70, dur: 0.5, vol: 0.35 });
      break;
    case "bonusAwarded":
      [523, 659, 784, 1046].forEach((f, i) =>
        tone({ type: "triangle", freq: f, dur: 0.14, vol: 0.26, delay: i * 0.08 }),
      );
      break;
    case "missionComplete":
      [392, 523, 659, 784, 1046].forEach((f, i) =>
        tone({ type: "triangle", freq: f, dur: 0.22, vol: 0.28, delay: i * 0.07 }),
      );
      break;
    case "multiballStarted":
      [440, 587, 740, 880, 1174].forEach((f, i) =>
        tone({ type: "square", freq: f, dur: 0.09, vol: 0.24, delay: i * 0.06 }),
      );
      break;
    case "tilt":
      tone({ type: "sawtooth", freq: 110, endFreq: 60, dur: 0.7, vol: 0.4 });
      break;
    case "nudge":
      noiseBurst(0.05, 0.18, 300);
      break;
    case "gameOver":
      [523, 415, 349, 262].forEach((f, i) =>
        tone({ type: "triangle", freq: f, dur: 0.3, vol: 0.3, delay: i * 0.18 }),
      );
      break;
    case "skillShotLit":
      tone({ type: "triangle", freq: 740, endFreq: 988, dur: 0.16, vol: 0.2 });
      break;
    case "skillShotHit":
      [784, 988, 1319].forEach((f, i) =>
        tone({ type: "square", freq: f, dur: 0.12, vol: 0.28, delay: i * 0.06 }),
      );
      break;
    case "skillShotMiss":
      tone({ type: "triangle", freq: 392, endFreq: 262, dur: 0.18, vol: 0.14 });
      break;
    case "ballSaveUsed":
      tone({ type: "sawtooth", freq: 220, endFreq: 660, dur: 0.24, vol: 0.26 });
      tone({ type: "square", freq: 880, dur: 0.1, vol: 0.2, delay: 0.2 });
      break;
    case "ballSaved":
      tone({ type: "sine", freq: 660, endFreq: 880, dur: 0.2, vol: 0.2 });
      break;
    case "combo": {
      const base = 440 + Math.min(6, Math.floor(evt.count / 5)) * 110;
      tone({ type: "square", freq: base, endFreq: base * 1.5, dur: 0.14, vol: 0.26 });
      break;
    }
    case "miniMissionComplete":
      [523, 659, 784].forEach((f, i) =>
        tone({ type: "triangle", freq: f, dur: 0.16, vol: 0.26, delay: i * 0.08 }),
      );
      break;
    case "tournamentTableComplete":
      [392, 523, 659, 784].forEach((f, i) =>
        tone({ type: "square", freq: f, dur: 0.16, vol: 0.26, delay: i * 0.09 }),
      );
      break;
    case "rampRun":
      tone({ type: "sawtooth", freq: 200, endFreq: 1100, dur: 0.3, vol: 0.24, pan: panOf(evt.pos.x) });
      break;
    case "magnetPulled":
      tone({ type: "sine", freq: 160, endFreq: 420, dur: 0.22, vol: 0.18, pan: panOf(evt.pos.x) });
      break;
    case "lockStaged":
      tone({ type: "square", freq: 660, endFreq: 330, dur: 0.14, vol: 0.28, pan: panOf(evt.pos.x) });
      tone({ type: "triangle", freq: 990, dur: 0.12, vol: 0.2, delay: 0.1, pan: panOf(evt.pos.x) });
      break;
    case "lockReleased":
      [523, 659, 880, 1046].forEach((f, i) =>
        tone({ type: "square", freq: f, dur: 0.14, vol: 0.28, delay: i * 0.07 }),
      );
      break;
    case "frenzyActive":
      [440, 622, 880].forEach((f, i) =>
        tone({ type: "sawtooth", freq: f, dur: 0.2, vol: 0.26, delay: i * 0.08 }),
      );
      break;
    case "challengeEnded":
      evt.timeout
        ? [440, 349, 294].forEach((f, i) => tone({ type: "triangle", freq: f, dur: 0.24, vol: 0.28, delay: i * 0.15 }))
        : [523, 659, 784, 1046].forEach((f, i) =>
            tone({ type: "square", freq: f, dur: 0.16, vol: 0.28, delay: i * 0.09 }),
          );
      break;
    default:
      break;
  }
}
