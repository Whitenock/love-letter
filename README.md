# Telegram Mini App: интерактивное романтическое письмо

Проект-фундамент для Telegram Mini App с интерактивным конвертом и письмом.
Текущий этап — **техническая база**: бот, инициализация Telegram WebApp API,
машина состояний и заглушки интерфейса. Анимации, музыка и финальный дизайн
будут добавлены на следующих этапах.

## Структура проекта

```
telegram-love-letter/
├── .env.example                  # шаблон переменных окружения (без секретов)
├── package.json                  # корневые скрипты (запуск frontend/backend)
├── backend/                      # Node.js + TypeScript + Telegraf
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts              # точка входа: HTTP-сервер + запуск бота
│       ├── bot.ts                # создание/запуск бота
│       ├── handlers/
│       │   └── commandHandlers.ts # команды /start (deep linking) и /app
│       ├── config/
│       │   └── env.ts            # загрузка .env и валидация конфигурации
│       ├── services/
│       │   └── initDataValidator.ts # HMAC-SHA256 проверка initData
│       └── server/
│           └── httpServer.ts     # /healthz и POST /api/validate-init-data
└── frontend/                     # React + TypeScript + Vite
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── index.html                # подключает официальный telegram-web-app.js
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── components/           # по папке на компонент: tsx + css
        │   ├── AppLoader/        #   экран загрузки (state: loading)
        │   ├── LetterScreen/     #   главный экран
        │   ├── Envelope/         #   заглушка конверта
        │   ├── Heart/            #   сердце с надписью «Открыть»
        │   ├── Letter/           #   письмо
        │   └── AnimationLayer/   #   зарезервированный контейнер для эффектов
        ├── hooks/
        │   ├── useTelegram.ts    #   инициализация WebApp API
        │   └── useLetterFlow.ts  #   поток loading -> idle -> opening -> opened
        ├── state/
        │   └── letterFlow.ts     # редьюсер состояний
        ├── config/appConfig.ts   # тайминги и флаги
        ├── content/letterContent.ts # ТЕКСТ ПИСЬМА (отдельно от UI)
        ├── telegram/             # типизированная обёртка Telegram WebApp API
        ├── types/                # типы TypeScript
        ├── styles/               # variables.css (токены), global.css
        └── assets/               # будущие графические ресурсы
```

## Что уже работает

- **Бот**: команда `/start` с приветствием и кнопкой открытия Mini App
  (`Markup.button.webApp`), команда `/app`, поддержка Deep Linking
  (`/start <payload>` — payload читается и логируется, точка будущей
  персонализации).
- **Mini App**: инициализация официального Telegram WebApp SDK
  (`ready()`, `expand()`, отключение вертикальных свайпов), отслеживание
  viewport (iOS меняет высоту — значение публикуется в CSS-переменную
  `--app-viewport-height`), чтение пользователя и start-параметра.
- **Режим браузера**: если Telegram API недоступен, приложение работает
  в обычном браузере с плашкой «Режим разработки» — удобно для разработки.
- **Машина состояний**: `loading` → `idle` → `opening` → `opened`.
  Нажатие на сердце переводит конверт в `opening`, затем показывается
  письмо. Переход-заглушка реализован таймером и будет заменён
  анимационной последовательностью (см. `useLetterFlow.ts`).
- **Безопасность**: серверная проверка `initData` по официальному
  алгоритму Telegram (HMAC-SHA256 + свежесть `auth_date`), endpoint
  `POST /api/validate-init-data`. Токен бота хранится только в `.env`.

## Что потребуется установить

1. **Node.js 20+** — https://nodejs.org (LTS).
2. **npm** (идёт в комплекте с Node.js).

Проверка версий:

```bash
node -v
npm -v
```

## Установка зависимостей

В корне проекта:

```bash
npm --prefix backend install
npm --prefix frontend install
```

## Настройка секретов

1. Скопируйте шаблон:

   ```bash
   copy .env.example .env    # Windows
   # cp .env.example .env    # macOS/Linux
   ```

2. Заполните `.env`:

   ```env
   BOT_TOKEN=123456789:AA...          # токен от @BotFather (ниже — как получить)
   WEBAPP_URL=https://...             # публичный HTTPS-адрес frontend
   PORT=3000                          # порт локального HTTP-сервера backend
   INIT_DATA_MAX_AGE_SEC=86400        # максимальный возраст initData
   ```

Файл `.env` в **корне репозитория** — единственное место с секретами.
Он исключён из git (см. `.gitignore`). Никогда не вставляйте токен
в исходный код и не публикуйте его в чатах.

## Как создать Telegram-бота через BotFather

1. Откройте https://t.me/BotFather.
2. Отправьте `/newbot`, задайте имя и username бота
   (username должен заканчиваться на `bot`).
3. BotFather выдаст **токен** вида `123456789:AAExample...` —
   вставьте его в `.env` как `BOT_TOKEN`.
