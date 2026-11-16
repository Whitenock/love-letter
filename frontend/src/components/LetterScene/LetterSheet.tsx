import { useEffect, useRef, useState } from 'react';
import { appConfig } from '../../config/appConfig';
import { letterContent } from '../../content/letterContent';
import { playSoundCue } from '../../services/soundCues';

interface LetterSheetProps {
  /** Метка времени начала открытия конверта (performance.now()) или null. */
  openAt: number | null;
}

/**
 * Письмо второй сцены: вылетает из конверта слегка помятым (три сложенные
 * полосы-сгиба), последовательно раскладывается в воздухе и, остановившись
 * в центре, печатает текст из letterContent.sceneText посимвольно.
 *
 * Раскладка сгибов — CSS-анимации с задержками (полосы с transform-origin
 * по линиям сгиба); печать текста — JS-таймер. Текст — отдельный элемент
 * .scene__letter-text, источник — letterContent.sceneText.
 */
export function LetterSheet({ openAt }: LetterSheetProps) {
  const [typedLength, setTypedLength] = useState(0);
  const typingTimer = useRef<number | null>(null);

  const fullText = letterContent.sceneText;

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

  return (
    <div className="scene__letter-fly" aria-live="polite">
      <div className="scene__letter-sheet">
        {/* Сложенные полосы — визуально «помятое» письмо в начале полёта.
            Раскладываются последовательно (CSS-анимации с задержками). */}
        <span className="scene__letter-band scene__letter-band--top" aria-hidden="true" />
        <span className="scene__letter-band scene__letter-band--middle" aria-hidden="true" />
        <span className="scene__letter-band scene__letter-band--bottom" aria-hidden="true" />
        <span className="scene__letter-crease" aria-hidden="true" />
        {/* Чистая лицевая сторона с текстом: проявляется, когда сгибы расправлены. */}
        <div className="scene__letter-face">
          <p className="scene__letter-text">
            {fullText.slice(0, typedLength)}
            <span
              className="scene__letter-caret"
              aria-hidden="true"
              style={{ opacity: typedLength < fullText.length ? 1 : 0 }}
            />
          </p>
        </div>
      </div>
    </div>
  );
}
