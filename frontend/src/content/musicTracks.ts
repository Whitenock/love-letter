/**
 * Плейлист проекта — единственное место, где перечислены композиции.
 *
 * Как добавить песню:
 *   1. Положи аудиофайл (mp3, wav, ogg, m4a…) в `frontend/public/music/`.
 *   2. Добавь запись в массив `musicTracks` ниже.
 *
 * Аудиофайлы не указываются в компонентах плеера — только здесь.
 * `artist` и `cover` необязательны: без обложки показывается заглушка
 * с сердцем, без исполнителя — только название.
 */
export interface MusicTrack {
  /** Уникальный идентификатор (участвует в анимации смены трека). */
  id: string;
  /** Название композиции. */
  title: string;
  /** Исполнитель (если есть). */
  artist?: string;
  /** Путь к файлу: то, что лежит в public/music/, адресуется как /music/… */
  src: string;
  /** Обложка — путь к изображению (public/ или импорт). */
  cover?: string;
}

export const musicTracks: MusicTrack[] = [
  {
    id: 'morgenshtern-cvetok',
    title: 'Цветок',
    artist: 'MorgenShtern',
    src: '/music/morgenshtern-cvetok.mp3',
  },

  // ── Демо-треки для проверки плеера. Можно удалить, добавив свои песни. ──
  {
    id: 'demo-night-serenade',
    title: 'Ночная серенада',
    artist: 'Демо',
    src: '/music/demo/night-serenade.wav',
  },
  {
    id: 'demo-dawn',
    title: 'Рассвет',
    artist: 'Демо',
    src: '/music/demo/dawn.wav',
  },
];
