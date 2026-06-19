/**
 * iOS Safari (16.4+) only delivers Web Push to sites installed to the Home Screen
 * (display-mode standalone). Regular Safari tabs do not receive push tokens reliably.
 */

/** Chrome / WebView on phones and tablets — used for Android-specific push UI copy. */
export function isAndroidMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

export function isAppleMobileOrTablet(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  /**
   * iPadOS 13+ with "Request Desktop Website": UA looks like Mac + Safari but has touch points.
   * Avoid deprecated `navigator.platform`; real desktop Macs typically report maxTouchPoints === 0.
   */
  const touchPoints = navigator.maxTouchPoints;
  if (typeof touchPoints !== "number" || touchPoints <= 1) return false;
  return /Macintosh|Mac OS X|Intel Mac OS X/.test(ua);
}


export function isStandaloneDisplayMode(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia("(display-mode: standalone)");
  if (mq.matches) return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}


export function shouldDeferIosWebPushToUserGesture(): boolean {
  return isAppleMobileOrTablet() && isStandaloneDisplayMode();
}

/** Web Push is not available in a normal Safari tab on iOS — user must use the installed icon. */
export function isIosWebPushBlockedByInstallRequirement(): boolean {
  return isAppleMobileOrTablet() && !isStandaloneDisplayMode();
}
