# Telegram Mini App: интерактивное романтическое письмо

Проект-фундамент для Telegram Mini App **и одновременно PWA** с интерактивным
конвертом и письмом.

Два способа открыть письмо:
- **PWA (основной)**: сайт на GitHub Pages — на iPhone открывается в Safari,
  добавляется на экран «Домой» и запускается как обычное приложение.
- **Telegram Mini App (бонус)**: через бота, когда сеть позволяет подключиться
  к Telegram API (см. раздел про VPN ниже).

Текущий этап — **полная интерактивная сцена**: конверт с сердцем-печатью,
открытие удержанием сердца, взрыв сердечек с физикой кучки, письмо с
печатью текста, музыкальный плеер и PWA-инсталляция на телефон.
Остались контент (настоящий текст письма, треки), звуковые эффекты сцены
и финальный дизайн.

## Быстрый старт: публикация на GitHub Pages (PWA)

Так письмо открывается на iPhone как приложение — без App Store и без VPN:

1. **Создайте аккаунт на github.com** (если его нет) — 2 минуты.
2. **Создайте Personal Access Token**:
   github.com → Settings → Developer settings → Personal access tokens →
   **Fine-grained tokens** → Generate new token:
   - Repository access: *All repositories* (или создайте репозиторий заранее и выберите его);
   - Permissions: **Contents: Read and write**, **Administration: Read and write**
     (нужно для автоматического создания репозитория и включения Pages);
   - срок действия — на ваш выбор.
3. **Заполните в корневом `.env`** три строки (см. `.env.example`):

   ```env
   GH_USERNAME=ваш_логин
   GH_TOKEN=github_pat_...
   GH_REPO_NAME=love-letter
   ```

4. **Запустите деплой** из корня проекта:

   ```bash
   npm run deploy:github
   ```

   Скрипт сам создаст репозиторий (если нет), отправит код в `main`,
   соберёт frontend и опубликует сборку в ветку `gh-pages`, включит Pages
   и напечатает адрес сайта вида:

   ```
   https://<ваш_логин>.github.io/love-letter/
   ```

5. Через 1–2 минуты сайт откроется. **Как это работает**:
   - по ссылке в браузере письмо **не показывается** — вместо него появляется
     плавная анимированная инструкция, как добавить приложение на экран
     «Домой» (сохраняем интригу 💌);
   - письмо открывается **только из установленного приложения** —
     с иконки на рабочем столе (или из Telegram Mini App);
   - **установка на iPhone**: откройте адрес в Safari → кнопка «Поделиться» →
     «На экран “Домой”» → «Добавить» — иконка с сердцем появится на рабочем
     столе, тап по ней открывает письмо на весь экран.

При повторных изменениях достаточно снова выполнить `npm run deploy:github`.

> ⚠️ Репозиторий публичный (GitHub Pages на бесплатном тарифе работает только
> для public-репозиториев). Пока в коде только текст-заглушка — это безопасно.
> Когда появится настоящий текст письма, обсудим приватный вариант доставки
> контента (например, отдача текста из backend по подписанной ссылке), чтобы
> текст не лежал в открытом репозитории.

## Подключение Telegram (Mini App) — через VPN

Ваша сеть блокирует Telegram API и туннели Cloudflare без VPN. С включённым
VPN всё работает штатно (проверено). Напоминание по настройке:

1. Токен бота уже в `.env` (`BOT_TOKEN`).
2. Когда VPN включён, `api.telegram.org` доступен — бот запускается через
   `npm --prefix backend run dev`.
3. Для Mini App внутри Telegram нужен публичный HTTPS-адрес (`WEBAPP_URL`).
   Самый простой вариант — тот же GitHub Pages: впишите адрес сайта
   (`https://<логин>.github.io/love-letter/`) в `WEBAPP_URL` и привяжите
   кнопку в @BotFather (см. раздел «Как привязать Mini App к боту»).

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
    ├── index.html                # telegram-web-app.js, манифест PWA, мета iOS
    ├── public/                   # иконки, manifest.json, music/ (треки плеера)
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── components/           # по папке на компонент: tsx + css
        │   ├── AppLoader/        #   экран загрузки (state: loading)
        │   ├── InstallGuide/     #   инструкция установки (письмо только
        │   │                     #   из установленного приложения)
        │   ├── LetterScreen/     #   главный экран (шапка + сцена + футер)
        │   ├── LetterScene/      #   вся анимационная сцена:
        │   │   ├── LetterScene.tsx  # оркестратор (фазы отсчитываются от openAt)
        │   │   ├── LetterSheet.tsx  # письмо: вылет, разглаживание, печать
        │   │   ├── HeartTrail.tsx   # шлейф сердечек за летящим конвертом
        │   │   └── HeartField.tsx   # взрыв сердечек и куча (canvas-физика)
        │   ├── MusicPlayer/      #   капсула-плеер (стиль Dynamic Island)
        │   └── AnimationLayer/   #   зарезервированный контейнер для эффектов
        ├── hooks/
        │   ├── useTelegram.ts    #   инициализация WebApp API
        │   ├── useDisplayMode.ts #   высота viewport -> --app-viewport-height
        │   ├── useLetterFlow.ts  #   поток loading -> idle -> opening -> opened
        │   └── useMusicPlayer.ts #   мост React <-> сервис плеера
        ├── services/
        │   ├── musicPlayer.ts    #   единый Audio-экземпляр, Media Session,
        │   │                     #   громкость/mute сохраняются в localStorage
        │   └── soundCues.ts      #   шина звуковых событий сцены (аудио-модуль
        │                         #   подключается позже, вызовы уже на месте)
        ├── state/
        │   └── letterFlow.ts     # редьюсер состояний
        ├── config/appConfig.ts   # тайминги и флаги (сцена, взрыв, печать)
        ├── content/
        │   ├── letterContent.ts  # ТЕКСТ ПИСЬМА (отдельно от UI)
        │   └── musicTracks.ts    # ПЛЕЙЛИСТ (файлы лежат в public/music/)
        ├── telegram/             # типизированная обёртка Telegram WebApp API
        ├── types/                # типы TypeScript
        ├── styles/               # variables.css (токены), global.css
        └── assets/               # будущие графические ресурсы
