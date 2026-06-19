import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Bell } from "lucide-react";
import WebPushSetupPanel from "@/components/notifications/WebPushSetupPanel";
import PlantPushNotificationPreferences from "@/components/notifications/PlantPushNotificationPreferences";

interface NotificationsTabProps {
    context: "me" | "user";
}

const NotificationsTab: React.FC<NotificationsTabProps> = ({ context }) => {
    const pushEnabled = typeof Notification !== "undefined" && Notification.permission === "granted";
    const showPlantPreferences = context === "user" || pushEnabled;

    return (
        <div className="mx-auto flex max-w-3xl flex-col gap-4 px-3 py-4 sm:px-4">
            <div className="rounded-xs border border-neutral-200/80 bg-white/95 p-4 shadow-sm dark:border-neutral-dark-200 dark:bg-neutral-dark-100">
                <h1 className="flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-neutral-dark-950">
                    <Bell className="h-5 w-5 text-brand-500" />
                    Notifications
                </h1>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-dark-600">
                    Control how and when you receive notifications.
                </p>
            </div>

            {context === "me" ? (
                <Link
                    to="/notifications"
                    className="group flex items-center justify-between gap-4 rounded-xs border border-neutral-200 bg-white px-4 py-3.5 shadow-sm transition-colors hover:border-brand-300 hover:bg-brand-500/[0.03] dark:border-neutral-dark-200 dark:bg-neutral-dark-100 dark:hover:border-brand-600/50 dark:hover:bg-brand-400/[0.04]"
                >
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-dark-950">
                            Your notification inbox
                        </p>
                        <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-dark-600">
                            View alerts, mark items as read, and clear your queue.
                        </p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-brand-600 dark:text-brand-400">
                        Open
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                </Link>
            ) : (
                <div className="rounded-xs border border-neutral-200 bg-neutral-50/80 px-4 py-3.5 text-sm text-neutral-600 shadow-sm dark:border-neutral-dark-200 dark:bg-neutral-dark-200/30 dark:text-neutral-dark-600">
                    Manage this user's notification preferences below. Your own inbox is under{" "}
                    <Link to="/notifications" className="font-medium text-brand-600 dark:text-brand-400 hover:underline">
                        Notifications
                    </Link>{" "}
                    in the header.
                </div>
            )}

            <div className="space-y-3">
                {context === "me" ? (
                    <div className="space-y-2">
                        <div>
                            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-dark-950">
                                Push notifications
                            </p>
                            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-dark-600">
                                Enable browser push first, then manage plant-wise push delivery below.
                            </p>
                        </div>
                        <WebPushSetupPanel variant="compact" />
                    </div>
                ) : null}

                {showPlantPreferences ? (
                    <div className="space-y-2">
                        <div>
                            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-dark-950">
                                Push by plant
                            </p>
                            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-dark-600">
                                Enable or disable push notifications for specific plants.
                            </p>
                        </div>
                        <PlantPushNotificationPreferences context={context} />
                    </div>
                ) : (
                    <div className="rounded-xs border border-dashed border-neutral-200 bg-neutral-50/70 px-4 py-4 text-sm text-neutral-600 dark:border-neutral-dark-300 dark:bg-neutral-dark-200/20 dark:text-neutral-dark-600">
                        Enable push notifications first to manage plant-wise push preferences.
                    </div>
                )}
                {context === "me" && !pushEnabled ? (
                    <div className="rounded-xs border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-xs text-amber-800 dark:border-amber-800/40 dark:bg-amber-500/10 dark:text-amber-200">
                        Plant-level push settings are available after browser push permission is enabled for this device.
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default NotificationsTab;
