/**
 * Web Audio API Sound Synthesizer for SPIL-GAME
 * 
 * Provides crisp, zero-dependency procedural maritime sound effects:
 * - Container clank (heavy metallic latch)
 * - Error buzzer (hydraulics failure / invalid placement)
 * - Ship foghorn (deep multi-tone maritime departure horn)
 * - Cash register chime (revenue discharge)
 * - Timer tick (high-tension turn countdown)
 * 
 * Includes global mute/unmute state with localStorage persistence.
 */

let audioCtx = null;
let isMuted = localStorage.getItem('spil_audio_muted') === 'true';

const getAudioContext = () => {
  if (!audioCtx && typeof window !== 'undefined') {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
};

export const getAudioMuted = () => isMuted;

export const setAudioMuted = (muted) => {
  isMuted = muted;
  localStorage.setItem('spil_audio_muted', muted ? 'true' : 'false');
};

export const toggleAudioMute = () => {
  setAudioMuted(!isMuted);
  return isMuted;
};

/**
 * 1. Heavy Container Clank / Thud
 * Simulates a 20ft container locking onto cell guides or deck twists.
 */
export const playContainerThud = () => {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Low frequency thud oscillator
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(140, now);
  osc.frequency.exponentialRampToValueAtTime(35, now + 0.12);

  gain.gain.setValueAtTime(0.4, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.16);

  // Metallic click noise on top
  const clickOsc = ctx.createOscillator();
  const clickGain = ctx.createGain();
  clickOsc.type = 'square';
  clickOsc.frequency.setValueAtTime(800, now);
  clickOsc.frequency.exponentialRampToValueAtTime(150, now + 0.04);
  clickGain.gain.setValueAtTime(0.15, now);
  clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

  clickOsc.connect(clickGain);
  clickGain.connect(ctx.destination);

  clickOsc.start(now);
  clickOsc.stop(now + 0.05);
};

/**
 * 2. Invalid Placement Mechanical Buzzer
 */
export const playErrorBuzzer = () => {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(160, now);
  osc.frequency.setValueAtTime(120, now + 0.08);

  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.25);
};

/**
 * 3. Deep Maritime Ship Foghorn
 * Rich multi-oscillator chord (F2 + A2 + C3) simulating an ocean container vessel horn.
 */
export const playShipHorn = () => {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const duration = 1.4;

  const frequencies = [87.3, 110.0, 130.8]; // F2 chord

  frequencies.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = idx === 0 ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.98, now + duration);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.18 / (idx + 1), now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.05);
  });
};

/**
 * 4. Revenue Discharge / Coin Chime
 */
export const playCashCoin = () => {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [587.33, 880.0, 1174.66]; // D5, A5, D6

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + i * 0.08);

    gain.gain.setValueAtTime(0.001, now + i * 0.08);
    gain.gain.linearRampToValueAtTime(0.2, now + i * 0.08 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + i * 0.08);
    osc.stop(now + i * 0.08 + 0.3);
  });
};

/**
 * 5. Countdown Tension Tick
 */
export const playTimerTick = () => {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(950, now);
  osc.frequency.exponentialRampToValueAtTime(400, now + 0.03);

  gain.gain.setValueAtTime(0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.04);
};
