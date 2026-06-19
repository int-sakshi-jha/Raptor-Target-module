// Minimal service worker when VITE_FIREBASE_* is not set (see client/public/firebase-messaging-sw/).
// Restart dev / rebuild after adding Firebase env vars so vite can emit the full FCM worker.
self.addEventListener("install", (e) => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(clients.claim()));
