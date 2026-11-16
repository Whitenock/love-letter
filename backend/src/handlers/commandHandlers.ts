import { Markup } from 'telegraf';
import type { Context, Telegraf } from 'telegraf';
import type { AppEnv } from '../config/env.js';

/**
 * Контекст обработчика /start в Telegraf расширяется CommandContextExtn:
 * у него доступен ctx.payload — текст после команды
 * (например, "love_code_123" для /start love_code_123).
 */
interface StartContext extends Context {
  payload: string;
}

/** Текст приветствия. Вынесен отдельно, чтобы легко менять формулировки. */
function buildGreeting(firstName: string | undefined): string {
  const name = firstName ? `, ${firstName}` : '';
  return [
    `Привет${name}! 💌`,
    '',
    'Здесь тебя ждёт письмо.',
    'Нажми на кнопку ниже, чтобы открыть его.',
  ].join('\n');
}

const MINI_APP_BUTTON = (env: AppEnv) =>
  Markup.inlineKeyboard([[Markup.button.webApp('💌 Открыть письмо', env.webappUrl)]]);

/**
 * Обработчик /start. Поддерживает Telegram Deep Linking:
 * payload после /start (например, персональный код из ссылки
 * https://t.me/<bot>?start=<payload>) доступен в ctx.payload.
 * В будущем здесь можно ветвить логику по start-параметру.
 */
function handleStart(env: AppEnv) {
  return async (ctx: StartContext): Promise<void> => {
    const startPayload = ctx.payload.trim();
    if (startPayload) {
      console.log(`Получен start-параметр: ${startPayload}`);
    }

    await ctx.reply(buildGreeting(ctx.from?.first_name), MINI_APP_BUTTON(env));
  };
}

/**
 * Регистрирует все команды бота. Новые команды добавляйте здесь —
 * это единственная точка регистрации хендлеров.
 */
export function registerCommandHandlers(bot: Telegraf, env: AppEnv): void {
  bot.start(handleStart(env));

  bot.command('app', async (ctx) => {
    // Дублирующая команда на случай, если пользователь уже в диалоге с ботом.
    await ctx.reply('Открыть письмо:', MINI_APP_BUTTON(env));
  });
}
