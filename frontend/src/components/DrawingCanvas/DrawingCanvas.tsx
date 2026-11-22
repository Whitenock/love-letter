import { useEffect, useRef, useState } from 'react';
import {
  initFirebase,
  getRoomId,
  setRoomId,
  getCurrentUserId,
  subscribeToStrokes,
  sendStroke,
  clearRoom,
  type Stroke,
  type Point,
} from '../../services/firebaseDrawing.js';
import './DrawingCanvas.css';

interface DrawingCanvasProps {
  open: boolean;
  onClose: () => void;
}

const COLORS = ['#1f1f1f', '#e05a76', '#2b6cb0', '#38a169', '#d69e2e', '#805ad5'];

/**
 * Общий холст для рисования: штрихи обоих участников синхронизируются
 * через Firestore в реальном времени. Рисовать можно пальцем (touch) или мышью.
 * Координаты хранятся в нормализованном виде (0..1), чтобы холсты разных
 * размеров на разных телефонах отображали одинаковую картинку.
 */
export function DrawingCanvas({ open, onClose }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(3);
  const [roomId, setRoomIdState] = useState(getRoomId());
  const [roomInput, setRoomInput] = useState(roomId);
  const [joined, setJoined] = useState(false);

  const drawingRef = useRef(false);
  const pointsRef = useRef<Point[]>([]);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    initFirebase().then((ok) => {
      if (cancelled) return;
      if (ok) {
        setReady(true);
      } else {
        setError(
          'Firebase не настроен. Заполни VITE_FIREBASE_* в frontend/.env и пересобери.',
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !ready || !joined) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const unsubscribe = subscribeToStrokes(
      roomId,
      (stroke) => {
        if (seenIdsRef.current.has(stroke.id)) return;
        seenIdsRef.current.add(stroke.id);
        drawStroke(ctx, stroke, canvas);
      },
      (err) => setError(err.message),
    );
    unsubscribeRef.current = unsubscribe;
    return () => {
      unsubscribe();
      unsubscribeRef.current = null;
    };
  }, [open, ready, joined, roomId]);

  const handleJoin = () => {
    setRoomId(roomInput);
    setRoomIdState(roomInput.trim().toUpperCase());
    setJoined(true);
  };

  const handleClear = async () => {
    try {
      await clearRoom(roomId);
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
      seenIdsRef.current.clear();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось очистить.');
    }
  };

  const cssSize = () => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { w: rect.width, h: rect.height };
  };

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const { w, h } = cssSize();
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / w,
      y: (e.clientY - rect.top) / h,
    };
  };

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    drawingRef.current = true;
    pointsRef.current = [getPoint(e)];
    const canvas = canvasRef.current;
    canvas?.setPointerCapture(e.pointerId);
  };

  const moveDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const pt = getPoint(e);
    pointsRef.current.push(pt);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      const { w, h } = cssSize();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const prev = pointsRef.current[pointsRef.current.length - 2];
      ctx.beginPath();
      ctx.moveTo(prev.x * w, prev.y * h);
      ctx.lineTo(pt.x * w, pt.y * h);
      ctx.stroke();
    }
  };

  const endDraw = async (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const points = pointsRef.current;
    pointsRef.current = [];
    const canvas = canvasRef.current;
    canvas?.releasePointerCapture(e.pointerId);
    if (points.length < 2) return;
    try {
      await sendStroke(roomId, { points, color, width });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить штрих.');
    }
  };

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = container.getBoundingClientRect();
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [open]);

  if (!open) return null;

  return (
    <div className="drawing-overlay" role="dialog" aria-label="Общий холст для рисования">
      <div className="drawing-panel">
        <header className="drawing-panel__head">
          <h2 className="drawing-panel__title">Общий холст</h2>
          <button
            type="button"
            className="drawing-panel__close"
            onClick={onClose}
            aria-label="Закрыть холст"
          >
            ✕
          </button>
        </header>

        {!ready ? (
          <div className="drawing-panel__status">
            {error ? (
              <p className="drawing-panel__error">{error}</p>
            ) : (
              <p>Подключение к Firebase…</p>
            )}
          </div>
        ) : !joined ? (
          <div className="drawing-panel__join">
            <p className="drawing-panel__hint">
              Введите один и тот же код комнаты на обоих телефонах, чтобы рисовать вместе.
            </p>
            <input
              className="drawing-panel__input"
              type="text"
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value)}
              placeholder="Код комнаты"
              maxLength={12}
            />
            <button
              type="button"
              className="drawing-panel__btn drawing-panel__btn--primary"
              onClick={handleJoin}
              disabled={roomInput.trim() === ''}
            >
              Войти
            </button>
            <p className="drawing-panel__code">
              Текущий код: <strong>{roomId}</strong>
            </p>
          </div>
        ) : (
          <>
            <div className="drawing-panel__toolbar">
              <div className="drawing-panel__colors">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`drawing-panel__color${color === c ? ' drawing-panel__color--active' : ''}`}
                    style={{ background: c }}
                    onClick={() => setColor(c)}
                    aria-label={`Цвет ${c}`}
                  />
                ))}
              </div>
              <label className="drawing-panel__width">
                Толщина
                <input
                  type="range"
                  min={1}
                  max={12}
                  value={width}
                  onChange={(e) => setWidth(Number(e.target.value))}
                />
              </label>
              <button
                type="button"
                className="drawing-panel__btn"
                onClick={handleClear}
              >
                Очистить
              </button>
            </div>
            <div className="drawing-panel__canvas-wrap" ref={containerRef}>
              <canvas
                ref={canvasRef}
                className="drawing-panel__canvas"
                onPointerDown={startDraw}
                onPointerMove={moveDraw}
                onPointerUp={endDraw}
                onPointerCancel={endDraw}
                onPointerLeave={endDraw}
              />
            </div>
            <p className="drawing-panel__room">
              Комната: <strong>{roomId}</strong> · UID: {getCurrentUserId()?.slice(0, 6)}
            </p>
          </>
        )}
        {error ? <p className="drawing-panel__error">{error}</p> : null}
      </div>
    </div>
  );
}

function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  canvas: HTMLCanvasElement,
) {
  if (stroke.points.length < 2) return;
  const rect = canvas.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(stroke.points[0].x * w, stroke.points[0].y * h);
  for (let i = 1; i < stroke.points.length; i += 1) {
    ctx.lineTo(stroke.points[i].x * w, stroke.points[i].y * h);
  }
  ctx.stroke();
}