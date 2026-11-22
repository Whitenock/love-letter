/**
 * Аудио-движок звуковых эффектов сцены.
 *
 * Подписывается на шину `onSoundCue` и воспроизводит короткие синтезированные
 * звуки через Web Audio API. Звуки генерируются программно (белый/цветной шум
 * и короткие тона), поэтому не требуют аудиофайлов и деплоятся вместе с кодом.
 *
 * Громкость невысокая, каждый звук имеет плавный attack и decay, чтобы не
 * резать слух. AudioContext инициализируется/возобновляется при первом жесте
 * пользователя (cue `hold-start`), как требуют мобильные браузеры.
 */
import { onSoundCue, type SoundCue } from './soundCues';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

/** Ленивая инициализация AudioContext. Возвращает null, если API недоступен. */
function ensureContext(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor =
    (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.28;
    master.connect(ctx.destination);
    return ctx;
  } catch {
    return null;
  }
}

/** Возобновить контекст (нужно в жесте пользователя). */
function resumeContext(c: AudioContext): void {
  if (c.state === 'suspended') {
    void c.resume();
  }
}

/** Короткий шумовой бурст с огибающей громкости. */
function noiseBurst(
  duration: number,
  filterType: BiquadFilterType,
  frequency: number,
  q: number,
  peak: number,
  attack = 0.012,
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
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(peak, now + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(master);

  source.start(now);
  source.stop(now + duration + 0.05);
}

/** Короткий тон с огибающей. */
function tone(
  frequency: number,
  duration: number,
  type: OscillatorType,
  peak: number,
  attack = 0.01,
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

function handleCue(cue: SoundCue): void {
  switch (cue) {
    // Первый контакт с сердцем — лёгкий бумажный шорох.
    case 'hold-start':
      noiseBurst(0.18, 'bandpass', 1800, 1.2, 0.35);
      break;
    // Клапан начал открываться — короткий щелчок бумаги.
    case 'flap-open':
      noiseBurst(0.12, 'highpass', 2200, 0.8, 0.4);
      tone(420, 0.08, 'triangle', 0.18, 0.005, 260);
      break;
    // Вылет сердечек — мягкий "пух" + лёгкий звон.
    case 'hearts-burst':
      noiseBurst(0.35, 'lowpass', 900, 0.9, 0.32);
      tone(523.25, 0.22, 'sine', 0.14, 0.02, 659.25);
      break;
    // Разглаживание бумаги — длинный шорох.
    case 'paper-unfold':
      noiseBurst(0.55, 'bandpass', 1200, 0.7, 0.22);
      break;
    // Начало печати — тихий скрежет пера.
    case 'text-scratch':
      noiseBurst(0.25, 'highpass', 3200, 1.4, 0.16);
      break;
  }
}

onSoundCue(handleCue);
