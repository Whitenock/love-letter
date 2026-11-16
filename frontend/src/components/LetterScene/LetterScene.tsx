import { useRef } from 'react';
import type { LetterFlowState } from '../../state/letterFlow';
import { notifyHapticTap } from '../../telegram/telegramWebApp';
import { HeartTrail } from './HeartTrail';
import './LetterScene.css';

interface LetterSceneProps {
  state: LetterFlowState;
  onOpen: () => void;
}

/**
 * Стартовая кинематографичная сцена: объёмное бумажное письмо вылетает
 * из глубины экрана со шлейфом из сердечек, останавливается в центре,
 * сердце на лицевой стороне продолжает биться.
 *
 * Структура слоёв (сверху вниз по z-index):
 *   .scene__flight  — письмо (полёт -> посадка -> лёгкое парение);
 *   .heart-trail    — canvas со шлейфом (письмо летит ПОВЕРХ шлейфа);
 *   .scene__shadow  — контактная тень на «поверхности».
 *
 * Полёт выполняется один раз при монтировании (idle) и не повторяется
 * при смене состояния flow.
 */
export function LetterScene({ state, onOpen }: LetterSceneProps) {
  const flightRef = useRef<HTMLDivElement | null>(null);

  const handleOpen = (): void => {
    if (state !== 'idle') {
      return;
    }
    notifyHapticTap();
    onOpen();
  };

  return (
    <>
      {/* Canvas вынесен из .scene: perspective у сцены делает её containing
          block для fixed-потомков, и координаты canvas перестают совпадать
          с вьюпортом. Отрицательный z-index — шлейф всегда позади письма. */}
      <HeartTrail targetRef={flightRef} />

      <div className="scene" data-flow-state={state}>
        {/* Контактная тень: живёт на «поверхности», меняется вместе с полётом. */}
        <div className="scene__shadow" aria-hidden="true" />

        <div className="scene__flight" ref={flightRef}>
          <div className="scene__float">
            <div className="scene__paper" aria-label="Письмо с сердцем">
              {/* Обратная сторона и торцы — ощущение толщины листа. */}
              <span className="scene__paper-back" aria-hidden="true" />
              <span className="scene__paper-edge" aria-hidden="true" />
              <span className="scene__paper-face">
                <span className="scene__paper-grain" aria-hidden="true" />
                <span className="scene__paper-sheen" aria-hidden="true" />
                <span className="scene__heart-shadow" aria-hidden="true" />
                <button
                  type="button"
                  className="scene-heart"
                  onClick={handleOpen}
                  disabled={state !== 'idle'}
                  aria-label="Открыть письмо"
                >
                  <span className="scene-heart__shape" aria-hidden="true" />
                  <span className="scene-heart__sheen" aria-hidden="true" />
                </button>
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
