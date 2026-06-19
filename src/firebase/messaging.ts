
import { getMessaging, getToken, isSupported, type Messaging } from "firebase/messaging";
import { getFirebaseApp } from "./app";

export async function isFcmSupportedInBrowser(): Promise<boolean> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return false;
  try {
    return await isSupported();
  } catch {
    return false;
  }
}

export function getFirebaseMessaging(): Messaging | null {
  try {
    const firebaseApp = getFirebaseApp();
    if (!firebaseApp) return null;
    return getMessaging(firebaseApp);
  } catch {
    return null;
  }
}

export interface ObtainFcmTokenOptions {
  /**
   * When false and permission is still "default", returns null without prompting.
   * Use when iOS requires a direct user tap to call `Notification.requestPermission()`.
   * @default true
   */
  requestPermissionIfNeeded?: boolean;
}

/**
 * Registers the FCM service worker, requests notification permission if needed,
 * and returns the FCM registration token for the backend.
 */
export async function obtainFcmRegistrationToken(
  options: ObtainFcmTokenOptions = {}
): Promise<string | null> {
  const { requestPermissionIfNeeded = true } = options;

  const supported = await isFcmSupportedInBrowser();
  if (!supported) return null;

  const messaging = getFirebaseMessaging();
  if (!messaging) return null;

  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!vapidKey) return null;

  const swScript = `${import.meta.env.BASE_URL}firebase-messaging-sw.js`;

  let registration: ServiceWorkerRegistration | undefined;
  try {
    registration = await navigator.serviceWorker.register(swScript, {
      scope: import.meta.env.BASE_URL,
    });
    await navigator.serviceWorker.ready;
  } catch {
    return null;
  }

  if (Notification.permission === "default") {
    if (!requestPermissionIfNeeded) return null;
    const p = await Notification.requestPermission();
    if (p !== "granted") return null;
  } else if (Notification.permission !== "granted") {
    return null;
  }

  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  });
  return token || null;
}
