/**
 * Конфигурация Firebase (клиентская — публичная, не секрет).
 * Значения берутся из переменных окружения Vite (префикс VITE_) или
 * из этого файла. Заполните их после создания проекта на firebase.google.com.
 *
 * Пример .env (в папке frontend/):
 *   VITE_FIREBASE_API_KEY=AIza...
 *   VITE_FIREBASE_AUTH_DOMAIN=xxx.firebaseapp.com
 *   VITE_FIREBASE_PROJECT_ID=xxx
 *   VITE_FIREBASE_STORAGE_BUCKET=xxx.appspot.com
 *   VITE_FIREBASE_MESSAGING_SENDER_ID=123...
 *   VITE_FIREBASE_APP_ID=1:123:web:abc...
 */
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

function fromEnv(key: string): string {
  const value = (import.meta.env as Record<string, string | undefined>)[key];
  return typeof value === 'string' ? value : '';
}

export const firebaseConfig: FirebaseConfig = {
  apiKey: fromEnv('VITE_FIREBASE_API_KEY'),
  authDomain: fromEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: fromEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: fromEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: fromEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: fromEnv('VITE_FIREBASE_APP_ID'),
};

export function isFirebaseConfigured(): boolean {
  return (
    firebaseConfig.apiKey !== '' &&
    firebaseConfig.projectId !== '' &&
    firebaseConfig.appId !== ''
  );
}