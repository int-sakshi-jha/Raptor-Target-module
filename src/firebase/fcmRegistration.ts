import { isFirebaseMessagingConfigured } from "@/firebase/env";
import { openFcmPermissionModal } from "@/firebase/fcmPermissionModalRequest";
import { obtainFcmRegistrationToken, isFcmSupportedInBrowser } from "@/firebase/messaging";
import { registerDeviceTokenIfNeeded, resetFcmRegistrationDedupe } from "@/services/operations/fcmAPI";
import {
  isIosWebPushBlockedByInstallRequirement,
  shouldDeferIosWebPushToUserGesture,
} from "@/utils/webPushPlatform";

export type FcmRegistrationResult =
  | { ok: true }
  | { ok: false; reason: "unsupported" | "denied" | "no_token" };

export function getBrowserNotificationPermission(): NotificationPermission {
  if (typeof Notification === "undefined") return "denied";
  return Notification.permission;
}

/**
 * Re-reads permission (e.g. after user changes site settings) and requests when still "default".
 * Must run from a user gesture when permission was previously "default" or "denied".
 */
export async function refreshNotificationPermissionFromGesture(): Promise<NotificationPermission> {
  if (typeof Notification === "undefined") return "denied";

  if (Notification.permission === "granted") return "granted";

  if ("permissions" in navigator) {
    try {
      const status = await navigator.permissions.query({ name: "notifications" as PermissionName });
      if (status.state === "granted") return "granted";
    } catch {
      // Permissions API unavailable for notifications on this browser.
    }
  }

  if (Notification.permission === "default") {
    return await Notification.requestPermission();
  }

  const after = await Notification.requestPermission();
  return after === "granted" ? "granted" : Notification.permission;
}

/**
 * Called from login success handlers. Re-registers the FCM token every time (new session).
 * Shows the permission modal only when the browser has not granted notifications yet.
 */
export async function runPostLoginFcmRegistration(userId: string): Promise<void> {
  if (!userId || !isFirebaseMessagingConfigured()) return;
  if (isIosWebPushBlockedByInstallRequirement()) return;

  const supported = await isFcmSupportedInBrowser();
  if (!supported) return;

  resetFcmRegistrationDedupe();

  const permission = getBrowserNotificationPermission();

  if (permission === "granted") {
    try {
      const fcmToken = await obtainFcmRegistrationToken({ requestPermissionIfNeeded: false });
      if (fcmToken) {
        await registerDeviceTokenIfNeeded(userId, fcmToken, { force: true });
      }
    } catch (e) {
      console.warn("[FCM] Post-login token registration failed:", e);
    }
    return;
  }

  if (shouldDeferIosWebPushToUserGesture() || permission === "default" || permission === "denied") {
    openFcmPermissionModal(userId);
  }
}

export async function registerFcmDeviceForUser(
  userId: string,
  options?: { forceRegister?: boolean }
): Promise<FcmRegistrationResult> {
  if (!userId) return { ok: false, reason: "unsupported" };

  const permission = getBrowserNotificationPermission();
  if (permission === "denied") {
    const refreshed = await refreshNotificationPermissionFromGesture();
    if (refreshed !== "granted") return { ok: false, reason: "denied" };
  }

  const fcmToken = await obtainFcmRegistrationToken({
    requestPermissionIfNeeded: getBrowserNotificationPermission() !== "granted",
  });

  if (!fcmToken) {
    const finalPerm = getBrowserNotificationPermission();
    return { ok: false, reason: finalPerm === "denied" ? "denied" : "no_token" };
  }

  await registerDeviceTokenIfNeeded(userId, fcmToken, { force: options?.forceRegister });
  return { ok: true };
}
