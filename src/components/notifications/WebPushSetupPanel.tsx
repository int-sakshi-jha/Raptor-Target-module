import React, { useState } from "react";
import { Share2, Smartphone, BellRing, CheckCircle2, AlertCircle } from "lucide-react";
import { isFirebaseMessagingConfigured } from "@/firebase/env";
import { getBrowserNotificationPermission, registerFcmDeviceForUser } from "@/firebase/fcmRegistration";
import { useAppSelector } from "@/store/hooks";
import {
  isAndroidMobile,
  isAppleMobileOrTablet,
  isIosWebPushBlockedByInstallRequirement,
  isStandaloneDisplayMode,
} from "@/utils/webPushPlatform";

interface WebPushSetupPanelProps {
 
  variant?: "default" | "compact";
  className?: string;
}


const WebPushSetupPanel: React.FC<WebPushSetupPanelProps> = ({ variant = "default", className = "" }) => {
  const { token: authToken, user } = useAppSelector((s) => s.auth);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isFirebaseMessagingConfigured() || !authToken) return null;

  const pad = variant === "compact" ? "p-3.5 sm:p-4" : "p-5";
  const iosNeedsInstall = isIosWebPushBlockedByInstallRequirement();
  const iosStandalone = isAppleMobileOrTablet() && isStandaloneDisplayMode();
  const androidPhone = isAndroidMobile();
  const perm = getBrowserNotificationPermission();

  const handleEnable = async () => {
    if (!user?.id) {
      setError("You must be signed in to register this device.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const result = await registerFcmDeviceForUser(user.id);
      if (result.ok) return;
      if (result.reason === "denied") {
        setError("Notifications are still blocked. Update browser settings, then try again.");
      } else {
        setError("Could not enable push. Check permission and try again.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Push setup failed.");
    } finally {
      setBusy(false);
    }
  };

  if (iosNeedsInstall) {
    return (
      <div
        className={`rounded-xs border border-brand-200 dark:border-brand-800/60 bg-brand-50/90 dark:bg-brand-500/10 shadow-sm ${pad} ${className}`.trim()}
      >
        <div className="flex gap-3">
          <Smartphone className="w-5 h-5 text-brand-600 dark:text-brand-400 shrink-0 mt-0.5" />
          <div className="min-w-0 space-y-2">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-dark-950">
              Push on iPhone & iPad
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-dark-700 leading-relaxed">
              Apple delivers web push only after you <strong>install this app to your Home Screen</strong> and open it
              from there (requires <strong>iOS 16.4 or later</strong>).
            </p>
            <ol className="text-sm text-neutral-600 dark:text-neutral-dark-700 list-decimal pl-5 space-y-1.5">
              <li className="pl-1">
                Tap the <Share2 className="w-3.5 h-3.5 inline align-text-bottom mx-0.5" /> <strong>Share</strong> button
                in Safari.
              </li>
              <li className="pl-1">
                Choose <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>.
              </li>
              <li className="pl-1">
                Open <strong>Inverter Stick</strong> from your Home Screen icon — not from a regular Safari tab.
              </li>
              <li className="pl-1">Use <strong>Enable push notifications</strong> below once the installed app opens.</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  if (perm === "denied") {
    const deniedTitle = isAppleMobileOrTablet()
      ? "Notifications are blocked (iPhone / iPad)"
      : androidPhone
        ? "Notifications are blocked (Android)"
        : "Notifications are blocked";

    const deniedBody = isAppleMobileOrTablet() ? (
      <p className="text-sm text-neutral-600 dark:text-neutral-dark-700 mt-1 leading-relaxed">
        Open <strong>Settings</strong> → <strong>Notifications</strong> and allow this app (or <strong>Safari</strong> if
        you use it in a tab). If it still fails, clear the site under{" "}
        <strong>Settings → Safari → Advanced → Website Data</strong>, then open the installed app and try again.
      </p>
    ) : androidPhone ? (
      <p className="text-sm text-neutral-600 dark:text-neutral-dark-700 mt-1 leading-relaxed">
        In <strong>Chrome</strong>, tap <strong>⋮</strong> → <strong>Settings</strong> → <strong>Site settings</strong> →{" "}
        <strong>Notifications</strong> and allow this site. Or use <strong>Android Settings → Apps → Chrome → Notifications</strong>
        . Then tap <strong>I enabled notifications</strong> below.
      </p>
    ) : (
      <p className="text-sm text-neutral-600 dark:text-neutral-dark-700 mt-1 leading-relaxed">
        Allow notifications for this site in your browser settings (lock icon or site settings in the address bar), then
        tap <strong>I enabled notifications</strong> below.
      </p>
    );

    return (
      <div
        className={`rounded-xs border border-amber-200 dark:border-amber-800/50 bg-amber-50/90 dark:bg-amber-500/10 shadow-sm ${pad} ${className}`.trim()}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3 min-w-0">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-dark-950">{deniedTitle}</h2>
              {deniedBody}
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleEnable()}
            disabled={busy}
            className="inline-flex shrink-0 items-center justify-center rounded-xs px-3.5 py-2 text-sm font-semibold
              bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600 text-white
              disabled:opacity-50 disabled:pointer-events-none transition-colors"
          >
            {busy ? "Checking…" : "I enabled notifications"}
          </button>
        </div>
        {error ? <p className="text-sm text-error-600 dark:text-error-dark-400 mt-3">{error}</p> : null}
      </div>
    );
  }

  /** iOS PWA must tap to request permission; Android Chrome usually needs an explicit allow for web push. */
  const showManualEnableButton = perm === "default" && (iosStandalone || androidPhone);

  if (showManualEnableButton) {
    const enableTitle = iosStandalone ? "Enable push (iPhone / iPad)" : "Enable push (Android)";

    const enableDescription = iosStandalone ? (
      <p className="text-sm text-neutral-500 dark:text-neutral-dark-600 mt-0.5">
        Tap below so this <strong>Home Screen app</strong> can receive alerts when you’re not using it (iOS 16.4+).
      </p>
    ) : (
      <p className="text-sm text-neutral-500 dark:text-neutral-dark-600 mt-0.5">
        Tap below, then choose <strong>Allow</strong> when your browser asks. On Chrome you can change this later under{" "}
        <strong>⋮ → Settings → Site settings → Notifications</strong> for this site.
      </p>
    );

    return (
      <div
        className={`rounded-xs border border-neutral-200 dark:border-neutral-dark-200 bg-white dark:bg-neutral-dark-100 shadow-sm ${pad} ${className}`.trim()}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3 min-w-0">
            <BellRing className="w-5 h-5 text-brand-600 dark:text-brand-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-dark-950">{enableTitle}</h2>
              {enableDescription}
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleEnable()}
            disabled={busy}
            className="inline-flex shrink-0 items-center justify-center rounded-xs px-3.5 py-2 text-sm font-semibold
              bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600 text-white
              disabled:opacity-50 disabled:pointer-events-none transition-colors"
          >
            {busy ? "Enabling…" : "Enable push notifications"}
          </button>
        </div>
        {error ? <p className="text-sm text-error-600 dark:text-error-dark-400 mt-3">{error}</p> : null}
      </div>
    );
  }

  if (perm === "granted") {
    return (
      <div
        className={`rounded-xs border border-neutral-200/80 dark:border-neutral-dark-200 bg-neutral-50/80 dark:bg-neutral-dark-200/30 shadow-sm ${pad} ${className}`.trim()}
      >
        <div className="flex gap-3 items-start">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-dark-900">
              Browser notifications are allowed
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-dark-600 mt-0.5">
              {iosStandalone
                ? "This Home Screen app can receive push alerts when Firebase sends them."
                : androidPhone
                  ? "Chrome on this Android device can receive push alerts when Firebase sends them."
                  : "This device can receive push alerts when Firebase sends them."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default WebPushSetupPanel;
