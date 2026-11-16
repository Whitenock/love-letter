import { useCallback, useEffect, useRef, useState } from 'react';
import type { LetterFlowState } from '../../state/letterFlow';
import { appConfig } from '../../config/appConfig';
import { notifyHapticTap } from '../../telegram/telegramWebApp';
import { playSoundCue } from '../../services/soundCues';
import { HeartTrail } from './HeartTrail';
import { HeartField } from './HeartField';
import { LetterSheet } from './LetterSheet';
import './LetterScene.css';

interface LetterSceneProps {
  state: Exclude<LetterFlowState, 'loading'>;
  onOpen: () => void;
}

/**
 * Сцена-оркестратор.
 *
 * Слой 1 (сцена 1): объёмный конверт вылетает из глубины со шлейфом
 * сердечек и останавливается в центре; сердце-печать бьётся.
 *
 * Слой 2 (сцена 2): удержание сердца накапливает энергию — сердце
 * светится и пульсирует сильнее, конверт качается и трясётся, изнутри
 * пробивается розовое свечение. Отпускание раньше времени плавно
 * возвращает всё в исходное состояние. Успешное удержание запускает
 * открытие: клапан физически откидывается, из конверта вырывается
 * взрыв сердечек (canvas-физика с накоплением в куче внизу и
 * сенсорным взаимодействием) и помятое письмо, которое раскладывается
 * в воздухе и печатает текст.
 */
