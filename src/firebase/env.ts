/** True when all values required for FCM web push are present. */
export function isFirebaseMessagingConfigured(): boolean {
  const e = import.meta.env;
  return Boolean(
    e.VITE_FIREBASE_API_KEY &&
      e.VITE_FIREBASE_AUTH_DOMAIN &&
      e.VITE_FIREBASE_PROJECT_ID &&
      e.VITE_FIREBASE_STORAGE_BUCKET &&
      e.VITE_FIREBASE_MESSAGING_SENDER_ID &&
      e.VITE_FIREBASE_APP_ID &&
      e.VITE_FIREBASE_VAPID_KEY
  );
}

/** Call only when `isFirebaseMessagingConfigured()` is true. */
export function getFirebaseClientConfig(): Record<string, string> {
  const e = import.meta.env;
  if (!isFirebaseMessagingConfigured()) {
    throw new Error("getFirebaseClientConfig: Firebase env is incomplete");
  }
  const cfg: Record<string, string> = {
    apiKey: e.VITE_FIREBASE_API_KEY!,
    authDomain: e.VITE_FIREBASE_AUTH_DOMAIN!,
    projectId: e.VITE_FIREBASE_PROJECT_ID!,
    storageBucket: e.VITE_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: e.VITE_FIREBASE_MESSAGING_SENDER_ID!,
    appId: e.VITE_FIREBASE_APP_ID!,
  };
  if (e.VITE_FIREBASE_MEASUREMENT_ID) {
    cfg.measurementId = e.VITE_FIREBASE_MEASUREMENT_ID;
  }
  return cfg;
}
