import './AppLoader.css';

/**
 * Экран загрузки: показывается в состоянии loading,
 * пока инициализируется Telegram WebApp API.
 */
export function AppLoader() {
  return (
    <div className="app-loader" role="status" aria-live="polite">
      <span className="app-loader__spinner" aria-hidden="true" />
      <p className="app-loader__text">Загрузка…</p>
    </div>
  );
}
