import type { NotificationRow } from "@/services/operations/notificationAPI";

/** Visual bucket for the DB `type` column (alarm, alert, info, …). */
export function notificationTone(type: string): "danger" | "warning" | "info" | "neutral" {
  const t = type.toLowerCase();
  if (t === "alarm" || t === "alert") return "danger";
  if (t === "maintenance" || t === "report") return "warning";
  if (t === "announcement") return "info";
  if (t === "info") return "info";
  return "neutral";
}

export function toneClasses(tone: ReturnType<typeof notificationTone>): {
  ring: string;
  label: string;
} {
  switch (tone) {
    case "danger":
      return {
        ring: "bg-error-500 dark:bg-error-dark-500",
        label: "text-error-700 dark:text-error-dark-400",
      };
    case "warning":
      return {
        ring: "bg-amber-500 dark:bg-amber-400",
        label: "text-amber-800 dark:text-amber-300",
      };
    case "info":
      return {
        ring: "bg-brand-500 dark:bg-brand-400",
        label: "text-brand-800 dark:text-brand-300",
      };
    default:
      return {
        ring: "bg-neutral-400 dark:bg-neutral-dark-500",
        label: "text-neutral-600 dark:text-neutral-dark-600",
      };
  }
}

export function sortNotificationsNewestFirst(rows: NotificationRow[]): NotificationRow[] {
  return [...rows].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}
