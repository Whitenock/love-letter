/**
 * Событийная шина звуковых эффектов (этап 2, подготовка архитектуры).
 *
 * Сейчас слушателей нет — playSoundCue безопасно ничего не делает.
 * В будущем сюда подключается аудио-модуль: сцена уже вызывает
 * playSoundCue в нужные моменты анимации, добавлять вызовы не придётся.
 *
 * Ограничения мобильных браузеров: воспроизведение разрешено только после
 * жеста пользователя. Первым жестом в сцене является удержание сердца
 * (pointerdown), поэтому аудио-контекст следует инициализировать в
 * обработчике этого жеста (см. LetterScene.tsx, начало удержания).
 */
export type SoundCue =
  /** Первый контакт пальца с сердцем — лёгкий бумажный шорох. */
  | 'hold-start'
  /** Клапан начал открываться. */
  | 'flap-open'
  /** Вылет сердечек из конверта. */
  | 'hearts-burst'
  /** Разглаживание бумаги. */
  | 'paper-unfold'
  /** Начало печати текста. */
  | 'text-scratch';

type SoundCueHandler = (cue: SoundCue) => void;

const handlers = new Set<SoundCueHandler>();

/** Подписка аудио-модуля на события сцены. Возвращает функцию отписки. */
export function onSoundCue(handler: SoundCueHandler): () => void {
  handlers.add(handler);
  return () => handlers.delete(handler);
}

/** Сцена вызывает в ключевые моменты анимации. */
export function playSoundCue(cue: SoundCue): void {
  handlers.forEach((handler) => handler(cue));
}
