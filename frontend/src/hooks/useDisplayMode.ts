import { useEffect, useState } from 'react';
import { getWebApp, isRealTelegramContext } from '../telegram/telegramWebApp';

export type DisplayMode = 'telegram' | 'standalone' | 'browser';

/**
 * Определяет контекст запуска:
 * - telegram   — Mini App внутри Telegram (WebApp API доступен);
 * - standalone — запущено как установленное приложение (иконка на
 *                рабочем столе; для iOS дополнительно проверяется
 *                проприетарный navigator.standalone);
 * - browser    — открыто как обычная ссылка в браузере.
 */
function detectDisplayMode(): DisplayMode {
  if (isRealTelegramContext(getWebApp())) {
    return 'telegram';
  }
  const matchMediaStandalone =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches;
  const iOSStandalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return matchMediaStandalone || iOSStandalone ? 'standalone' : 'browser';
}

export function useDisplayMode(): DisplayMode {
  const [mode, setMode] = useState<DisplayMode>(detectDisplayMode);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return;
    }
    const query = window.matchMedia('(display-mode: standalone)');
    const handler = (): void => setMode(detectDisplayMode());
    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', handler);
      return () => query.removeEventListener('change', handler);
    }
    return undefined;
  }, []);

  return mode;
}
