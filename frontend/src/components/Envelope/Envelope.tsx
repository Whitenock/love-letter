import type { LetterFlowState } from '../../state/letterFlow';
import { Heart } from '../Heart/Heart';
import './Envelope.css';

interface EnvelopeProps {
  state: LetterFlowState;
  onOpen: () => void;
}

/**
 * Заглушка конверта: CSS-формы без графики.
 * data-flow-state — хук для будущих анимаций открытия
 * (CSS-селекторы вида .envelope[data-flow-state='opening']).
 */
export function Envelope({ state, onOpen }: EnvelopeProps) {
  return (
    <div className="envelope" data-flow-state={state} aria-label="Конверт с письмом">
      <div className="envelope__body" aria-hidden="true" />
      <div className="envelope__flap" aria-hidden="true" />
      <Heart onPress={onOpen} disabled={state !== 'idle'} />
    </div>
  );
}
