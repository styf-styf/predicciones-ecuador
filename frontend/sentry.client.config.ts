// Sentry — configuración del cliente (browser)
// Obtén tu DSN en: https://sentry.io → Projects → tu proyecto → Settings → DSN
// Luego añade en .env.local: NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/yyy

import * as Sentry from "@sentry/nextjs";

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,       // 10% de navegaciones trackeadas
    replaysOnErrorSampleRate: 1, // Replay completo en errores
    replaysSessionSampleRate: 0, // Sin replays en sesiones normales (ahorra quota)
    integrations: [
      Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
    ],
  });
}
