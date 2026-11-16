import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AppEnv } from '../config/env.js';
import { validateInitData } from '../services/initDataValidator.js';

const MAX_BODY_BYTES = 8 * 1024;

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function sendJson(res: ServerResponse, statusCode: number, body: unknown): void {
  if (res.headersSent) {
    return;
  }
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    ...CORS_HEADERS,
  });
  res.end(JSON.stringify(body));
}

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;

    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        req.destroy();
        reject(new Error('Тело запроса слишком большое.'));
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (raw === '') {
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(raw) as unknown);
      } catch {
        reject(new Error('Некорректный JSON в теле запроса.'));
      }
    });

    req.on('error', reject);
  });
}

async function handleRequest(req: IncomingMessage, res: ServerResponse, env: AppEnv): Promise<void> {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  const url = new URL(req.url ?? '/', `http://localhost:${env.port}`);

  if (req.method === 'GET' && url.pathname === '/healthz') {
    sendJson(res, 200, { status: 'ok' });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/validate-init-data') {
    const body = await readJsonBody(req);
    const initData =
      typeof body === 'object' && body !== null && typeof (body as Record<string, unknown>).initData === 'string'
        ? ((body as { initData: string }).initData)
        : null;

    if (initData === null) {
      sendJson(res, 400, { ok: false, reason: 'Ожидался JSON вида {"initData": "..."}.' });
      return;
    }

    const result = validateInitData(initData, env.botToken, env.initDataMaxAgeSec);
    if (!result.ok) {
      sendJson(res, 401, { ok: false, reason: result.reason });
      return;
    }

    sendJson(res, 200, {
      ok: true,
      user: result.data.user,
      startParam: result.data.startParam,
    });
    return;
  }

  sendJson(res, 404, { ok: false, reason: 'Не найдено.' });
}

/**
 * Минимальный HTTP-сервер без внешних зависимостей (node:http):
 * - GET  /healthz                    — проверка живости;
 * - POST /api/validate-init-data     — серверная проверка initData Mini App.
 * Расширять новыми эндпоинтами можно добавлением веток в handleRequest.
 */
export function startHttpServer(env: AppEnv): Server {
  const server = createServer((req, res) => {
    void handleRequest(req, res, env).catch((error: unknown) => {
      console.error('Ошибка обработки HTTP-запроса:', error);
      sendJson(res, 500, { ok: false, reason: 'Внутренняя ошибка сервера.' });
    });
  });

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Порт ${env.port} уже занят. Измените PORT в .env.`);
      return;
    }
    console.error('Ошибка HTTP-сервера:', error);
  });

  server.listen(env.port, () => {
    console.log(`HTTP-сервер запущен на порту ${env.port} (/healthz, /api/validate-init-data).`);
  });

  return server;
}
