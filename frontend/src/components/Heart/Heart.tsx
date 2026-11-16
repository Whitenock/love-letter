import { notifyHapticTap } from '../../telegram/telegramWebApp';
import './Heart.css';

interface HeartProps {
  onPress: () => void;
  disabled?: boolean;
}

/**
 * Заглушка сердца с надписью «Открыть». Настоящая анимация сердца
 * и эффекты нажатия будут добавлены на следующем этапе.
 */
export function Heart({ onPress, disabled = false }: HeartProps) {
  const handleClick = (): void => {
    if (disabled) {
      return;
    }
    notifyHapticTap();
    onPress();
  };

  return (
    <button
      type="button"
      className="heart"
      onClick={handleClick}
      disabled={disabled}
      aria-label="Открыть письмо"
    >
      <span className="heart__shape" aria-hidden="true" />
      <span className="heart__label">Открыть</span>
    </button>
  );
}
