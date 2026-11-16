import { createHmac, timingSafeEqual } from 'node:crypto';

/** Данные пользователя Telegram (подмножество полей, нужных проекту). */
export interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
  is_premium?: boolean;
}

/** Результат успешной валидации initData. */
export interface ValidatedInitData {
  user: TelegramWebAppUser | null;
  authDate: number;
  startParam: string | null;
}

export type InitDataValidationResult =
  | { ok: true; data: ValidatedInitData }
  | { ok: false; reason: string };

/**
 * Проверяет подлинность initData по официальному алгоритму Telegram:
 *
 *   data_check_string = отсортированные пары key=value (кроме hash/signature), через \n
 *   secret_key        = HMAC_SHA256(key: bot_token, data: "WebAppData")
 *   computed_hash     = HMAC_SHA256(key: secret_key, data: data_check_string)
 *   валидно, если computed_hash == hash
 *
 * Дополнительно проверяется свежесть auth_date (защита от replay-атак)
 * и форма объекта user.
 *
 * Источник: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateInitData(
  rawInitData: string,
  botToken: string,
  maxAgeSec: number,
  nowMs: number = Date.now(),
): InitDataValidationResult {
  if (rawInitData.length === 0) {
    return { ok: false, reason: 'initData пуст.' };
  }

  const params = new URLSearchParams(rawInitData);

  const hash = params.get('hash');
  if (hash === null || !/^[0-9a-f]{64}$/i.test(hash)) {
    return { ok: false, reason: 'Отсутствует или некорректен параметр hash.' };
  }
  params.delete('hash');
  params.delete('signature');

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = createHmac('sha256', botToken).update('WebAppData').digest();
  const computedHex = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  // Сравнение в постоянном времени, чтобы не раскрывать совпадение по префиксу.
  const computedBuf = Buffer.from(computedHex, 'utf8');
  const hashBuf = Buffer.from(hash, 'utf8');
  if (computedBuf.length !== hashBuf.length || !timingSafeEqual(computedBuf, hashBuf)) {
    return { ok: false, reason: 'Подпись initData недействительна.' };
  }

  const authDateRaw = params.get('auth_date');
  const authDate = authDateRaw === null ? Number.NaN : Number.parseInt(authDateRaw, 10);
  if (!Number.isInteger(authDate) || authDate <= 0) {
    return { ok: false, reason: 'Отсутствует или некорректен параметр auth_date.' };
  }

  const ageSec = Math.floor(nowMs / 1000) - authDate;
  if (ageSec > maxAgeSec) {
    return { ok: false, reason: 'initData устарел (превышен лимит auth_date).' };
  }

  let user: TelegramWebAppUser | null;
  try {
    user = parseUser(params.get('user'));
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : 'Некорректный параметр user.' };
  }

  const startParam = params.get('start_param');

  return { ok: true, data: { user, authDate, startParam } };
}

function parseUser(raw: string | null): TelegramWebAppUser | null {
  if (raw === null || raw === '') {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Параметр user не является корректным JSON.');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Параметр user должен быть объектом.');
  }

  const obj = parsed as Record<string, unknown>;
  if (typeof obj.id !== 'number' || !Number.isInteger(obj.id) || obj.id <= 0) {
    throw new Error('В параметре user отсутствует корректный id.');
  }
  if (typeof obj.first_name !== 'string' || obj.first_name.length === 0) {
    throw new Error('В параметре user отсутствует first_name.');
  }

  const user: TelegramWebAppUser = {
    id: obj.id,
    first_name: obj.first_name,
  };

  if (typeof obj.last_name === 'string') user.last_name = obj.last_name;
  if (typeof obj.username === 'string') user.username = obj.username;
  if (typeof obj.language_code === 'string') user.language_code = obj.language_code;
  if (typeof obj.photo_url === 'string') user.photo_url = obj.photo_url;
  if (typeof obj.is_premium === 'boolean') user.is_premium = obj.is_premium;

  return user;
}
