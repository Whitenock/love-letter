/**
 * Единая логика воспроизведения музыки — единственный Audio-экземпляр
 * на всё приложение (паттерн подписки повторяет services/soundCues.ts).
 *
 * Компоненты плеера только читают состояние и вызывают действия,
 * никакой работы с тегом <audio> внутри UI нет.
 *
 * Ограничения мобильных браузеров учтены: музыка никогда не запускается
 * сама — только после явного действия пользователя (play/togglePlay).
 */
import { musicTracks, type MusicTrack } from '../content/musicTracks';

export interface MusicPlayerState {
  tracks: readonly MusicTrack[];
  /** Индекс текущего трека; -1 — ничего не выбрано (пустой плейлист). */
  currentIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  /** Трек выбран, но файл ещё не загрузился (ждём metadata/данные). */
  isLoading: boolean;
  /** Текст ошибки последнего неудачного действия, если была. */
  error: string | null;
}

type Listener = () => void;

const VOLUME_STORAGE_KEY = 'love-letter:player:volume';
const MUTED_STORAGE_KEY = 'love-letter:player:muted';

function readPersistedNumber(key: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const value = Number(raw);
    return Number.isFinite(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function persist(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // localStorage может быть недоступен (приватный режим) — это не критично.
  }
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

class MusicPlayerService {
  private readonly audio: HTMLAudioElement;

  /** Web Audio: позволяет регулировать громкость на iOS, где
   *  HTMLAudioElement.volume доступен только для чтения. */
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private useGain = false;

  private readonly listeners = new Set<Listener>();

  private state: MusicPlayerState = {
    tracks: musicTracks,
    currentIndex: musicTracks.length > 0 ? 0 : -1,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: clamp01(readPersistedNumber(VOLUME_STORAGE_KEY, 0.8)),
    muted: readPersistedNumber(MUTED_STORAGE_KEY, 0) === 1,
    isLoading: false,
    error: null,
  };

  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.audio.crossOrigin = 'anonymous';
    this.audio.volume = 1; // громкость управляется через GainNode (см. ниже)
    this.audio.muted = this.state.muted;
    this.setupAudioGraph();
    this.bindAudioEvents();
    this.setupMediaSession();
    // Загружаем metadata первого трека сразу, чтобы длительность была видна
    // до первого запуска (воспроизведение при этом не начинается).
    if (this.state.currentIndex >= 0) {
      this.loadTrack(this.state.currentIndex, { keepPlaying: false });
    }
  }

  /** Строит цепочку Web Audio: source -> gain -> destination.
   *  На платформах без Web Audio остаёмся на прямом audio.volume. */
  private setupAudioGraph(): void {
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const source = ctx.createMediaElementSource(this.audio);
      const gain = ctx.createGain();
      gain.gain.value = this.state.volume;
      source.connect(gain);
      gain.connect(ctx.destination);
      this.audioContext = ctx;
      this.gainNode = gain;
      this.useGain = true;
    } catch (error) {
      // Не удалось создать граф — откатываемся к прямому управлению громкостью.
      this.useGain = false;
      this.audio.volume = this.state.volume;
      console.warn('Web Audio недоступен, громкость через audio.volume', error);
    }
  }

  private resumeAudioContext(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {
        /* Игнорируем: контекст возобновится при следующем жесте. */
      });
    }
  }

  // ── Публичный API ────────────────────────────────────────────────────

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getState = (): MusicPlayerState => this.state;

  /** Первый трек уже выбран, но не играет: запуск по жесту пользователя. */
  hasTracks(): boolean {
    return this.state.tracks.length > 0;
  }

  togglePlay(): void {
    if (this.state.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  play(): void {
    if (this.state.currentIndex < 0) return;
    if (this.state.error) {
      // После ошибки не пытаемся играть битый файл — сбрасываем, если трек сменили.
      this.state = { ...this.state, error: null };
      this.emit();
    }
    this.resumeAudioContext();
    this.audio
      .play()
      .then(() => {
        // isPlaying придёт событием 'play' — здесь только очистка ошибки.
      })
      .catch(() => {
        this.setState({ error: 'Не удалось начать воспроизведение' });
      });
  }

  pause(): void {
    this.audio.pause();
  }

  next(): void {
    const { tracks, currentIndex } = this.state;
    if (tracks.length === 0) return;
    const nextIndex = (currentIndex + 1) % tracks.length;
    this.selectTrack(nextIndex);
  }

  previous(): void {
    const { tracks, currentIndex } = this.state;
    if (tracks.length === 0) return;
    // Стандартное поведение: если трек играется дольше 3 секунд — сначала
    // перематываем в начало, и только потом уходим к предыдущему.
    if (this.state.currentTime > 3) {
      this.seek(0);
      return;
    }
    const prevIndex = (currentIndex - 1 + tracks.length) % tracks.length;
    this.selectTrack(prevIndex);
  }

  /** Выбор песни из списка: сразу начинает воспроизведение. */
  selectTrack(index: number): void {
    if (index < 0 || index >= this.state.tracks.length) return;
    const wasPlaying = this.state.isPlaying;
    this.loadTrack(index, { keepPlaying: wasPlaying });
  }

  /** Выбор песни из списка с немедленным запуском воспроизведения. */
  playTrack(index: number): void {
    if (index < 0 || index >= this.state.tracks.length) return;
    this.loadTrack(index, { keepPlaying: true });
  }

  /** Перемотка в произвольную точку трека. */
  seek(time: number): void {
    if (!Number.isFinite(time)) return;
    const duration = this.audio.duration;
    if (Number.isFinite(duration) && duration > 0) {
      this.audio.currentTime = Math.min(Math.max(0, time), duration);
    }
    this.setState({ currentTime: this.audio.currentTime });
  }

  setVolume(volume: number): void {
    const next = clamp01(volume);
    if (this.useGain && this.gainNode) {
      // Плавное изменение, чтобы не было щелчков.
      const now = this.audioContext?.currentTime ?? 0;
      this.gainNode.gain.cancelScheduledValues(now);
      this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
      this.gainNode.gain.linearRampToValueAtTime(next, now + 0.05);
    } else {
      this.audio.volume = next;
    }
    // Громкость > 0 снимает mute — ожидаемое поведение регулятора.
    const muted = next === 0 ? this.state.muted : false;
    this.audio.muted = muted;
    this.setState({ volume: next, muted });
    persist(VOLUME_STORAGE_KEY, String(next));
    persist(MUTED_STORAGE_KEY, muted ? '1' : '0');
  }

  toggleMute(): void {
    const muted = !this.state.muted;
    this.audio.muted = muted;
    this.setState({ muted });
    persist(MUTED_STORAGE_KEY, muted ? '1' : '0');
  }

  // ── Интеграция с системным медиаплеером (замок экрана, наушники) ─────

  private setupMediaSession(): void {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.setActionHandler('play', () => this.play());
    navigator.mediaSession.setActionHandler('pause', () => this.pause());
    navigator.mediaSession.setActionHandler('previoustrack', () => this.previous());
    navigator.mediaSession.setActionHandler('nexttrack', () => this.next());
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined && details.seekTime !== null) {
        this.seek(details.seekTime);
      }
    });
  }

  private updateMediaSessionMetadata(track: MusicTrack): void {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist ?? '',
      album: 'Любовное письмо',
      artwork: track.cover ? [{ src: track.cover }] : [],
    });
  }

  // ── Внутреннее ───────────────────────────────────────────────────────

  private loadTrack(index: number, options: { keepPlaying: boolean }): void {
    const track = this.state.tracks[index];
    if (!track) return;

    this.audio.pause();
    this.audio.src = track.src;
    this.audio.load();
    this.updateMediaSessionMetadata(track);

    this.state = {
      ...this.state,
      currentIndex: index,
      currentTime: 0,
      duration: 0,
      isPlaying: false,
      isLoading: true,
      error: null,
    };
    this.emit();

    if (options.keepPlaying) {
      // Автопереход на следующий трек или явный выбор из списка при
      // играющем плеере: продолжаем без паузы, если загрузка успешна.
      this.audio
        .play()
        .catch(() => {
          // Ошибка придёт событием 'error' и покажется в UI.
          this.setState({ isPlaying: false });
        });
    }
  }

  private bindAudioEvents(): void {
    this.audio.addEventListener('play', () => {
      this.setState({ isPlaying: true, error: null });
    });
    this.audio.addEventListener('pause', () => {
      this.setState({ isPlaying: false });
    });
    this.audio.addEventListener('timeupdate', () => {
      this.setState({ currentTime: this.audio.currentTime });
    });
    this.audio.addEventListener('durationchange', () => {
      this.setState({ duration: this.audio.duration });
    });
    this.audio.addEventListener('loadedmetadata', () => {
      this.setState({ isLoading: false });
    });
    this.audio.addEventListener('canplay', () => {
      this.setState({ isLoading: false });
    });
    this.audio.addEventListener('waiting', () => {
      this.setState({ isLoading: true });
    });
    this.audio.addEventListener('ended', () => {
      // Автоматический переход на следующую песню.
      const { tracks, currentIndex } = this.state;
      if (tracks.length <= 1) {
        this.setState({ isPlaying: false, currentTime: 0 });
        return;
      }
      const nextIndex = (currentIndex + 1) % tracks.length;
      this.loadTrack(nextIndex, { keepPlaying: true });
    });
    this.audio.addEventListener('error', () => {
      this.setState({
        isLoading: false,
        isPlaying: false,
        error: 'Не удалось загрузить трек',
      });
    });
  }

  private setState(partial: Partial<MusicPlayerState>): void {
    this.state = { ...this.state, ...partial };
    this.emit();
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }
}

/** Синглтон: один аудиоплеер на всё приложение, переживает смену состояний сцены. */
export const musicPlayer = new MusicPlayerService();
