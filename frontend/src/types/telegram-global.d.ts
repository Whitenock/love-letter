import type { TelegramWebApp } from '../telegram/webAppTypes';

/**
 * Глобальная декларация window.Telegram, создаваемая скриптом
 * telegram-web-app.js (подключается в index.html до всех остальных скриптов).
 */
declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

export {};