4. Если токен скомпрометирован — `/revoke` в BotFather.

## Как привязать Mini App к боту

Frontend должен быть доступен по **публичному HTTPS**. Варианты:

### Вариант А. Быстрый старт (туннель для разработки)

1. Запустите frontend: `npm --prefix frontend run dev` (порт 5173).
2. Пробросьте HTTPS-туннель, например:

   ```bash
   npx localtunnel --port 5173
   # или cloudflared tunnel --url http://localhost:5173
   ```

3. Полученный HTTPS-адрес укажите в `.env` как `WEBAPP_URL`.

### Вариант Б. Публикация (рекомендуется)

1. Соберите frontend: `npm --prefix frontend run build`.
2. Опубликуйте папку `frontend/dist` на любом HTTPS-хостинге:
   - **Vercel / Netlify / Cloudflare Pages**: root directory — `frontend`,
     команда сборки `npm run build`, выходная папка `dist`;
   - собственный сервер: раздавайте `dist` за nginx с TLS-сертификатом
     (например, бесплатный Let's Encrypt: `certbot --nginx`).
3. Полученный адрес (например, `https://love-letter.vercel.app`)
   укажите в `.env` как `WEBAPP_URL`.

Затем привяжите адрес к боту:

1. Откройте @BotFather → ваш бот → `/setmenubutton` → выберите бота
   → отправьте текст кнопки («💌 Открыть письмо») и HTTPS-адрес Mini App.
   Альтернатива: `Bot Settings` → `Menu Button`.
2. Дополнительно: `/newapp` — позволит задать главное Mini App,
   описание и превью в профиле бота.

## Запуск для разработки

Терминал 1 — backend (бот + HTTP-сервер проверки initData):

```bash
npm --prefix backend run dev
```

Терминал 2 — frontend (Vite dev-сервер, http://localhost:5173):

```bash
npm --prefix frontend run dev
```

Проверки:

```bash
npm run typecheck          # TypeScript в frontend и backend
npm --prefix frontend run build   # production-сборка
curl http://localhost:3000/healthz # healthcheck backend
```

## Как проверить приложение на телефоне

1. Убедитесь, что `WEBAPP_URL` в `.env` — рабочий HTTPS-адрес, и backend
   запущен (`npm --prefix backend run dev`).
2. Отправьте боту `/start` в Telegram → нажмите кнопку «💌 Открыть письмо».
3. Mini App откроется внутри Telegram. Проверьте:
   - конверт с сердцем по центру, надпись «Открыть»;
   - нажатие на сердце → письмо через ~1,2 с (временная заглушка);
   - экран занимает всю высоту, интерфейс не «уезжает».
4. Тестировать стоит и на iOS, и на Android: на iOS Telegram меняет
   высоту viewport при раскрытии — приложение подстраивается через
   `viewportStableHeight`.

## Будущие точки расширения (план следующих этапов)

| Что менять | Где |
|---|---|
| Текст письма, заголовок, подпись, имя получателя, абзацы | `frontend/src/content/letterContent.ts` |
| Тайминги переходов | `frontend/src/config/appConfig.ts` |
| Анимация открытия конверта | координация в `frontend/src/hooks/useLetterFlow.ts` + CSS-классы `data-flow-state` на `.envelope`, `.screen__stage` |
| Частицы, блики, прочие эффекты | `frontend/src/components/AnimationLayer/` |
| Графика конверта | `frontend/src/assets/` + `components/Envelope/` |
| Новые команды бота | `backend/src/handlers/commandHandlers.ts` |
| Новые HTTP-эндпоинты | `backend/src/server/httpServer.ts` (handleRequest) |
| Персонализация по start-параметру | `backend` (`ctx.payload` в `/start`) и `frontend` (`environment.startParam`) |

## Безопасность — кратко

- Токен бота — только в `.env` (не в git, не в frontend).
- Данные `initDataUnsafe` в frontend — **недоверенные**, используются лишь
  для отображения имени. Любое доверенное использование — через
  серверную проверку `initData` (`POST /api/validate-init-data`),
  которая сверяет HMAC-SHA256-подпись по официальному алгоритму
  и ограничивает возраст `auth_date`.
- Тело HTTP-запросов ограничено 8 КБ, JSON строго валидируется.

## Подготовка к публикации — чек-лист

- [ ] `npm run typecheck` — без ошибок.
- [ ] `npm --prefix frontend run build` — сборка успешна.
- [ ] `WEBAPP_URL` — финальный HTTPS-адрес production-сборки.
- [ ] Backend запущен на сервере (или как сервис: `npm --prefix backend run build && npm --prefix backend run start`).
- [ ] Кнопка меню и (опционально) главное Mini App привязаны в BotFather.
- [ ] `/start` на телефоне открывает приложение, письмо открывается.
