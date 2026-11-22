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
  /** Путь к файлу: то, что лежит в public/music/, адресуется как music/…
   * (префикс base добавляется автоматически, см. withBase ниже). */
  src: string;
  /** Обложка — путь к изображению (public/ или импорт). */
  cover?: string;
}

/**
 * Префикс путей к ассетам из public/.
 * BASE_URL при base: './' равен './' — путь получается относительным и
 * работает и на корневом домене (dev), и в подкаталоге GitHub Pages
 * (https://<user>.github.io/<repo>/), где абсолютный /music/… дал бы 404.
 */
const withBase = (path: string): string =>
  `${import.meta.env.BASE_URL}${path}`.replace(/\/{2,}/g, '/');

export const musicTracks: MusicTrack[] = [
  {
    id: 'morgenshtern-cvetok',
    title: 'Цветок',
    artist: 'MorgenShtern',
    src: withBase('music/morgenshtern-cvetok.mp3'),
  },
  {
    id: 'marselle-mimo',
    title: 'Mimo',
    artist: 'Marselle',
    src: withBase('music/marselle-mimo.mp3'),
  },
  {
    id: 'kanye-west-father-stretch-my-hands-pt-1',
    title: 'Father Stretch My Hands Pt. 1',
    artist: 'Kanye West',
    src: withBase('music/kanye-west-father-stretch-my-hands-pt-1.mp3'),
  },
  {
    id: 'brent-faiyaz-soon-as-i-get-home-interlude',
    title: 'Soon As I Get Home Interlude',
    artist: 'Brent Faiyaz',
    src: withBase('music/brent-faiyaz-soon-as-i-get-home-interlude.mp3'),
  },
  {
    id: 'sonder-one-night-only',
    title: 'One Night Only',
    artist: 'SONDER',
    src: withBase('music/sonder-one-night-only.mp3'),
  },
];
