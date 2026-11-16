/**
 * Музыкальный плеер проекта: компактная капсула (стиль Dynamic Island)
 * в верхнем правом углу и раскрывающаяся панель со списком композиций.
 *
 * Компонент не содержит логики воспроизведения — только отображение
 * состояния services/musicPlayer.ts и вызовы его действий.
 * Один экземпляр Audio живёт в сервисе, поэтому раскрытие/сворачивание
 * и смены состояний сцены не влияют на воспроизведение.
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { musicPlayer, useMusicPlayer } from '../../hooks/useMusicPlayer';
import type { MusicPlayerState } from '../../services/musicPlayer';
import './MusicPlayer.css';

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Анимированные полоски эквалайзера; играют только во время воспроизведения. */
function Equalizer({ isPlaying }: { isPlaying: boolean }) {
  return (
    <span className={`mp-eq${isPlaying ? ' mp-eq--on' : ''}`} aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

function HeartCover({ size }: { size: 'small' | 'large' }) {
  return (
    <span className={`mp-cover mp-cover--${size}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 21s-7.5-4.7-10-9.3C.4 8.7 2 5 5.5 5c2 0 3.4 1.1 4.2 2.4h4.6C15.1 6.1 16.5 5 18.5 5 22 5 23.6 8.7 22 11.7 19.5 16.3 12 21 12 21z" />
      </svg>
    </span>
  );
}

/** Достижимый прогресс-бар: range поверх полосы-заполнителя. */
function SeekBar({
  value,
  max,
  onSeek,
  ariaLabel,
  className,
}: {
  value: number;
  max: number;
  onSeek: (time: number) => void;
  ariaLabel: string;
  className?: string;
}) {
  const fill = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className={`mp-seek ${className ?? ''}`}>
      <span className="mp-seek__fill" style={{ width: `${fill}%` }} aria-hidden="true" />
      <input
        type="range"
        min={0}
        max={max > 0 ? max : 1}
        step={0.1}
        value={value}
        aria-label={ariaLabel}
        disabled={max <= 0}
        onChange={(e) => onSeek(Number(e.target.value))}
      />
    </div>
  );
}

function VolumeControl({ volume, muted }: { volume: number; muted: boolean }) {
  return (
    <div className="mp-volume">
      <button
        type="button"
        className="mp-icon-btn"
        onClick={() => musicPlayer.toggleMute()}
        title={muted ? 'Включить звук' : 'Выключить звук'}
        aria-label={muted ? 'Включить звук' : 'Выключить звук'}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 5 6 9H3v6h3l5 4V5z" />
          {muted ? (
            <>
              <line x1="16" y1="9" x2="21" y2="14" />
              <line x1="21" y1="9" x2="16" y2="14" />
            </>
          ) : (
            <path d="M16.5 8.5a5 5 0 0 1 0 7" />
          )}
        </svg>
      </button>
      <input
        type="range"
        className="mp-volume__slider"
        min={0}
        max={1}
        step={0.01}
        value={volume}
        style={{ '--mp-vol': volume } as CSSProperties}
        aria-label="Громкость"
        onChange={(e) => musicPlayer.setVolume(Number(e.target.value))}
      />
    </div>
  );
}

function TrackList({ state }: { state: MusicPlayerState }) {
  return (
    <ul className="mp-list">
      {state.tracks.map((track, index) => {
        const isCurrent = index === state.currentIndex;
        return (
          <li key={track.id}>
            <button
              type="button"
              className={`mp-list__item${isCurrent ? ' mp-list__item--current' : ''}`}
              onClick={() => musicPlayer.playTrack(index)}
              title={`Слушать: ${track.title}`}
            >
              {isCurrent ? (
                <Equalizer isPlaying={state.isPlaying} />
              ) : (
                <span className="mp-list__num" aria-hidden="true">
                  {index + 1}
                </span>
              )}
              <span className="mp-list__title">{track.title}</span>
              {track.artist ? <span className="mp-list__artist">{track.artist}</span> : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function MusicPlayer() {
  const state = useMusicPlayer();
  const [expanded, setExpanded] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const track = state.tracks[state.currentIndex];
  if (!track) return null;

  // Клик мимо раскрытой панели или Escape — свернуть.
  useEffect(() => {
    if (!expanded) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [expanded]);

  const progress = state.duration > 0 ? state.currentTime / state.duration : 0;

  return (
    <div
      ref={rootRef}
      className={`music-player${expanded ? ' music-player--expanded' : ''}`}
      role="group"
      aria-label="Музыкальный плеер"
    >
      {/* ── Компактный режим: капсула в стиле Dynamic Island ── */}
      <div
        className="music-player__mini"
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') setExpanded(true);
        }}
        title="Открыть плеер"
        aria-expanded={expanded}
        aria-label={`Открыть плеер: ${track.title}`}
      >
        {track.cover ? (
          <img className="mp-cover-img" src={track.cover} alt="" />
        ) : (
          <HeartCover size="small" />
        )}
        <span className="mp-mini__text">
          <span className="mp-mini__title">{track.title}</span>
          <Equalizer isPlaying={state.isPlaying} />
        </span>
        <button
          type="button"
          className="mp-mini__btn"
          aria-label={state.isPlaying ? 'Пауза' : 'Играть'}
          title={state.isPlaying ? 'Пауза' : 'Играть'}
          onClick={(e) => {
            e.stopPropagation();
            musicPlayer.togglePlay();
          }}
        >
          {state.isPlaying ? (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="5" width="4" height="14" rx="1.2" />
              <rect x="14" y="5" width="4" height="14" rx="1.2" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5.5v13l11-6.5z" />
            </svg>
          )}
        </button>
        <button
          type="button"
          className="mp-mini__btn"
          aria-label="Следующая песня"
          title="Следующая песня"
          onClick={(e) => {
            e.stopPropagation();
            musicPlayer.next();
          }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 5.5v13L15 12z" />
            <rect x="16" y="5.5" width="2.4" height="13" rx="1.1" />
          </svg>
        </button>
        <span className="mp-mini__progress" aria-hidden="true">
          <span style={{ width: `${progress * 100}%` }} />
        </span>
      </div>

      {/* ── Раскрытый режим: панель вниз и влево от капсулы ── */}
      <section className="music-player__panel" aria-hidden={!expanded}>
        <header className="mp-panel__head">
          {track.cover ? (
            <img className="mp-cover-img mp-cover-img--lg" src={track.cover} alt="" />
          ) : (
            <HeartCover size="large" />
          )}
          {/* key перезапускает анимацию смены трека */}
          <div className="mp-panel__titles" key={track.id}>
            <span className="mp-panel__title">{track.title}</span>
            <span className="mp-panel__artist">{track.artist ?? ' '}</span>
          </div>
          <button
            type="button"
            className="mp-icon-btn"
            onClick={() => setExpanded(false)}
            title="Свернуть плеер"
            aria-label="Свернуть плеер"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 14 12 8 18 14" />
            </svg>
          </button>
        </header>

        <div className="mp-panel__progress">
          <SeekBar
            value={state.currentTime}
            max={state.duration}
            onSeek={(t) => musicPlayer.seek(t)}
            ariaLabel="Перемотка"
            className="mp-seek--wide"
          />
          <span className="mp-panel__times">
            <span>{formatTime(state.currentTime)}</span>
            <span>{state.isLoading ? '…' : formatTime(state.duration)}</span>
          </span>
        </div>

        {state.error ? <p className="mp-panel__error">{state.error}</p> : null}

        <div className="mp-panel__transport">
          <button
            type="button"
            className="mp-icon-btn"
            onClick={() => musicPlayer.previous()}
            title="Предыдущая песня"
            aria-label="Предыдущая песня"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 5.5v13L9 12z" />
              <rect x="5.6" y="5.5" width="2.4" height="13" rx="1.1" />
            </svg>
          </button>
          <button
            type="button"
            className="mp-play"
            onClick={() => musicPlayer.togglePlay()}
            title={state.isPlaying ? 'Пауза' : 'Играть'}
            aria-label={state.isPlaying ? 'Пауза' : 'Играть'}
          >
            {state.isPlaying ? (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <rect x="6.5" y="5" width="4" height="14" rx="1.2" />
                <rect x="13.5" y="5" width="4" height="14" rx="1.2" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.5 5.5v13l11-6.5z" />
              </svg>
            )}
          </button>
          <button
            type="button"
            className="mp-icon-btn"
            onClick={() => musicPlayer.next()}
            title="Следующая песня"
            aria-label="Следующая песня"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 5.5v13L15 12z" />
              <rect x="16" y="5.5" width="2.4" height="13" rx="1.1" />
            </svg>
          </button>
        </div>

        <VolumeControl volume={state.volume} muted={state.muted} />

        <TrackList state={state} />
      </section>
    </div>
  );
}
