/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  /** Base URL for the Go audit logs service (e.g. http://192.168.2.68:8080). */
  readonly VITE_LOGS_API_URL?: string;
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID?: string;
  readonly VITE_FIREBASE_VAPID_KEY?: string;
  /** When "true", show FCM token on Dashboard (for handoff to backend). Dev mode shows it without this. */
  // readonly VITE_SHOW_FCM_TOKEN_ON_DASHBOARD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
