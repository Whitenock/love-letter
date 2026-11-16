import { useEffect, useState } from 'react';
import {
  getWebApp,
  readTelegramEnvironment,
  setupViewportTracking,
} from '../telegram/telegramWebApp';
import type { TelegramEnvironment } from '../types';

export interface UseTelegramResult {
  /** true, когда окружение прочитано и приложение инициализировано. */
  isReady: boolean;
  environment: TelegramEnvironment | null;
}

/**
 * Инициализирует Telegram WebApp API один раз при монтировании.
 * В обычном браузере (API недоступен) isReady становится true,
 * а environment.isTelegram === false — приложение работает в режиме разработки.
 */
export function useTelegram(): UseTelegramResult {
  const [environment, setEnvironment] = useState<TelegramEnvironment | null>(null);

  useEffect(() => {
    setEnvironment(readTelegramEnvironment());

    const webApp = getWebApp();
    if (!webApp) {
      return;
    }
    const removeViewportTracking = setupViewportTracking(webApp);
    return removeViewportTracking;
  }, []);

  return { isReady: environment !== null, environment };
}
