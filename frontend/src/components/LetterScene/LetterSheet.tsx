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
 * Рисунки лежат за текстом (z-index ниже) и прокручиваются вместе с ним.
 */
export function LetterSheet({ openAt }: LetterSheetProps) {
  const [typedLength, setTypedLength] = useState(0);
  const typingTimer = useRef<number | null>(null);
  const faceRef = useRef<HTMLDivElement | null>(null);
  const textWrapRef = useRef<HTMLDivElement | null>(null);

  const fullText = letterContent.sceneText;
  const closingIndex = fullText.indexOf(CLOSING_MARKER);

  useEffect(() => {
    if (openAt === null) {
      return;
    }
    playSoundCue('text-scratch');
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

  useEffect(() => {
    const el = faceRef.current;
    if (!el) return;
    const textWrap = textWrapRef.current;
    if (!textWrap) return;
    const textHeight = textWrap.offsetHeight;
    const maxScroll = Math.max(0, textHeight - el.clientHeight);
    const nearBottom = el.scrollTop >= maxScroll - 48;
    if (nearBottom) {
      el.scrollTop = maxScroll;
    }
  }, [typedLength]);

  // Ограничение ручной прокрутки: нельзя прокрутить ниже напечатанного текста.
  useEffect(() => {
    const el = faceRef.current;
    if (!el) return;
    const clamp = () => {
      const textWrap = textWrapRef.current;
      if (!textWrap) return;
      const textHeight = textWrap.offsetHeight;
      const maxScroll = Math.max(0, textHeight - el.clientHeight);
      if (el.scrollTop > maxScroll) {
        el.scrollTop = maxScroll;
      }
    };
    el.addEventListener('scroll', clamp);
    return () => el.removeEventListener('scroll', clamp);
  }, []);

  const typed = fullText.slice(0, typedLength);

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
        <span className="scene__letter-band scene__letter-band--top" aria-hidden="true" />
        <span className="scene__letter-band scene__letter-band--middle" aria-hidden="true" />
        <span className="scene__letter-band scene__letter-band--bottom" aria-hidden="true" />
        <span className="scene__letter-crease" aria-hidden="true" />
        <div className="scene__letter-face" ref={faceRef}>
          <div className="scene__letter-content">
            <img
              className="scene__letter-drawing scene__letter-drawing--1"
              src="./letter-drawings/draw1_tl.jpg"
              alt=""
              aria-hidden="true"
            />
            <img
              className="scene__letter-drawing scene__letter-drawing--2"
              src="./letter-drawings/draw2_tr.jpg"
              alt=""
              aria-hidden="true"
            />
            <img
              className="scene__letter-drawing scene__letter-drawing--3"
              src="./letter-drawings/draw3_bl.jpg"
              alt=""
              aria-hidden="true"
            />
            <img
              className="scene__letter-drawing scene__letter-drawing--4"
              src="./letter-drawings/draw4_br.jpg"
              alt=""
              aria-hidden="true"
            />
            <img
              className="scene__letter-drawing scene__letter-drawing--5"
              src="./letter-drawings/draw5.jpg"
              alt=""
              aria-hidden="true"
            />
            <div className="scene__letter-text-wrap" ref={textWrapRef}>
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
      </div>
    </div>
  );
}