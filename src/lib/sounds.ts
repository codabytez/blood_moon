// Synthesized sounds via Web Audio API — no external files required

let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

// ── Preferences (persisted in localStorage) ──────────────────────────────────

export function getSoundEnabled(): boolean {
  return localStorage.getItem('bm_sound_enabled') !== 'false'
}

export function getSoundVolume(): number {
  return parseFloat(localStorage.getItem('bm_sound_volume') ?? '0.6')
}

export function setSoundEnabled(v: boolean): void {
  localStorage.setItem('bm_sound_enabled', String(v))
}

export function setSoundVolume(v: number): void {
  localStorage.setItem('bm_sound_volume', String(v))
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function vol(): number {
  return getSoundEnabled() ? getSoundVolume() : 0
}

interface ToneOpts {
  freq: number
  type?: OscillatorType
  duration: number
  startTime?: number
  gainPeak?: number
  attackTime?: number
  releaseTime?: number
}

function tone(
  audio: AudioContext,
  master: GainNode,
  {
    freq,
    type = 'sine',
    duration,
    startTime = 0,
    gainPeak = 0.35,
    attackTime = 0.02,
    releaseTime,
  }: ToneOpts
) {
  const release = releaseTime ?? duration * 0.6
  const osc = audio.createOscillator()
  const g = audio.createGain()
  osc.type = type
  osc.frequency.value = freq

  const t = audio.currentTime + startTime
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(gainPeak, t + attackTime)
  g.gain.setValueAtTime(gainPeak, t + duration - release)
  g.gain.exponentialRampToValueAtTime(0.001, t + duration)

  osc.connect(g)
  g.connect(master)
  osc.start(t)
  osc.stop(t + duration)
}

function makeMaster(audio: AudioContext): GainNode {
  const g = audio.createGain()
  g.gain.value = vol()
  g.connect(audio.destination)
  return g
}

// ── Sound functions ───────────────────────────────────────────────────────────

/** Played when the game transitions to Night phase */
export function playNightFall(): void {
  if (!getSoundEnabled()) return
  const audio = getCtx()
  const master = makeMaster(audio)
  // Descending ominous notes
  const notes = [440, 370, 311, 220]
  notes.forEach((freq, i) => {
    tone(audio, master, {
      freq,
      type: 'sine',
      duration: 0.9,
      startTime: i * 0.22,
      gainPeak: 0.28 - i * 0.04,
    })
  })
  // Low rumble underneath
  tone(audio, master, {
    freq: 55,
    type: 'triangle',
    duration: 1.5,
    startTime: 0,
    gainPeak: 0.15,
    releaseTime: 0.8,
  })
}

/** Played when transitioning to Day phase */
export function playDawnRise(): void {
  if (!getSoundEnabled()) return
  const audio = getCtx()
  const master = makeMaster(audio)
  // Ascending hopeful arpeggio (C major)
  const notes = [261, 329, 392, 523]
  notes.forEach((freq, i) => {
    tone(audio, master, {
      freq,
      type: 'sine',
      duration: 0.7,
      startTime: i * 0.18,
      gainPeak: 0.22 + i * 0.03,
    })
  })
}

/** Played when a vote is cast */
export function playVoteCast(): void {
  if (!getSoundEnabled()) return
  const audio = getCtx()
  const master = makeMaster(audio)
  tone(audio, master, {
    freq: 660,
    type: 'triangle',
    duration: 0.12,
    gainPeak: 0.25,
    attackTime: 0.005,
  })
}

/** Played each second when countdown ≤ 10 */
export function playTimerTick(): void {
  if (!getSoundEnabled()) return
  const audio = getCtx()
  const master = makeMaster(audio)
  tone(audio, master, {
    freq: 880,
    type: 'square',
    duration: 0.06,
    gainPeak: 0.12,
    attackTime: 0.003,
  })
}

/** Played when a player is eliminated */
export function playElimination(): void {
  if (!getSoundEnabled()) return
  const audio = getCtx()
  const master = makeMaster(audio)
  // Dramatic descending hit
  const notes = [220, 185, 155]
  notes.forEach((freq, i) => {
    tone(audio, master, {
      freq,
      type: 'sawtooth',
      duration: 1.2,
      startTime: i * 0.12,
      gainPeak: 0.2,
      releaseTime: 0.9,
    })
  })
}

/** Played when the game starts (role reveal) */
export function playGameStart(): void {
  if (!getSoundEnabled()) return
  const audio = getCtx()
  const master = makeMaster(audio)
  // Short fanfare
  const notes = [392, 494, 587, 784]
  notes.forEach((freq, i) => {
    tone(audio, master, {
      freq,
      type: 'sine',
      duration: 0.45,
      startTime: i * 0.15,
      gainPeak: 0.28,
    })
  })
}

/** Played when villagers win */
export function playVillageWins(): void {
  if (!getSoundEnabled()) return
  const audio = getCtx()
  const master = makeMaster(audio)
  // Major chord + upward run
  const chord = [261, 329, 392]
  chord.forEach(freq => {
    tone(audio, master, {
      freq,
      type: 'sine',
      duration: 1.8,
      gainPeak: 0.22,
      releaseTime: 1.2,
    })
  })
  const run = [523, 659, 784, 1047]
  run.forEach((freq, i) => {
    tone(audio, master, {
      freq,
      type: 'sine',
      duration: 0.5,
      startTime: 0.3 + i * 0.14,
      gainPeak: 0.18,
    })
  })
}

/** Played when mafia wins */
export function playMafiaWins(): void {
  if (!getSoundEnabled()) return
  const audio = getCtx()
  const master = makeMaster(audio)
  // Ominous minor chord
  const chord = [110, 138, 165]
  chord.forEach(freq => {
    tone(audio, master, {
      freq,
      type: 'sawtooth',
      duration: 2.0,
      gainPeak: 0.18,
      releaseTime: 1.4,
    })
  })
  // Dark descending run
  const run = [220, 185, 155, 110]
  run.forEach((freq, i) => {
    tone(audio, master, {
      freq,
      type: 'triangle',
      duration: 0.6,
      startTime: 0.4 + i * 0.2,
      gainPeak: 0.22,
    })
  })
}
