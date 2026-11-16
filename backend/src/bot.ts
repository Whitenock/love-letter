import { Telegraf } from 'telegraf';
import type { AppEnv } from './config/env.js';
import { registerCommandHandlers } from './handlers/commandHandlers.js';

/**
 * Создаёт и настраивает бота. Токен передаётся снаружи (из env)
 * и нигде не логируется.
 */
export function createBot(env: AppEnv): Telegraf {
  const bot = new Telegraf(env.botToken);

  registerCommandHandlers(bot, env);

  bot.catch((error, ctx) => {
    console.error(`Ошибка при обработке обновления (${ctx.updateType}):`, error);
  });

  return bot;
}

/**
 * Запускает long polling. Ошибки (например, неверный токен) логируются,
 * HTTP-сервер проверки initData продолжает работать.
 */
export function launchBot(bot: Telegraf): void {
  bot
    .launch()
    .then(() => {
      console.log('Бот остановлен.');
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Не удалось запустить бота. Проверь BOT_TOKEN в .env. Причина: ${message}`);
    });
}
