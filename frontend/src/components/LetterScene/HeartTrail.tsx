import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { appConfig } from '../../config/appConfig';

interface TrailParticle {
  x: number;
  y: number;
  /** Скорость, px/с. */
  vx: number;
  vy: number;
  /** Текущий поворот и угловая скорость, рад и рад/с. */
  rot: number;
  vr: number;
  /** Размер, px. */
  size: number;
  born: number;
  life: number;
  color: string;
}

/** Классический контур сердца в координатах 24x24 (масштабируется через ctx). */
const HEART_PATH = new Path2D(
  'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
);

const PALETTE = ['rgba(230, 90, 118, 0.95)', 'rgba(242, 148, 168, 0.9)', 'rgba(199, 67, 95, 0.88)'];

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

interface HeartTrailProps {
  /** Элемент письма, за которым тянется шлейф. */
  targetRef: RefObject<HTMLDivElement | null>;
}

/**
 * Canvas-система частиц: маленькие сердечки, остающиеся позади летящего
 * письма. Работает на requestAnimationFrame, частицы хранятся в массиве
 * и удаляются по истечении времени жизни (без накопления в памяти).
 *
 * Позиция письма каждый кадр берётся из getBoundingClientRect — шлейф
 * точно следует за реальным (спроецированным перспективой) положением.
 *
 * Цикл самозавершается, когда полёт закончился и все частицы растворились;
 * эффект запускается один раз при монтировании и не зависит от внешних
 * пропсов — иначе отмена rAF заморозила бы недорасстворившийся шлейф.
 */
export function HeartTrail({ targetRef }: HeartTrailProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) {
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = (): void => {
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    const particles: TrailParticle[] = [];
    const maxParticles = appConfig.scene.trailMaxParticles;
    const flightMs = appConfig.scene.flightDurationMs;
    const start = performance.now();
    let last = start;
    let prevCenter: { x: number; y: number } | null = null;
    let velocity = { vx: 0, vy: 0 };
    let raf = 0;

    const spawn = (x: number, y: number, vx: number, vy: number, now: number): void => {
      if (particles.length >= maxParticles) {
        return;
      }
      particles.push({
        x: x + randomBetween(-34, 34),
        y: y + randomBetween(-10, 14),
        vx: vx + randomBetween(-46, 46),
        vy: vy + randomBetween(-16, 30),
        rot: randomBetween(-0.6, 0.6),
        vr: randomBetween(-1.6, 1.6),
        size: randomBetween(8, 20),
        born: now,
        life: randomBetween(1000, 2200),
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
      });
    };

    const frame = (now: number): void => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const elapsed = now - start;

      // Спавн — только пока письмо летит (позиция из реального DOM-rect).
      if (elapsed < flightMs + 200) {
        const flight = targetRef.current;
        if (flight) {
          const rect = flight.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height * 0.72;
          if (prevCenter) {
            const rawVx = (cx - prevCenter.x) / dt;
            const rawVy = (cy - prevCenter.y) / dt;
            // Сглаживание скорости: DOM-rect дрожит от кадра к кадру.
            velocity = {
              vx: velocity.vx * 0.7 + rawVx * 0.3,
              vy: velocity.vy * 0.7 + rawVy * 0.3,
            };
          }
          prevCenter = { x: cx, y: cy };

          const speed = Math.hypot(velocity.vx, velocity.vy);
          // Сердечки рождаются в «кильватере» письма: позади него по вектору
          // скорости (k секунд движения назад), а не под самой бумагой —
          // иначе canvas, лежащий ниже письма, их скрывает.
          const spawnCount = speed > 30 ? Math.min(2 + Math.floor(speed / 160), 4) : 1;
          for (let i = 0; i < spawnCount; i += 1) {
            // Широкий диапазон «отставания»: часть сердечек сразу позади
            // письма, часть — далеко в начале следа; плюс горизонтальный
            // разлёт, чтобы шлейф был воздушным, а не колонной.
            const back = randomBetween(0.05, 0.5);
            spawn(
              cx - velocity.vx * back + randomBetween(-26, 26),
              cy - velocity.vy * back + randomBetween(4, 44),
              -velocity.vx * 0.3,
              -velocity.vy * 0.3,
              now,
            );
          }
        }
      }

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.save();
      context.scale(dpr, dpr);

      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const p = particles[i];
        const age = now - p.born;
        if (age >= p.life) {
          particles.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 18 * dt; // лёгкое падение, будто сердечки парят в воздухе
        p.rot += p.vr * dt;

        const t = age / p.life;
        // Рождение: быстрый рост до полного размера; затухание: растворение.
        const grow = Math.min(1, age / 140);
        const alpha = t < 0.7 ? 1 - t * 0.45 : (1 - t) / 0.3;

        context.save();
        context.translate(p.x, p.y);
        context.rotate(p.rot);
        context.scale((p.size * grow) / 24, (p.size * grow) / 24);
        context.globalAlpha = Math.max(0, Math.min(1, alpha));
        context.fillStyle = p.color;
        context.fill(HEART_PATH);
        context.restore();
      }

      context.restore();

      const flightOver = elapsed > flightMs + 400;
      if (!flightOver || particles.length > 0) {
        raf = requestAnimationFrame(frame);
      }
    };

    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      particles.length = 0;
    };
  }, [targetRef]);

  return <canvas ref={canvasRef} className="heart-trail" aria-hidden="true" />;
}