export function LetterScene({ state, onOpen }: LetterSceneProps) {
  const flightRef = useRef<HTMLDivElement | null>(null);
  const envelopeRef = useRef<HTMLDivElement | null>(null);
  const shakeRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<HTMLDivElement | null>(null);

  // Заряд удержания 0..1 (визуальные эффекты читают CSS-переменную --charge).
  const chargeRef = useRef(0);
  const holdStartRef = useRef<number | null>(null);
  const rafRef = useRef(0);
  const completedRef = useRef(false);
  const reducedMotionRef = useRef(false);

  // Метка времени начала открытия (для CSS-оркестровки и канваса взрыва).
  const [openAt, setOpenAt] = useState<number | null>(null);

  const reducedMotion = useCallback((): boolean => {
    if (reducedMotionRef.current) {
      return true;
    }
    reducedMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return reducedMotionRef.current;
  }, []);

  /** Плавный возврат в исходное состояние при преждевременном отпускании. */
  const animateRelease = useCallback((onDone?: () => void): void => {
    let last = performance.now();
    let raf = 0;
    const step = (now: number): void => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      chargeRef.current = Math.max(0, chargeRef.current - appConfig.scene2.releaseDecayPerSec * dt);
      const value = chargeRef.current;
      sceneRef.current?.style.setProperty('--charge', value.toFixed(3));
      if (shakeRef.current) {
        shakeRef.current.style.transform =
          value > 0.001 ? `translateY(${-value * 6}px)` : '';
      }
      if (value > 0) {
        raf = requestAnimationFrame(step);
      } else {
        holdStartRef.current = null;
        onDone?.();
      }
    };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(step);
    void raf;
  }, []);

  /** Гашение заряда после успешного удержания (свет уходит со взрывом). */
  const decayCharge = useCallback((): void => {
    let last = performance.now();
    const step = (now: number): void => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      chargeRef.current = Math.max(
        0,
        chargeRef.current - appConfig.scene2.releaseDecayPerSec * dt,
      );
      sceneRef.current?.style.setProperty('--charge', chargeRef.current.toFixed(3));
      if (chargeRef.current > 0) {
        rafRef.current = requestAnimationFrame(step);
      }
    };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(step);
  }, []);

  /** Цикл накопления заряда: свечение, тряска, покачивание. */
  const animateCharge = useCallback((): void => {
    const holdStart = holdStartRef.current;
    if (holdStart === null) {
      return;
    }
    const startShake = performance.now();
    let lastHaptic = startShake;

    const step = (now: number): void => {
      if (holdStartRef.current === null) {
        return; // удержание прервано — цикл останавливается, откат делает release
      }
      const heldMs = now - holdStart;
      const progress = Math.min(1, heldMs / appConfig.scene2.holdDurationMs);
      // easing: заряд быстро растёт вначале, к концу замедляется
      chargeRef.current = Math.min(1, progress * (2 - progress) * 0.98 + progress * 0.02);

      sceneRef.current?.style.setProperty('--charge', chargeRef.current.toFixed(3));

      // Тряска конверта: амплитуда и частота растут вместе с зарядом.
      if (shakeRef.current) {
        const shakeTime = (now - startShake) / 1000;
        const amplitude = reducedMotion() ? 0 : Math.pow(chargeRef.current, 2) * 7;
        const frequency = 7 + chargeRef.current * 7;
        const offsetX = Math.sin(shakeTime * frequency * Math.PI) * amplitude;
        const rotate = Math.sin(shakeTime * frequency * Math.PI * 0.7) * amplitude * 0.25;
        const lift = -chargeRef.current * 8;
        shakeRef.current.style.transform = `translate3d(${offsetX.toFixed(2)}px, ${lift.toFixed(2)}px, 0) rotate(${rotate.toFixed(2)}deg)`;
      }

      // Лёгкий тактильный тик раз в ~0.35с удержания.
      if (now - lastHaptic > 350) {
        lastHaptic = now;
        notifyHapticTap();
      }

      if (progress >= 1) {
        // Успех: финальный пульс — и запуск открытия.
        holdStartRef.current = null;
        cancelAnimationFrame(rafRef.current);
        sceneRef.current?.classList.remove('scene--charging');
        if (shakeRef.current) {
          shakeRef.current.style.transform = '';
        }
        completedRef.current = true;
        notifyHapticTap();
        // Заряд больше не нужен: гасим свечение/лучи/кольцо, чтобы они
        // не «зависли» на максимуме после начала открытия.
        decayCharge();
        window.setTimeout(() => {
          onOpen();
        }, appConfig.scene2.burstPulseMs);
        return;
      }

      rafRef.current = requestAnimationFrame(step);
    };

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(step);
  }, [onOpen, reducedMotion]);

  const startHold = useCallback((): void => {
    if (state !== 'idle' || completedRef.current || holdStartRef.current !== null) {
      return;
    }
    // Первый жест пользователя — точка инициализации аудио в будущем.
    playSoundCue('hold-start');
    holdStartRef.current = performance.now();
    sceneRef.current?.classList.add('scene--charging');
    animateCharge();
  }, [animateCharge, state]);

  const endHold = useCallback((): void => {
    if (holdStartRef.current === null || completedRef.current) {
      return;
    }
    sceneRef.current?.classList.remove('scene--charging');
    cancelAnimationFrame(rafRef.current);
    holdStartRef.current = null;
    animateRelease();
  }, [animateRelease]);

  // Отсутствие openAt = открытие ещё не начато; успешный onOpen (переход
  // в 'opening') фиксирует метку времени и запускает оркестровку.
  useEffect(() => {
    if (state === 'opening' && openAt === null && completedRef.current) {
      playSoundCue('flap-open');
      setOpenAt(performance.now());
    }
  }, [state, openAt]);

  useEffect(() => {
    if (openAt !== null) {
      window.setTimeout(() => playSoundCue('hearts-burst'), appConfig.scene2.burstDelayMs);
      window.setTimeout(
        () => playSoundCue('paper-unfold'),
        appConfig.scene2.letterDelayMs + appConfig.scene2.letterFlightMs * 0.4,
      );
    }
  }, [openAt]);

  // Очистка циклов при размонтировании.
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const heartInteractive = state === 'idle' && !completedRef.current;

  return (
    <>
      {/* Canvas вынесен из .scene: perspective у сцены делает её containing
          block для fixed-потомков, и координаты canvas перестают совпадать
          с вьюпортом. Отрицательный z-index — шлейф всегда позади письма. */}
      <HeartTrail targetRef={flightRef} />

      <div className="scene" data-flow-state={state} ref={sceneRef}>
        {/* Поле сердечек: взрыв, падение, куча, сенсорная физика. */}
        <HeartField burstAt={openAt} envelopeRef={envelopeRef} />

        {/* Контактная тень: живёт на «поверхности», меняется вместе с полётом. */}
        <div className="scene__shadow" aria-hidden="true" />

        {/* Письмо второй сцены: вылет, раскладка сгибов, печать текста.
            Монтируется в момент старта открытия — CSS-анимации вылета
            и раскладки сгибов отсчитываются от этого мгновения. */}
        {openAt !== null && <LetterSheet openAt={openAt} />}

        <div className="scene__flight" ref={flightRef}>
          <div className="scene__shake" ref={shakeRef}>
            <div className="scene__float">
              <div className="scene__envelope" aria-label="Конверт с письмом" ref={envelopeRef}>
                {/* Нижний лист и торец — толщина конверта. */}
                <span className="scene__env-back" aria-hidden="true" />
                <span className="scene__env-edge" aria-hidden="true" />
                {/* Внутреннее свечение: пробивается из конверта при заряде. */}
                <span className="scene__env-glow" aria-hidden="true" />
                <span className="scene__env-body">
                  <span className="scene__env-grain" aria-hidden="true" />
                  <span className="scene__env-sheen" aria-hidden="true" />
                  {/* Клапаны: боковые, нижний. */}
                  <span className="scene__env-flap-wrap scene__env-flap-wrap--left" aria-hidden="true">
                    <span className="scene__env-flap scene__env-flap--left" />
                  </span>
                  <span className="scene__env-flap-wrap scene__env-flap-wrap--right" aria-hidden="true">
                    <span className="scene__env-flap scene__env-flap--right" />
                  </span>
                  <span className="scene__env-flap-wrap scene__env-flap-wrap--bottom" aria-hidden="true">
                    <span className="scene__env-flap scene__env-flap--bottom" />
                  </span>
                </span>
                {/* Верхний клапан — вне env-body: ему нужна 3D-трансформация
                    (transform-origin по линии сгиба), а overflow:hidden
                    корпуса сплющил бы 3D-цепочку. */}
                <span className="scene__env-flap-wrap scene__env-flap-wrap--top" aria-hidden="true">
                  <span className="scene__env-flap scene__env-flap--top" />
                </span>
                {/* Лучи света из-под клапана + ореол. */}
                <span className="scene__env-rays" aria-hidden="true">
                  <span className="scene__env-ray scene__env-ray--1" />
                  <span className="scene__env-ray scene__env-ray--2" />
                  <span className="scene__env-ray scene__env-ray--3" />
                  <span className="scene__env-halo" />
                </span>
                {/* Сердце-печать на кончике верхнего клапана. */}
                <span className="scene__seal">
                  <span className="scene__seal-shadow" aria-hidden="true" />
                  <span className="scene__seal-ripple" aria-hidden="true" />
                  <button
                    type="button"
                    className="scene-heart"
                    disabled={!heartInteractive}
                    aria-label="Удерживай, чтобы открыть письмо"
                    onPointerDown={startHold}
                    onPointerUp={endHold}
                    onPointerCancel={endHold}
                    onPointerLeave={endHold}
                    onContextMenu={(event) => event.preventDefault()}
                  >
                    <span className="scene-heart__shape" aria-hidden="true" />
                    <span className="scene-heart__sheen" aria-hidden="true" />
                  </button>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
