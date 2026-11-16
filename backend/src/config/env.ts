import { config as loadDotenv } from 'dotenv';
import path from 'node:path';
import process from 'node:process';

export interface AppEnv {
  botToken: string;
  webappUrl: string;
  port: number;
  initDataMaxAgeSec: number;
}

/**
 * Загружает переменные окружения из .env-файлов.
 * Сначала пробуем каталог backend (локальные переопределения),
 * затем корень репозитория — там лежит основной .env (см. .env.example).
 * Уже установленные переменные не перезаписываются.
 */
export function loadEnvFiles(): void {
  loadDotenv();
  loadDotenv({ path: path.resolve(process.cwd(), '../.env') });
}

function readString(name: string): string | null {
  const value = process.env[name];
  return value === undefined ? null : value.trim();
}

/**
 * Читает и валидирует конфигурацию. При ошибках бросает исключение
 * с полным списком проблем — приложение не должно стартовать в
 * некорректной конфигурации.
 */
export function readEnv(): AppEnv {
  const errors: string[] = [];

  const botToken = readString('BOT_TOKEN');
  if (botToken === null) {
    errors.push('BOT_TOKEN не задан. Скопируй .env.example в .env в корне проекта и укажи токен от @BotFather.');
  } else if (!/^\d{5,}:[A-Za-z0-9_-]+$/.test(botToken)) {
    errors.push('BOT_TOKEN не похож на токен Telegram-бота (ожидается формат "123456789:AA...").');
  }

  let webappUrlValid: string | null = null;
  const webappUrl = readString('WEBAPP_URL');
  if (webappUrl === null) {
    errors.push('WEBAPP_URL не задан. Укажи публичный HTTPS-адрес Mini App.');
  } else {
    try {
      const url = new URL(webappUrl);
      if (url.protocol !== 'https:') {
        errors.push('WEBAPP_URL должен начинаться с https:// (Telegram открывает Mini App только по HTTPS).');
      } else {
        webappUrlValid = webappUrl;
      }
    } catch {
      errors.push('WEBAPP_URL — некорректный URL.');
    }
  }

  const portRaw = readString('PORT') ?? '3000';
  const port = Number.parseInt(portRaw, 10);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    errors.push('PORT должен быть целым числом от 1 до 65535.');
  }

  const maxAgeRaw = readString('INIT_DATA_MAX_AGE_SEC') ?? '86400';
  const initDataMaxAgeSec = Number.parseInt(maxAgeRaw, 10);
  if (!Number.isInteger(initDataMaxAgeSec) || initDataMaxAgeSec <= 0) {
    errors.push('INIT_DATA_MAX_AGE_SEC должен быть положительным целым числом (секунды).');
  }

  if (errors.length > 0) {
    throw new Error(`Некорректная конфигурация окружения:\n- ${errors.join('\n- ')}`);
  }

  // Значения проверены выше, ошибки собраны и выброшены.
  return {
    botToken: botToken!,
    webappUrl: webappUrlValid!,
    port,
    initDataMaxAgeSec,
  };
}
