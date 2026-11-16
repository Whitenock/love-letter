import type { LetterFlowState } from '../../state/letterFlow';
import './AnimationLayer.css';

interface AnimationLayerProps {
  state: LetterFlowState;
}

/**
 * Зарезервированный контейнер для будущих эффектов
 * (частицы, блики, всплывающие элементы и т.п.).
 * Сейчас пуст и не перехватывает события мыши.
 * data-flow-state позволит включать эффекты по состоянию потока.
 */
export function AnimationLayer({ state }: AnimationLayerProps) {
  return <div className="animation-layer" data-flow-state={state} aria-hidden="true" />;
}
