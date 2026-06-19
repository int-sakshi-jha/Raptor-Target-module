/** Opens the permission modal after login when the browser has not granted notifications yet. */
let pendingModalUserId: string | null = null;

const listeners = new Set<() => void>();

export function openFcmPermissionModal(userId: string): void {
  pendingModalUserId = userId;
  listeners.forEach((fn) => fn());
}

/** Returns the user id once and clears the pending request. */
export function consumeFcmPermissionModalRequest(): string | null {
  const id = pendingModalUserId;
  pendingModalUserId = null;
  return id;
}

export function subscribeFcmPermissionModalRequest(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
