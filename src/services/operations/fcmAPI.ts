import { isAxiosError } from "axios";
import { api } from "../api";
import { notificationEndpoints } from "../endpoints";

/** Same user + same token in flight → single HTTP request. */
const inflight = new Map<string, Promise<void>>();
/** Same user + same token already handled in this JS runtime (no browser storage). */
const handledInRuntime = new Set<string>();

/** Call on each login so the device token is POSTed again for the new session. */
export function resetFcmRegistrationDedupe(): void {
  handledInRuntime.clear();
}

function dedupeKey(userId: string, fcmToken: string): string {
  return `${userId}::${fcmToken}`;
}

/**
 * POSTs the FCM token to the API.
 * Failures are logged but do not break the app — Firebase push in the browser is independent.
 */
export async function registerDeviceTokenIfNeeded(
  userId: string,
  fcmToken: string,
  options?: { force?: boolean }
): Promise<void> {
  if (!userId || !fcmToken) return;

  const key = dedupeKey(userId, fcmToken);
  if (!options?.force && handledInRuntime.has(key)) return;

  const existing = inflight.get(key);
  if (existing) {
    await existing;
    return;
  }

  const p = Promise.resolve().then(async () => {
    try {
      if (handledInRuntime.has(key)) return;

      try {
        await api.post(notificationEndpoints.REGISTER_DEVICE_TOKEN, {
          fcm_device_token: fcmToken,
        });
        handledInRuntime.add(key);
      } catch (e) {
        const status = isAxiosError(e) ? e.response?.status : undefined;
        if (status === 409) {

          handledInRuntime.add(key);
          return;
        }
        console.warn(
          "[FCM] Device token was not saved to your API (Firebase push can still work in this browser).",
          status != null ? `HTTP ${status}` : e
        );
      }
    } finally {
      inflight.delete(key);
    }
  });

  inflight.set(key, p);
  await p;
}
