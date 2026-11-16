import { useCallback, useEffect, useReducer } from 'react';
import { appConfig } from '../config/appConfig';
import { letterFlowReducer } from '../state/letterFlow';

export interface UseLetterFlowResult {
  state: 'loading' | 'idle' | 'opening' | 'opened';
  openLetter: () => void;
  closeLetter: () => void;
}

/**
 * Управляет потоком loading -> idle -> opening -> opened.
 *
 * Точка расширения: переход opening -> opened сейчас выполняется
 * простым таймером. В будущем на этом месте будет запуск
 * анимационной последовательности (открытие конверта, появление письма),
 * а по её завершении — dispatch({ type: 'open-complete' }).
 */
export function useLetterFlow(isAppReady: boolean): UseLetterFlowResult {
  const [state, dispatch] = useReducer(letterFlowReducer, 'loading');

  useEffect(() => {
    if (isAppReady) {
      dispatch({ type: 'app-ready' });
    }
  }, [isAppReady]);

  const openLetter = useCallback(() => {
    dispatch({ type: 'open-request' });
  }, []);

  const closeLetter = useCallback(() => {
    dispatch({ type: 'close' });
  }, []);

  // Временная заглушка перехода opening -> opened.
  useEffect(() => {
    if (state !== 'opening') {
      return;
    }
    const timer = window.setTimeout(
      () => dispatch({ type: 'open-complete' }),
      appConfig.timings.openingDurationMs,
    );
    return () => window.clearTimeout(timer);
  }, [state]);

  return { state, openLetter, closeLetter };
}
