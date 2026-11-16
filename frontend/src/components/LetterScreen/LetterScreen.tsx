import type { LetterFlowState } from '../../state/letterFlow';
import { letterContent } from '../../content/letterContent';
import { appConfig } from '../../config/appConfig';
import { Envelope } from '../Envelope/Envelope';
import { Letter } from '../Letter/Letter';
import { AnimationLayer } from '../AnimationLayer/AnimationLayer';
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
 * Главный экран: центральная область для конверта/письма,
 * подсказка и зарезервированный слой анимаций.
 */
export function LetterScreen({ state, greetingName, isTelegram, onOpen }: LetterScreenProps) {
  const showEnvelope = state === 'idle' || state === 'opening';
  const showHint = state === 'idle';

  return (
    <main className="screen">
      <header className="screen__header">
        {greetingName ? <p className="screen__greeting">Привет, {greetingName}!</p> : null}
        <h1 className="screen__title">{letterContent.title}</h1>
      </header>

      <div className="screen__stage" data-flow-state={state}>
        {showEnvelope ? <Envelope state={state} onOpen={onOpen} /> : null}
        {state === 'opened' ? <Letter content={letterContent} /> : null}
      </div>

      <footer className="screen__footer">
        {showHint ? <p className="screen__hint">Нажми на сердце, чтобы открыть письмо</p> : null}
        {appConfig.debug.showDevelopmentBadge && !isTelegram ? (
          <p className="screen__dev-note">
            Режим разработки: Telegram WebApp API недоступен
          </p>
        ) : null}
      </footer>

      <AnimationLayer state={state} />
    </main>
  );
}
