import process from 'node:process';
import { loadEnvFiles, readEnv } from './config/env.js';
import { createBot, launchBot } from './bot.js';
import { startHttpServer } from './server/httpServer.js';

async function main(): Promise<void> {
  loadEnvFiles();

  // Валидация конфигурации до любых побочных эффектов:
  // при ошибке приложение завершится с понятным сообщением.
  const env = readEnv();
  console.log('Конфигурация загружена.');
  console.log(`Mini App URL: ${env.webappUrl}`);

  const server = startHttpServer(env);
  const bot = createBot(env);
  launchBot(bot);

  const shutdown = (signal: string): void => {
    console.log(`Получен сигнал ${signal}, завершаю работу…`);
    try {
      bot.stop(signal);
    } catch (error) {
      console.warn('Бот не был запущен, пропуск остановки polling:', error);
    }
    server.close(() => process.exit(0));
    // Страховка, если соединения не закроются самостоятельно.
    setTimeout(() => process.exit(0), 2000).unref();
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error: unknown) => {
  console.error('Фатальная ошибка при запуске backend:', error);
  process.exit(1);
});
