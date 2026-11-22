import type { LetterFlowState } from '../../state/letterFlow';
import { useState } from 'react';
import { letterContent } from '../../content/letterContent';
import { appConfig } from '../../config/appConfig';
import { LetterScene } from '../LetterScene/LetterScene';
import { AnimationLayer } from '../AnimationLayer/AnimationLayer';
import { MusicPlayer } from '../MusicPlayer/MusicPlayer';
import { DrawingCanvas } from '../DrawingCanvas/DrawingCanvas';
import './LetterScreen.css';

interface LetterScreenProps {
  state: Exclude<LetterFlowState, 'loading'>;
  /** Имя пользователя Telegram (данные initDataUnsafe — только для отображения). */
  greetingName: string | null;
  /** Запущено ли внутри Telegram; иначе — режим разработки в браузере. */
  isTelegram: boolean;
  onOpen: () => void;
}

/**
 * Главный экран: единая сцена со конвертом — удержание сердца, открытие,
 * взрыв сердечек, письмо с печатью текста (idle/opening/opened).
 */
export function LetterScreen({ state, greetingName, isTelegram, onOpen }: LetterScreenProps) {
  const showHint = state === 'idle';
  const [drawingOpen, setDrawingOpen] = useState(false);

  return (
    <main className="screen">
      <header className="screen__header">
        {greetingName ? <p className="screen__greeting">Привет, {greetingName}!</p> : null}
        <h1 className="screen__title">{letterContent.title}</h1>
      </header>

      <div className="screen__stage" data-flow-state={state}>
        <LetterScene state={state} onOpen={onOpen} />
      </div>

      <footer className="screen__footer">
        {showHint ? <p className="screen__hint">Удерживай сердце, чтобы открыть письмо</p> : null}
        {appConfig.debug.showDevelopmentBadge && !isTelegram ? (
          <p className="screen__dev-note">
            Режим разработки: Telegram WebApp API недоступен
          </p>
        ) : null}
        <p className="screen__support-note">
          Приложение в разработке. Хочешь ускорить — поддержи автора поцелуями 💋
        </p>
      </footer>

      <AnimationLayer state={state} />
      <MusicPlayer />
      <button
        type="button"
        className="drawing-fab"
        onClick={() => setDrawingOpen(true)}
        aria-label="Открыть общий холст для рисования"
        title="Рисовать вместе"
      >
        🎨
      </button>
      <DrawingCanvas open={drawingOpen} onClose={() => setDrawingOpen(false)} />
    </main>
  );
}
