import { useEffect } from "react";
import { onMessage, type MessagePayload } from "firebase/messaging";
import { useQueryClient } from "@tanstack/react-query";
import { isFirebaseMessagingConfigured } from "@/firebase/env";
import { FcmPermissionModal } from "@/firebase/FcmPermissionModal";
import { getFirebaseMessaging } from "@/firebase/messaging";

const DEFAULT_NOTIFICATION_ICON = "/favicon.svg";

function getForegroundNotificationContent(payload: MessagePayload): {
  title: string;
  body?: string;
  icon?: string;
  badge?: string;
  data?: Record<string, string>;
} {
  const title = payload.notification?.title ?? "Notification";
  const body = payload.notification?.body;
  const icon = payload.notification?.icon ?? DEFAULT_NOTIFICATION_ICON;
  const badge = DEFAULT_NOTIFICATION_ICON;
  const data = payload.data;
  return { title, body, icon, badge, data };
}

async function showForegroundSystemNotification(payload: MessagePayload): Promise<void> {
  if (typeof window === "undefined" || typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;

  const { title, body, icon, badge, data } = getForegroundNotificationContent(payload);

  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        body,
        icon,
        badge,
        data,
      });
      return;
    } catch {
      // Fallback below for cases where Service Worker notification fails.
    }
  }

  try {
    const n = new Notification(title, { body, icon, badge, data });
    n.onclick = () => {
      const actionUrl = data?.action_url;
      if (actionUrl) {
        window.open(actionUrl, "_blank", "noopener,noreferrer");
      } else {
        window.focus();
      }
      n.close();
    };
  } catch {
    // Ignore foreground notification errors.
  }
}

/**
 * Foreground FCM messages + post-login permission modal (token registration runs only after login).
 */
export function FcmBootstrap() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isFirebaseMessagingConfigured()) return;

    let unsubscribe: (() => void) | undefined;
    try {
      const messaging = getFirebaseMessaging();
      if (!messaging) return;

      unsubscribe = onMessage(messaging, (payload: MessagePayload) => {
        void showForegroundSystemNotification(payload);
        void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      });
    } catch (e) {
      console.warn("[FCM] Foreground messaging unavailable:", e);
    }

    return () => {
      unsubscribe?.();
    };
  }, [queryClient]);

  return <FcmPermissionModal />;
}
