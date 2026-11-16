import { AppLoader } from './components/AppLoader/AppLoader';
import { LetterScreen } from './components/LetterScreen/LetterScreen';
import { useTelegram } from './hooks/useTelegram';
import { useLetterFlow } from './hooks/useLetterFlow';

export default function App() {
  const { isReady, environment } = useTelegram();
  const { state, openLetter } = useLetterFlow(isReady);

  if (state === 'loading') {
    return <AppLoader />;
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
