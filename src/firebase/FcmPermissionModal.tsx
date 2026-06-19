import { useCallback, useEffect, useState, type ReactNode } from "react";
import { BellRing, AlertCircle } from "lucide-react";
import Modal from "@/components/common/Modal";
import { isFirebaseMessagingConfigured } from "@/firebase/env";
import {
  getBrowserNotificationPermission,
  registerFcmDeviceForUser,
} from "@/firebase/fcmRegistration";
import {
  consumeFcmPermissionModalRequest,
  subscribeFcmPermissionModalRequest,
} from "@/firebase/fcmPermissionModalRequest";
import { useAppSelector } from "@/store/hooks";
import {
  isAndroidMobile,
  isAppleMobileOrTablet,
  isIosWebPushBlockedByInstallRequirement,
} from "@/utils/webPushPlatform";

type ModalPhase = "prompt" | "denied" | "enabling" | "done";

function deniedInstructions(): ReactNode {
  if (isAppleMobileOrTablet()) {
    return (
      <p className="text-sm text-neutral-600 dark:text-neutral-dark-700 leading-relaxed">
        Open <strong>Settings</strong> → <strong>Notifications</strong> and allow this app. Then tap{" "}
        <strong>I enabled notifications</strong> below.
      </p>
    );
  }
  if (isAndroidMobile()) {
    return (
      <p className="text-sm text-neutral-600 dark:text-neutral-dark-700 leading-relaxed">
        In Chrome: <strong>⋮</strong> → <strong>Settings</strong> → <strong>Site settings</strong> →{" "}
        <strong>Notifications</strong> and allow this site. Then tap <strong>I enabled notifications</strong>.
      </p>
    );
  }
  return (
    <p className="text-sm text-neutral-600 dark:text-neutral-dark-700 leading-relaxed">
      Allow notifications for this site in your browser (lock icon or site settings in the address bar). Then tap{" "}
      <strong>I enabled notifications</strong>.
    </p>
  );
}

export function FcmPermissionModal() {
  const { token: authToken, user } = useAppSelector((s) => s.auth);
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<ModalPhase>("prompt");
  const [error, setError] = useState<string | null>(null);

  const tryOpenFromLoginRequest = useCallback(() => {
    if (!authToken || !user?.id) return;
    if (!isFirebaseMessagingConfigured() || isIosWebPushBlockedByInstallRequirement()) return;

    const requestedUserId = consumeFcmPermissionModalRequest();
    if (!requestedUserId || requestedUserId !== user.id) return;

    const perm = getBrowserNotificationPermission();
    setPhase(perm === "denied" ? "denied" : "prompt");
    setError(null);
    setOpen(true);
  }, [authToken, user?.id]);

  useEffect(() => {
    tryOpenFromLoginRequest();
    return subscribeFcmPermissionModalRequest(tryOpenFromLoginRequest);
  }, [tryOpenFromLoginRequest]);

  const handleClose = () => {
    setOpen(false);
    setPhase("done");
    setError(null);
  };

  const handleEnable = async () => {
    if (!user?.id) return;
    setError(null);
    setPhase("enabling");
    const result = await registerFcmDeviceForUser(user.id, { forceRegister: true });
    if (result.ok) {
      handleClose();
      return;
    }
    if (result.reason === "denied") {
      setPhase("denied");
      setError(null);
      return;
    }
    setPhase("prompt");
    setError("Could not enable notifications. Try again or check browser settings.");
  };

  const handleRecheckAfterBlocked = async () => {
    if (!user?.id) return;
    setError(null);
    setPhase("enabling");
    const result = await registerFcmDeviceForUser(user.id, { forceRegister: true });
    if (result.ok) {
      handleClose();
      return;
    }
    setPhase("denied");
    setError("Notifications are still blocked. Update browser settings, then try again.");
  };

  if (!open || phase === "done") return null;

  const isDenied = phase === "denied";
  const busy = phase === "enabling";

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isDenied ? "Notifications are blocked" : "Enable notifications?"}
      subtitle={
        isDenied
          ? "Allow this site in your browser, then confirm below"
          : "Get alerts for important updates on this device"
      }
      icon={isDenied ? AlertCircle : BellRing}
      centerModal
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {isDenied ? (
          deniedInstructions()
        ) : (
          <p className="text-sm text-neutral-600 dark:text-neutral-dark-700 leading-relaxed">
            We use browser notifications to deliver push alerts. Tap <strong>Allow notifications</strong> and choose{" "}
            <strong>Allow</strong> when your browser asks.
          </p>
        )}

        {error ? <p className="text-sm text-error-600 dark:text-error-dark-400">{error}</p> : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleClose}
            disabled={busy}
            className="inline-flex justify-center rounded-lg px-4 py-2 text-sm font-medium
              text-neutral-700 dark:text-neutral-dark-800 hover:bg-neutral-100 dark:hover:bg-neutral-dark-300
              disabled:opacity-50 transition-colors"
          >
            Not now
          </button>
          {isDenied ? (
            <button
              type="button"
              onClick={() => void handleRecheckAfterBlocked()}
              disabled={busy}
              className="inline-flex justify-center rounded-lg px-4 py-2 text-sm font-semibold
                bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600 text-white
                disabled:opacity-50 transition-colors"
            >
              {busy ? "Checking…" : "I enabled notifications"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleEnable()}
              disabled={busy}
              className="inline-flex justify-center rounded-lg px-4 py-2 text-sm font-semibold
                bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600 text-white
                disabled:opacity-50 transition-colors"
            >
              {busy ? "Enabling…" : "Allow notifications"}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
