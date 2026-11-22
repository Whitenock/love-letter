import { useEffect, useRef, useState } from 'react';
import { appConfig } from '../../config/appConfig';
import { letterContent } from '../../content/letterContent';
import { playSoundCue } from '../../services/soundCues';

interface LetterSheetProps {
  /** Метка времени начала открытия конверта (performance.now()) или null. */
  openAt: number | null;
}

/**
 * Маркер начала «закрытия» письма (подпись + P.S.) — печатается отдельно
 * и выравнивается по правому краю, как в настоящем письме.
 */
const CLOSING_MARKER = 'С любовью';

/**
 * Письмо второй сцены: вылетает из конверта слегка помятым (три сложенные
 * полосы-сгиба), последовательно раскладывается в воздухе и, остановившись
 * в центре, печатает текст из letterContent.sceneText посимвольно.
 *
 * Раскладка сгибов — CSS-анимации с задержками (полосы с transform-origin
 * по линиям сгиба); печать текста — JS-таймер. Текст — отдельный элемент
 * .scene__letter-text, источник — letterContent.sceneText.
 *
 * Длинное письмо прокручивается свайпом вверх/вниз внутри карточки письма
 * (overflow на .scene__letter-face); при печати карточка автопрокручивается
 * к последнему напечатанному символу, если пользователь не прокрутил вручную.
 */
export function LetterSheet({ openAt }: LetterSheetProps) {
  const [typedLength, setTypedLength] = useState(0);
  const typingTimer = useRef<number | null>(null);
  const faceRef = useRef<HTMLDivElement | null>(null);

  const fullText = letterContent.sceneText;
  const closingIndex = fullText.indexOf(CLOSING_MARKER);

  useEffect(() => {
    if (openAt === null) {
      return;
    }
    playSoundCue('text-scratch');
    // Компонент монтируется в момент старта открытия, поэтому задержка
    // равна полному typingStartMs от начала открытия. Без флага-защиты:
    // в StrictMode первый прогон эффекта ставит таймер, cleanup его снимает,
    // второй прогон запускает заново — флаг заблокировал бы рестарт и печать
    // никогда не началась бы.
    const delay = window.setTimeout(() => {
      typingTimer.current = window.setInterval(() => {
        setTypedLength((current) => {
          if (current >= fullText.length) {
            if (typingTimer.current !== null) {
              window.clearInterval(typingTimer.current);
              typingTimer.current = null;
            }
            return current;
          }
          return current + 1;
        });
      }, appConfig.scene2.typingCharMs);
    }, appConfig.scene2.typingStartMs);

    return () => {
      window.clearTimeout(delay);
      if (typingTimer.current !== null) {
        window.clearInterval(typingTimer.current);
        typingTimer.current = null;
      }
    };
  }, [openAt, fullText.length]);

  // Автопрокрутка к напечатанному тексту (прилипание к низу), если
  // пользователь сам не прокрутил письмо вверх.
  useEffect(() => {
    const el = faceRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    if (nearBottom) {
      el.scrollTop = el.scrollHeight;
    }
  }, [typedLength]);

  const typed = fullText.slice(0, typedLength);

  // До начала закрытия — весь напечатанный текст в одном абзаце.
  const beforeClosing =
    closingIndex === -1 || typedLength <= closingIndex
      ? typed
      : fullText.slice(0, closingIndex);

  const closingTyped =
    closingIndex === -1 || typedLength <= closingIndex
      ? ''
      : fullText.slice(closingIndex, typedLength);

  return (
    <div className="scene__letter-fly" aria-live="polite">
      <div className="scene__letter-sheet">
        {/* Сложенные полосы — визуально «помятое» письмо в начале полёта.
            Раскладываются последовательно (CSS-анимации с задержками). */}
        <span className="scene__letter-band scene__letter-band--top" aria-hidden="true" />
        <span className="scene__letter-band scene__letter-band--middle" aria-hidden="true" />
        <span className="scene__letter-band scene__letter-band--bottom" aria-hidden="true" />
        <span className="scene__letter-crease" aria-hidden="true" />
        {/* Чистая лицевая сторона с текстом: проявляется, когда сгибы расправлены.
            Прокручивается свайпом, если текст длиннее карточки. */}
        <div className="scene__letter-face" ref={faceRef}>
          <p className="scene__letter-text">
            {beforeClosing}
            {closingIndex === -1 || typedLength <= closingIndex ? (
              <span
                className="scene__letter-caret"
                aria-hidden="true"
                style={{ opacity: typedLength < fullText.length ? 1 : 0 }}
              />
            ) : null}
          </p>
          {closingTyped ? (
            <div className="scene__letter-closing">
              <p className="scene__letter-text scene__letter-text--closing">
                {closingTyped}
                <span
                  className="scene__letter-caret"
                  aria-hidden="true"
                  style={{ opacity: typedLength < fullText.length ? 1 : 0 }}
                />
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}