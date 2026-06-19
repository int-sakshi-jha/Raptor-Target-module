import { initializeApp, type FirebaseApp, getApps } from "firebase/app";
import { getFirebaseClientConfig, isFirebaseMessagingConfigured } from "./env";

let app: FirebaseApp | null = null;

/** Singleton Firebase app for the browser (messaging, etc.). */
export function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === "undefined") return null;
  if (!isFirebaseMessagingConfigured()) return null;
  if (!app) {
    const existing = getApps()[0];
    app = existing ?? initializeApp(getFirebaseClientConfig());
  }
  return app;
}