```

## Что уже работает

- **Сцена открытия (сцена 2)**: объёмный конверт вылетает из глубины со
  шлейфом сердечек (canvas) и останавливается в центре. Сердце-печата
  бьётся; удержание накапливает заряд — свечение, тряска, тактильные
  тики. Успешное удержание (1,8 с) откидывает клапан, запускает взрыв
  сердечек и вылет письма с разглаживанием сгибов и печатью текста.
- **Физика кучки сердец**: сердечки падают с гравитацией и лёгким
  сопротивлением воздуха и ложатся в кучу. Куча — карта высот с
  релаксацией (ступеньки больше 15 px перетекают к более низкой
  соседке), поэтому получается пологая горка, а не вертикальные
  «башни»; ударяющиеся сердца отскакивают, катятся по склону и
  оседают без резких прыжков. Касание после открытия расталкивает
  сердечки обратно в полёт.
- **Музыкальный плеер**: капсула в стиле Dynamic Island в правом верхнем
  углу + раскрывающаяся панель со списком треков, перемоткой, громкостью
  и mute (сохраняются в localStorage). Один Audio-экземпляр живёт в
  сервисе `musicPlayer.ts`, поэтому смены состояний сцены не прерывают
  воспроизведение; системный Media Session (замок экрана, наушники)
  поддерживается. Плейлист задаётся в `content/musicTracks.ts`, файлы —
  в `frontend/public/music/`. Музыка стартует только по явному жесту
  пользователя (ограничения мобильных браузеров).
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
  Сцена-оркестратор отсчитывает фазы анимации от момента
  `dispatch('open-request')`; все тайминги — в `appConfig.ts`.
- **Безопасность**: серверная проверка `initData` по официальному
  алгоритму Telegram (HMAC-SHA256 + свежесть `auth_date`), endpoint
  `POST /api/validate-init-data`. Токен бота хранится только в `.env`.

## Что потребуется установить

1. **Node.js 20+** — https://nodejs.org (LTS).
2. **npm** (идёт в комплекте с Node.js).
3. **git** — для деплоя на GitHub Pages (в Windows достаточно Git for Windows).

Проверка версий:

```bash
node -v
npm -v
git --version
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
   - конверт с бьющимся сердцем-печатью по центру;
   - удержание сердца ~2 с → клапан откидывается, сердечки вырываются
     из конверта и складываются в кучу внизу, письмо вылетает,
     разглаживается и печатает текст;
   - сердечки в куче не встают вертикальными башнями; касание
     расталкивает их;
   - плеер в углу: треугольник запускает трек, тап по капсуле
     раскрывает список, свайп-громкость и mute сохраняются между
     сессиями.
4. Тестировать стоит и на iOS, и на Android: на iOS Telegram меняет
   высоту viewport при раскрытии — приложение подстраивается через
   `viewportStableHeight`.

## Будущие точки расширения (план следующих этапов)

| Что менять | Где |
|---|---|
| Текст письма, заголовок, подпись, имя получателя, абзацы | `frontend/src/content/letterContent.ts` |
| Плейлист: добавить/убрать треки | `frontend/src/content/musicTracks.ts` + файлы в `frontend/public/music/` |
| Тайминги сцены (полёт, удержание, взрыв, печать) | `frontend/src/config/appConfig.ts` |
| Хореография сцены (фазы открытия) | `frontend/src/components/LetterScene/LetterScene.tsx` |
| Физика сердечек (гравитация, куча, касания) | `frontend/src/components/LetterScene/HeartField.tsx` |
| Внешний вид письма и печати текста | `frontend/src/components/LetterScene/LetterSheet.tsx` + `LetterScene.css` |
| Звуковые эффекты сцены | подписка `onSoundCue` в новом аудио-модуле; события уже идут из `LetterScene.tsx`, типы — `frontend/src/services/soundCues.ts` |
| Плеер (внешний вид, управление) | `frontend/src/components/MusicPlayer/` + `services/musicPlayer.ts` |
| Частицы, блики, прочие эффекты | `frontend/src/components/AnimationLayer/` |
| Графика конверта | `frontend/src/assets/` + `components/LetterScene/LetterScene.css` |
| Новые команды бота | `backend/src/handlers/commandHandlers.ts` |
| Новые HTTP-эндпоинты | `backend/src/server/httpServer.ts` (handleRequest) |
| Персонализация по start-параметру | `backend` (`ctx.payload` в `/start`) и `frontend` (`environment.startParam`) |
| Иконки и манифест PWA | `frontend/public/`, генератор — `scripts/make-icons.ps1` |
| Деплой на GitHub Pages | `npm run deploy:github` (`scripts/deploy-github-pages.mjs`) |

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
