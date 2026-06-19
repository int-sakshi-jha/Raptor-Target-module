import type { ReactNode } from "react";

interface DashboardEditorSidePanelProps {
  open: boolean;
  side: "left" | "right";
  overlay: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function DashboardEditorSidePanel({
  open,
  side,
  overlay,
  onClose,
  children,
}: DashboardEditorSidePanelProps) {
  if (!open) return null;

  if (!overlay) {
    return <>{children}</>;
  }

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[210] bg-neutral-950/40 backdrop-blur-[1px]"
        onClick={onClose}
        aria-label="Close panel"
      />
      <div
        className={`fixed inset-y-0 z-[220] flex w-[min(100vw,20rem)] flex-col shadow-2xl sm:w-80 ${
          side === "left" ? "left-0 animate-in slide-in-from-left duration-200" : "right-0 animate-in slide-in-from-right duration-200"
        }`}
      >
        {children}
      </div>
    </>
  );
}
