import type { TelegramEnvironment, TelegramWebApp } from './webAppTypes';

/** Возвращает экземпляр Telegram WebApp API или null в обычном браузере. */
export function getWebApp(): TelegramWebApp | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.Telegram?.WebApp ?? null;
}

/**
 * Считывает окружение и инициализирует Telegram WebApp API.
 *
 * ВАЖНО: данные из initDataUnsafe НЕ являются доверенными.
 * Они подходят только для отображения в интерфейсе (имя, аватар).
 * Любое доверенное использование — только через серверную проверку
 * строки initData (backend/src/services/initDataValidator.ts).
 *
 * Если API недоступен (обычный браузер), возвращает isTelegram: false —
 * приложение продолжает работать в режиме разработки.
 */
/**
 * Настоящий контекст Mini App: скрипт telegram-web-app.js создаёт заглушку
 * window.Telegram.WebApp и в обычном браузере (platform: 'unknown',
 * пустой initData) — например, во встроенном браузере Telegram Desktop
 * при открытии обычной ссылки. Поэтому Telegram определяем по конкретному
 * значению platform, а не по наличию объекта WebApp.
 */
export function isRealTelegramContext(webApp: TelegramWebApp | null): boolean {
  return (
    webApp !== null && webApp.platform !== 'unknown' && webApp.platform !== ''
  );
}

export function readTelegramEnvironment(): TelegramEnvironment {
  const webApp = getWebApp();

  if (webApp === null || !isRealTelegramContext(webApp)) {
    return { isTelegram: false, user: null, startParam: null, platform: 'browser' };
  }

  try {
    // Обязательные вызовы: сообщаем Telegram, что приложение загрузилось,
    // и раскрываем его на всю доступную высоту (важно для iOS и Android).
    webApp.ready();
    webApp.expand();
    // Отключаем свайп-закрытие, конфликтующее с вертикальными жестами в UI.
    if (webApp.disableVerticalSwipes) {
      webApp.disableVerticalSwipes();
    }
  } catch (error) {
    console.warn('Telegram WebApp API: ошибка при инициализации', error);
  }

  return {
    isTelegram: true,
    user: webApp.initDataUnsafe?.user ?? null,
    startParam: webApp.initDataUnsafe?.start_param ?? null,
    platform: webApp.platform || 'unknown',
  };
}

/**
 * Следит за высотой viewport Telegram (она меняется при раскрытии Mini App,
 * особенно на iOS) и публикует её в CSS-переменную --app-viewport-height.
 * Возвращает функцию снятия обработчиков.
 */
export function setupViewportTracking(webApp: TelegramWebApp): () => void {
  const applyHeight = (): void => {
    // viewportStableHeight надёжнее для фиксирования нижней границы интерфейса.
    const stable = webApp.viewportStableHeight;
    const height =
      typeof stable === 'number' && stable > 0 ? stable : webApp.viewportHeight;
    if (typeof height === 'number' && height > 0) {
      document.documentElement.style.setProperty('--app-viewport-height', `${height}px`);
    }
  };

  applyHeight();

  const handler = (): void => applyHeight();
  webApp.onEvent('viewportChanged', handler);

  return () => webApp.offEvent('viewportChanged', handler);
}

/** Лёгкая тактильная отдача при нажатии (не критична, если недоступна). */
export function notifyHapticTap(): void {
  try {
    getWebApp()?.HapticFeedback?.impactOccurred('medium');
  } catch (error) {
    console.warn('HapticFeedback недоступен', error);
  }
}
