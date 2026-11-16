/**
 * Подписка React-компонентов на единый музыкальный плеер.
 * Сам сервис (services/musicPlayer.ts) не знает о React — здесь только мост.
 */
import { useSyncExternalStore } from 'react';
import { musicPlayer, type MusicPlayerState } from '../services/musicPlayer';

export function useMusicPlayer(): MusicPlayerState {
  return useSyncExternalStore(musicPlayer.subscribe, musicPlayer.getState);
}

export { musicPlayer };
