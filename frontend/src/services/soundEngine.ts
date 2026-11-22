/**
 * Аудио-движок звуковых эффектов сцены.
 *
 * Подписывается на шину `onSoundCue` и воспроизводит синтезированные звуки
 * через Web Audio API. Дополнительно предоставляет функции для непрерывного
 * звука накопления заряда (`startHoldSound`/`stopHoldSound`), который
 * нарастает вместе с пульсацией сердца.
 *
 * Звуки генерируются программно (шум + тона + фильтры), поэтому не требуют
 * аудиофайлов. Громкость невысокая, каждый звук имеет плавный attack/decay.
 * AudioContext инициализируется/возобновляется при первом жесте пользователя.
 */
import { onSoundCue, type SoundCue } from './soundCues';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

// Непрерывный звук накопления заряда.
let holdSource: AudioBufferSourceNode | null = null;
let holdFilter: BiquadFilterNode | null = null;
let holdGain: GainNode | null = null;
let holdLfo: OscillatorNode | null = null;
let holdLfoGain: GainNode | null = null;

function ensureContext(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor =
    (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.22;
    master.connect(ctx.destination);
    return ctx;
  } catch {
    return null;
  }
}

function resumeContext(c: AudioContext): void {
  if (c.state === 'suspended') {
    void c.resume();
  }
}

/** Короткий шумовой бурст с огибающей. */
function noiseBurst(
  duration: number,
  filterType: BiquadFilterType,
  frequency: number,
  q: number,
  peak: number,
  attack = 0.008,
  decay?: number,
): void {
  const c = ensureContext();
  if (!c || !master) return;
  resumeContext(c);

  const samples = Math.floor(c.sampleRate * duration);
  const buffer = c.createBuffer(1, samples, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < samples; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / samples);
  }

  const source = c.createBufferSource();
  source.buffer = buffer;

  const filter = c.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = frequency;
  filter.Q.value = q;

  const gain = c.createGain();
  const now = c.currentTime;
  const dec = decay ?? duration;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(peak, now + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dec);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(master);

  source.start(now);
  source.stop(now + duration + 0.05);
}

/** Короткий тон с огибающей и возможным слайдом. */
function tone(
  frequency: number,
  duration: number,
  type: OscillatorType,
  peak: number,
  attack = 0.006,
  slideTo?: number,
): void {
  const c = ensureContext();
  if (!c || !master) return;
  resumeContext(c);

  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, c.currentTime);
  if (slideTo !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + duration);
  }

  const gain = c.createGain();
  const now = c.currentTime;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(peak, now + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain);
  gain.connect(master);

  osc.start(now);
  osc.stop(now + duration + 0.05);
}

/** Несколько коротких шумовых импульсов (бумажки). */
function paperBits(count: number, baseFreq: number, peak: number): void {
  for (let i = 0; i < count; i++) {
    window.setTimeout(() => {
      noiseBurst(0.09 + Math.random() * 0.06, 'highpass', baseFreq + Math.random() * 600, 1.0, peak * (0.6 + Math.random() * 0.4));
    }, i * 40);
  }
}

/** Запуск непрерывного звука накопления заряда. */
export function startHoldSound(): void {
  const c = ensureContext();
  if (!c || !master) return;
  resumeContext(c);
  stopHoldSound();

  const duration = 2.5;
  const samples = Math.floor(c.sampleRate * duration);
  const buffer = c.createBuffer(1, samples, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < samples; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  holdSource = c.createBufferSource();
  holdSource.buffer = buffer;
  holdSource.loop = true;

  holdFilter = c.createBiquadFilter();
  holdFilter.type = 'bandpass';
  holdFilter.frequency.value = 600;
  holdFilter.Q.value = 2.5;

  holdGain = c.createGain();
  const now = c.currentTime;
  holdGain.gain.setValueAtTime(0.0001, now);
  holdGain.gain.linearRampToValueAtTime(0.18, now + 1.8);

  // LFO для пульсации громкости.
  holdLfo = c.createOscillator();
  holdLfo.type = 'sine';
  holdLfo.frequency.value = 1.6;
  holdLfoGain = c.createGain();
  holdLfoGain.gain.value = 0.06;
  holdLfo.connect(holdLfoGain);
  holdLfoGain.connect(holdGain.gain);

  holdSource.connect(holdFilter);
  holdFilter.connect(holdGain);
  holdGain.connect(master);

  holdSource.start(now);
  holdLfo.start(now);
}

/** Остановка звука накопления с плавным затуханием. */
export function stopHoldSound(): void {
  const c = ctx;
  if (!c || !holdGain || !holdSource) return;
  const now = c.currentTime;
  holdGain.gain.cancelScheduledValues(now);
  holdGain.gain.setValueAtTime(holdGain.gain.value, now);
  holdGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
  holdSource.stop(now + 0.3);
  if (holdLfo) holdLfo.stop(now + 0.3);
  holdSource = null;
  holdFilter = null;
  holdGain = null;
  holdLfo = null;
  holdLfoGain = null;
}

function handleCue(cue: SoundCue): void {
  switch (cue) {
    // Первый контакт с сердцем — лёгкий удар (thump).
    case 'hold-start':
      tone(110, 0.12, 'sine', 0.28, 0.005, 80);
      noiseBurst(0.1, 'lowpass', 400, 0.8, 0.18);
      startHoldSound();
      break;
    // Клапан начал открываться — хлопок бумаги.
    case 'flap-open':
      stopHoldSound();
      noiseBurst(0.14, 'highpass', 1800, 1.2, 0.45);
      tone(220, 0.1, 'triangle', 0.22, 0.004, 140);
      break;
    // Вылет сердечек — шорох бумажек.
    case 'hearts-burst':
      paperBits(5, 2000, 0.22);
      tone(659.25, 0.18, 'sine', 0.12, 0.02, 783.99);
      break;
    // Разглаживание бумаги — длинный шорох.
    case 'paper-unfold':
      noiseBurst(0.6, 'bandpass', 1100, 0.6, 0.2);
      break;
    // Начало печати — очень тихий скрежет карандаша.
    case 'text-scratch':
      noiseBurst(0.2, 'highpass', 3500, 1.6, 0.08);
      break;
  }
}

onSoundCue(handleCue);
