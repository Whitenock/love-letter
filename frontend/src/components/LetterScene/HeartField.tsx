import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { appConfig } from '../../config/appConfig';

interface FieldParticle {
  x: number;
  y: number;
  /** Скорость, px/с. */
  vx: number;
  vy: number;
  /** Углы: вращение в плоскости и «кувырок» (имитация 3D-переворота). */
  rot: number;
  vr: number;
  flipPhase: number;
  flipSpeed: number;
  size: number;
  color: string;
  /** Лежит в куче внизу (исключена из активной физики до касания). */
  settled: boolean;
}

/** Контур сердца в координатах 24x24 (масштабируется через ctx). */
const HEART_PATH = new Path2D(
  'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
);

/** Палитра взрыва: розовые, красные и нежно-белые оттенки. */
const BURST_PALETTE = [
  'rgba(224, 82, 109, 0.95)',
  'rgba(242, 148, 168, 0.95)',
  'rgba(199, 67, 95, 0.92)',
  'rgba(255, 205, 214, 0.95)',
  'rgba(255, 253, 247, 0.92)',
];

/** Ширина колонны карты высот кучи (px). Шире колонна — положе куча, меньше «башен». */
const PILE_COLUMN_WIDTH = 20;

/** Максимальная «ступенька» высоты между соседними колоннами (px). */
const PILE_MAX_STEP = 15;

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

interface HeartFieldProps {
  /**
   * Метка времени старта взрыва (performance.now()) или null.
   * Изменение значения запускает выброс сердечек из конверта.
   */
  burstAt: number | null;
  /** Элемент конверта — из него берётся точка вылета (верхняя кромка). */
  envelopeRef: RefObject<HTMLDivElement | null>;
}

/**
 * Canvas-сцена второй фазы: физический взрыв сердечек из конверта,
 * падение с гравитацией и сопротивлением воздуха, накопление в куче
 * внизу экрана и сенсорное взаимодействие (палец расталкивает сердечки).
 *
 * Физика на requestAnimationFrame с delta time. Куча описывается картой
 * высот (колонны) — сердце ложится на текущую высоту кучи и слегка
 * смещается к «склону». Касание выводит сердечки из кучи обратно в полёт.
 */
