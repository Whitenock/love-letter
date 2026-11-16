import { AppLoader } from './components/AppLoader/AppLoader';
import { LetterScreen } from './components/LetterScreen/LetterScreen';
import { InstallGuide } from './components/InstallGuide/InstallGuide';
import { useTelegram } from './hooks/useTelegram';
import { useLetterFlow } from './hooks/useLetterFlow';
import { useDisplayMode } from './hooks/useDisplayMode';
import { appConfig } from './config/appConfig';

export default function App() {
  const { isReady, environment } = useTelegram();
  const displayMode = useDisplayMode();
  const { state, openLetter } = useLetterFlow(isReady);

  if (state === 'loading') {
    return <AppLoader />;
  }

  // Письмо доступно только из «приложений»: установленное PWA (иконка
  // на рабочем столе) или Telegram Mini App. По ссылке в обычном
  // браузере показывается анимированная инструкция по установке.
  const isAppContext = displayMode === 'telegram' || displayMode === 'standalone';
  if (!isAppContext && !appConfig.debug.bypassInstallGuide) {
    return <InstallGuide />;
  }

  return (
    <LetterScreen
      state={state}
      greetingName={environment?.user?.first_name ?? null}
      isTelegram={environment?.isTelegram ?? false}
      onOpen={openLetter}
    />
  );
}
