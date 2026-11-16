/**
 * Машина состояний потока «конверт -> письмо».
 *
 * Состояния:
 * - loading — инициализация Telegram API / приложения;
 * - idle    — конверт закрыт, сердце доступно для нажатия;
 * - opening — идёт процесс открытия (сейчас — таймер-заглушка,
 *             в будущем — координация анимаций);
 * - opened  — письмо показано.
 *
 * Переходы «нелегальны» из неожиданных состояний (редьюсер их игнорирует),
 * поэтому UI не может «проскочить» шаги.
 */
export type LetterFlowState = 'loading' | 'idle' | 'opening' | 'opened';

export type LetterFlowAction =
  | { type: 'app-ready' }
  | { type: 'open-request' }
  | { type: 'open-complete' }
  | { type: 'close' };

export function letterFlowReducer(state: LetterFlowState, action: LetterFlowAction): LetterFlowState {
  switch (action.type) {
    case 'app-ready':
      return state === 'loading' ? 'idle' : state;
    case 'open-request':
      return state === 'idle' ? 'opening' : state;
    case 'open-complete':
      return state === 'opening' ? 'opened' : state;
    case 'close':
      return state === 'opened' ? 'idle' : state;
  }
  return state;
}
