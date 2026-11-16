import type { ReactElement } from 'react';
import './InstallGuide.css';

type GuidePlatform = 'ios' | 'android' | 'desktop';

interface GuideContext {
  platform: GuidePlatform;
  /** Ссылку открыли во внутреннем браузере приложения (например, Telegram). */
  inApp: boolean;
}

function detectGuideContext(): GuideContext {
  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  // Заглушка window.Telegram.WebApp создаётся даже во внутреннем
  // браузере Telegram (см. telegramWebApp.ts) — надёжный признак.
  const telegramStub =
    typeof window !== 'undefined' &&
    Boolean(
      (window as unknown as { Telegram?: { WebApp?: unknown } }).Telegram?.WebApp,
    );

  if (isIOS) {
    // У Safari в UA есть токен «Safari/…»; у встроенных браузеров (WKWebView,
    // Chrome для iOS и т.п.) его нет. Telegram может добавлять свой токен.
    const isSafari =
      /Safari\/\d/.test(ua) && !/CriOS|FxiOS|EdgiOS|Telegram/i.test(ua);
    return { platform: 'ios', inApp: telegramStub || !isSafari };
  }

  if (/Android/i.test(ua)) {
    // «; wv)» — признак Android WebView (внутренние браузеры приложений).
    const isStandaloneChrome = /Chrome\/\d/.test(ua) && !/;\s*wv\)/.test(ua);
    return { platform: 'android', inApp: telegramStub || !isStandaloneChrome };
  }

  return { platform: 'desktop', inApp: telegramStub };
}

/** Иконки шагов — лёгкие инлайн-SVG в стиле системных подсказок. */
function CompassIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2.2 5-5 2.2 2.2-5z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12" />
      <path d="M8 7l4-4 4 4" />
      <path d="M5 11v9h14v-9" />
    </svg>
  );
}

function AddToHomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v10" />
      <path d="M8 9l4 4 4-4" />
      <rect x="4" y="17" width="16" height="4" rx="1" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M12 6v12" />
      <path d="M6 12h12" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="12" cy="19" r="1.7" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.5 2.6 3.8 5.7 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.7-3.8-9s1.3-6.4 3.8-9z" />
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 4v14" />
      <path d="M6 13l6 6 6-6" />
    </svg>
  );
}

interface GuideStep {
  icon: ReactElement;
  title: string;
  text: string;
}

/**
 * Шаг «перейди в нормальный браузер» — первый, когда ссылку открыли во
 * внутреннем браузере Telegram или другого приложения.
 */
const openInSafariStep: GuideStep = {
  icon: <CompassIcon />,
  title: 'Открой ссылку в Safari',
  text: 'В Telegram: «Поделиться» → «Открыть в Safari»',
};

const openInChromeStep: GuideStep = {
  icon: <GlobeIcon />,
  title: 'Открой ссылку в Chrome',
  text: 'В Telegram: меню → «Открыть в браузере»',
};

const iOSSteps: GuideStep[] = [
  {
    icon: <ShareIcon />,
    title: 'Нажми «Поделиться»',
    text: 'Квадратик со стрелкой — внизу экрана Safari',
  },
  {
    icon: <AddToHomeIcon />,
    title: 'Выбери «На экран “Домой”»',
    text: 'Прокрути открывшийся список чуть вниз',
  },
  {
    icon: <PlusIcon />,
    title: 'Нажми «Добавить»',
    text: 'Иконка с сердцем появится на рабочем столе',
  },
];

const androidSteps: GuideStep[] = [
  {
    icon: <MenuIcon />,
    title: 'Открой меню браузера',
    text: 'Три точки в правом верхнем углу',
  },
  {
    icon: <AddToHomeIcon />,
    title: 'Выбери «Установить приложение»',
    text: 'Или «Добавить на главный экран»',
  },
  {
    icon: <PlusIcon />,
    title: 'Открой письмо с иконки',
    text: 'Оно появится на рабочем столе',
  },
];

const SUBTITLES: Record<GuidePlatform, string> = {
  ios: 'Чтобы прочитать письмо, добавь его на рабочий стол — это займёт 10 секунд.',
  android: 'Чтобы прочитать письмо, установи его как приложение — это займёт 10 секунд.',
  desktop: 'Открой эту ссылку на телефоне — письмо открывается из приложения.',
};

/**
 * Экран-инструкция: показывается, когда ссылку открыли в обычном браузере.
 * Плавно и по шагам объясняет, как добавить письмо на рабочий стол.
 * Само письмо в браузере не показывается — только из установленного
 * приложения (или из Telegram Mini App).
 */
export function InstallGuide() {
  const context = detectGuideContext();
  const baseSteps = context.platform === 'android' ? androidSteps : iOSSteps;
  // Если открыли во внутреннем браузере (Telegram и т.п.) — первый шаг:
  // перейти в Safari / Chrome, иначе инструкция установки не сработает.
  const steps =
    context.inApp && context.platform !== 'desktop'
      ? [context.platform === 'ios' ? openInSafariStep : openInChromeStep, ...baseSteps]
      : baseSteps;

  return (
    <main className="install-guide">
      <div className="install-guide__card">
        <header className="install-guide__header">
          <div className="install-guide__badge" aria-hidden="true">💌</div>
          <h1 className="install-guide__title">Письмо для тебя</h1>
          <p className="install-guide__subtitle">{SUBTITLES[context.platform]}</p>
        </header>

        <ol className="install-guide__steps">
          {steps.map((step, index) => (
            <li className="install-guide__step" key={step.title}>
              <span className="install-guide__step-number" aria-hidden="true">{index + 1}</span>
              <span className="install-guide__step-icon" aria-hidden="true">{step.icon}</span>
              <span className="install-guide__step-body">
                <strong className="install-guide__step-title">{step.title}</strong>
                <span className="install-guide__step-text">{step.text}</span>
              </span>
            </li>
          ))}
        </ol>

        {context.platform === 'ios' && !context.inApp ? (
          <p className="install-guide__hint" aria-hidden="true">
            <ArrowDownIcon />
            <span>Кнопка «Поделиться» — внизу Safari</span>
          </p>
        ) : null}

        <footer className="install-guide__footer">
          <p>Готово? Открой письмо с новой иконки на рабочем столе 💌</p>
        </footer>
      </div>
    </main>
  );
}