export function HeartField({ burstAt, envelopeRef }: HeartFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (burstAt === null) {
      return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) {
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = window.innerWidth;
    let height = window.innerHeight;
    // Canvas лежит внутри .scene — его бокс меньше вьюпорта (шапка/футер).
    // Вся физика и касания работают в координатах бокса канваса.
    let canvasRect = { left: 0, top: 0 };
    const resize = (): void => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      canvasRect = { left: rect.left, top: rect.top };
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    const cfg = appConfig.scene2;
    const particles: FieldParticle[] = [];
    // Карта высот кучи: колонны от левого края экрана.
    let pileColumns: number[] = [];
    /** Куча менялась (ложится/убирается сердце) — нужна релаксация. */
    let pileDirty = false;

    const floorY = (): number => height - 26;

    /**
     * Релаксация карты высот: «лишняя» высота колонны перетекает к более
     * низкой соседке, пока перепады не станут меньше PILE_MAX_STEP.
     * Куча расползается в пологую горку вместо вертикальных башен.
     */
    const relaxPile = (maxColumn: number): boolean => {
      let changed = false;
      for (let pass = 0; pass < 2; pass += 1) {
        for (let i = 0; i < maxColumn; i += 1) {
          const h = pileColumns[i];
          if (h === undefined) {
            continue;
          }
          const l = i > 0 ? (pileColumns[i - 1] ?? 0) : h;
          const r = i < maxColumn - 1 ? (pileColumns[i + 1] ?? 0) : h;
          const lowerH = Math.min(l, r);
          if (h - lowerH > PILE_MAX_STEP) {
            const lower = l <= r ? i - 1 : i + 1;
            const moved = (h - lowerH - PILE_MAX_STEP) * 0.5;
            pileColumns[i] = h - moved;
            pileColumns[lower] = (pileColumns[lower] ?? 0) + moved;
            changed = true;
          }
        }
      }
      return changed;
    };

    /** Пересаживает осевшие сердца на актуальную поверхность кучи. */
    const resettleSettled = (maxColumn: number): void => {
      const floor = floorY();
      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        if (!p.settled) {
          continue;
        }
        const col = Math.max(0, Math.min(maxColumn - 1, Math.floor(p.x / PILE_COLUMN_WIDTH)));
        p.y = floor - (pileColumns[col] ?? 0) - p.size * 0.28;
      }
    };

    const spawnBurstParticle = (mouthX: number, mouthY: number): void => {
      if (particles.length >= cfg.fieldMaxParticles) {
        return;
      }
      // Конус вылета: вверх и в стороны, «из пушки» с разбросом.
      const angle = -Math.PI / 2 + randomBetween(-1.15, 1.15);
      const speed = randomBetween(340, 980);
      particles.push({
        x: mouthX + randomBetween(-10, 10),
        y: mouthY + randomBetween(-6, 6),
        vx: Math.cos(angle) * speed * randomBetween(0.55, 1.15),
        vy: Math.sin(angle) * speed,
        rot: randomBetween(-0.7, 0.7),
        vr: randomBetween(-4, 4),
        flipPhase: randomBetween(0, Math.PI * 2),
        flipSpeed: randomBetween(2.5, 7),
        size: randomBetween(7, 21),
        color: BURST_PALETTE[Math.floor(Math.random() * BURST_PALETTE.length)],
        settled: false,
      });
    };

    // --- Сенсорное взаимодействие -------------------------------------
    let pointerActive = false;
    let pointerX = 0;
    let pointerY = 0;
    let prevPointer = { x: 0, y: 0, t: 0 };
    let pointerSpeed = 0;

    /**
     * Расталкивает сердечки вокруг точки (x, y): чем быстрее движение
     * пальца, тем сильнее импульс; направление — от пальца. Осевшие
     * сердечки пробуждаются и возвращаются в полёт (их вклад вычитается
     * из карты высот кучи).
     */
    const applyTouchForce = (x: number, y: number, speed: number, maxColumn: number): void => {
      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        const dx = p.x - x;
        const dy = p.y - y;
        const dist = Math.hypot(dx, dy);
        if (dist >= cfg.touchRadius) {
          continue;
        }
        const falloff = 1 - dist / cfg.touchRadius;
        const push = Math.min(speed, cfg.touchMaxSpeed) * falloff * cfg.touchPush;
        // Направление от пальца; у самой точки пальца — вверх-вбок.
        const nx = dist > 0.5 ? dx / dist : 0.3;
        const ny = dist > 0.5 ? dy / dist : -0.95;
        if (p.settled) {
          const col = Math.max(0, Math.min(maxColumn - 1, Math.floor(p.x / PILE_COLUMN_WIDTH)));
          pileColumns[col] = Math.max(0, (pileColumns[col] ?? 0) - p.size * 0.34);
          p.settled = false;
          p.y -= 2;
          pileDirty = true;
        }
        p.vx += nx * push;
        p.vy += ny * push - push * 0.35; // лёгкая вертикальная добавка — сердечка «подпрыгивает»
        p.vr += (Math.random() - 0.5) * 6 * falloff;
      }
    };

    const onPointerDown = (event: PointerEvent): void => {
      pointerActive = true;
      pointerX = event.clientX - canvasRect.left;
      pointerY = event.clientY - canvasRect.top;
      prevPointer = { x: pointerX, y: pointerY, t: performance.now() };
      // Простое касание: сердечки под пальцем слегка отскакивают.
      const maxColumn = Math.ceil(width / PILE_COLUMN_WIDTH);
      applyTouchForce(pointerX, pointerY, cfg.touchTapImpulse, maxColumn);
    };

    const onPointerMove = (event: PointerEvent): void => {
      if (!pointerActive) {
        return; // реакция только на касание/проведение, не на hover
      }
      const now = performance.now();
      const dt = Math.max((now - prevPointer.t) / 1000, 0.001);
      const x = event.clientX - canvasRect.left;
      const y = event.clientY - canvasRect.top;
      const dx = x - prevPointer.x;
      const dy = y - prevPointer.y;
      pointerSpeed = pointerSpeed * 0.6 + (Math.hypot(dx, dy) / dt) * 0.4;
      pointerX = x;
      pointerY = y;
      prevPointer = { x, y, t: now };
    };

    const onPointerEnd = (): void => {
      pointerActive = false;
      pointerSpeed = 0;
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerEnd);
    window.addEventListener('pointercancel', onPointerEnd);

    // --- Основной цикл --------------------------------------------------
    const start = performance.now();
    let last = start;
    let raf = 0;
    let spawned = 0;
    let burstDone = false;

    const frame = (now: number): void => {
      const dt = Math.min((now - last) / 1000, 0.04);
      last = now;
      const elapsed = now - start;

      // Растянутый во времени выброс из конверта (не один кадр).
      if (!burstDone) {
        const envelope = envelopeRef.current;
        if (elapsed >= cfg.burstDelayMs && envelope) {
          const rect = envelope.getBoundingClientRect();
          // Из viewport-координат в координаты бокса канваса.
          const mouthX = rect.left + rect.width / 2 - canvasRect.left;
          const mouthY = rect.top + rect.height * 0.12 - canvasRect.top;
          // ~3-4 сердечка за кадр, пока не выбрали всю квоту или окно спавна.
          const perFrame = Math.max(2, Math.round(cfg.burstCount / (cfg.burstSpawnMs / 16.7)));
          const toSpawn = Math.min(perFrame, cfg.burstCount - spawned);
          for (let i = 0; i < toSpawn; i += 1) {
            spawnBurstParticle(mouthX, mouthY);
            spawned += 1;
          }
          if (spawned >= cfg.burstCount || elapsed > cfg.burstDelayMs + cfg.burstSpawnMs + 300) {
            burstDone = true;
          }
        }
      }

      // Палец: скорость затухает, если палец замер.
      if (pointerActive) {
        pointerSpeed *= Math.pow(0.2, dt);
      }

      const floor = floorY();
      const maxColumn = Math.ceil(width / PILE_COLUMN_WIDTH);

      // Проводим пальцем по полю: сердечки разлетаются от траектории.
      if (pointerActive && pointerSpeed > 10) {
        applyTouchForce(pointerX, pointerY, pointerSpeed, maxColumn);
      }

      // Куча менялась — расползаем пики в пологую горку и пересаживаем
      // осевшие сердца на новую поверхность.
      if (pileDirty) {
        const changed = relaxPile(maxColumn);
        resettleSettled(maxColumn);
        if (!changed) {
          pileDirty = false;
        }
      }

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.save();
      context.scale(dpr, dpr);

      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];

        if (p.settled) {
          // Лежит в куче; рисуем без физики.
          drawParticle(context, p, 1);
          continue;
        }

        // Гравитация и сопротивление воздуха (лёгкая «бумажность»).
        p.vy += 620 * dt;
        p.vx *= Math.pow(0.55, dt);
        p.vy *= Math.pow(0.72, dt);

        // Воздушные потоки: синусоидальный боковой дрейф.
        p.vx += Math.sin(p.y * 0.012 + elapsed * 0.002 + p.flipPhase) * 60 * dt;

        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        p.vr *= Math.pow(0.5, dt);
        p.flipPhase += p.flipSpeed * dt;

        // Стены экрана: мягкий отскок.
        if (p.x < p.size * 0.5) {
          p.x = p.size * 0.5;
          p.vx = Math.abs(p.vx) * 0.5;
        } else if (p.x > width - p.size * 0.5) {
          p.x = width - p.size * 0.5;
          p.vx = -Math.abs(p.vx) * 0.5;
        }

        // Контакт с кучей / полом.
        const column = Math.max(0, Math.min(maxColumn - 1, Math.floor(p.x / PILE_COLUMN_WIDTH)));
        const pileTop = floor - (pileColumns[column] ?? 0);
        if (p.y >= pileTop) {
          p.y = pileTop;
          // Наклон поверхности: >0 — ниже справа, сердце скатывается вправо.
          const leftH = pileColumns[column - 1] ?? 0;
          const rightH = pileColumns[column + 1] ?? 0;
          const slope = Math.max(-1, Math.min(1, (leftH - rightH) / PILE_COLUMN_WIDTH));
          if (Math.abs(p.vy) > 100) {
            // Отскок с потерей энергии и лёгким скольжением по склону.
            p.vy *= -randomBetween(0.2, 0.32);
            p.vx = p.vx * 0.6 + slope * randomBetween(30, 70);
            p.vr *= 0.5;
          } else if (Math.abs(p.vy) > 20 || Math.abs(p.vx) > 26) {
            // Катится по поверхности, плавно теряя скорость, —
            // вместо мгновенной заморозки на месте падения.
            p.vy = 0;
            p.vx = p.vx * Math.pow(0.25, dt) + slope * 520 * dt;
            p.vr = p.vr * Math.pow(0.2, dt) + slope * 3 * dt;
          } else {
            // Почти остановилось — ложится в кучу.
            p.settled = true;
            if (Math.random() < 0.4) {
              p.x += randomBetween(-3, 3);
            }
            const finalColumn = Math.max(0, Math.min(maxColumn - 1, Math.floor(p.x / PILE_COLUMN_WIDTH)));
            p.y = floor - (pileColumns[finalColumn] ?? 0) - p.size * 0.28;
            pileColumns[finalColumn] = (pileColumns[finalColumn] ?? 0) + p.size * 0.34;
            p.vy = 0;
            p.vx = 0;
            p.vr = 0;
            p.rot *= 0.4;
            pileDirty = true;
          }
        }

        drawParticle(context, p, 1);
      }

      context.restore();

      // Поле живёт, пока сцена смонтирована: сердечки остаются на экране
      // и доступны для касаний. Остановки цикла нет — есть лимит частиц.
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerEnd);
      window.removeEventListener('pointercancel', onPointerEnd);
      particles.length = 0;
      pileColumns = [];
    };
  }, [burstAt, envelopeRef]);

  return <canvas ref={canvasRef} className="heart-field" aria-hidden="true" />;
}

function drawParticle(
  context: CanvasRenderingContext2D,
  p: FieldParticle,
  alpha: number,
): void {
  // Кувырок: сплюснутая по вертикали проекция вращающегося сердца.
  const flip = 0.28 + 0.72 * Math.abs(Math.cos(p.flipPhase));
  context.save();
  context.translate(p.x, p.y);
  context.rotate(p.rot);
  context.scale((p.size / 24) * 1, (p.size / 24) * flip);
  context.globalAlpha = alpha;
  context.fillStyle = p.color;
  context.fill(HEART_PATH);
  context.restore();
}
