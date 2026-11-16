/**
 * Типы для официального Telegram Mini Apps SDK (telegram-web-app.js).
 * Описано только подмножество API, необходимое проекту.
 * Полный справочник: https://core.telegram.org/bots/webapps
 */

export interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
  is_premium?: boolean;
  added_to_attachment_menu?: boolean;
}

export interface TelegramWebAppInitData {
  query_id?: string;
  user?: TelegramWebAppUser;
  auth_date: number;
  start_param?: string;
}

export type TelegramWebAppEventType =
  | 'viewportChanged'
  | 'themeChanged'
  | 'backButtonClicked'
  | 'mainButtonClicked';

export interface TelegramWebApp {
  /** Строка initData — единственные доверенные данные (проверяются на сервере). */
  initData: string;
  /** НЕ доверенные данные: использовать только для отображения в UI. */
  initDataUnsafe: TelegramWebAppInitData;
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: Record<string, string>;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  ready(): void;
  expand(): void;
  close(): void;
  onEvent(eventType: TelegramWebAppEventType, eventHandler: () => void): void;
  offEvent(eventType: TelegramWebAppEventType, eventHandler: () => void): void;
  setHeaderColor?(color: string): void;
  setBackgroundColor?(color: string): void;
  disableVerticalSwipes?(): void;
  HapticFeedback?: {
    impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void;
    notificationOccurred(type: 'error' | 'success' | 'warning'): void;
    selectionChanged(): void;
  };
}

/** Снимок окружения Telegram на момент инициализации приложения. */
export interface TelegramEnvironment {
  /** Запущено ли приложение внутри Telegram (а не в обычном браузере). */
  isTelegram: boolean;
  /** Пользователь Telegram (только для отображения; доверенная проверка — на сервере). */
  user: TelegramWebAppUser | null;
  /** start-параметр из ссылки вида https://t.me/<bot>?startapp=<param> или ?start=<param>. */
  startParam: string | null;
  /** Платформа Telegram-клиента: ios, android, web, ... либо browser. */
  platform: string;
}
