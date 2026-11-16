import type { ReactElement } from 'react';
import './InstallGuide.css';

type GuidePlatform = 'ios' | 'android' | 'desktop';

function detectPlatform(): GuidePlatform {
  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIOS) {
    return 'ios';
  }
  if (/Android/i.test(ua)) {
    return 'android';
  }
  return 'desktop';
}

/** Иконки шагов — лёгкие инлайн-SVG в стиле системных подсказок. */
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
  const platform = detectPlatform();
  const steps = platform === 'android' ? androidSteps : iOSSteps;

  return (
    <main className="install-guide">
      <div className="install-guide__card">
        <header className="install-guide__header">
          <div className="install-guide__badge" aria-hidden="true">💌</div>
          <h1 className="install-guide__title">Письмо для тебя</h1>
          <p className="install-guide__subtitle">{SUBTITLES[platform]}</p>
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

        {platform === 'ios' ? (
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
