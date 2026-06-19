import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Keyboard } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setTheme } from "@/store/authSlice";

type ThemeMode = "light" | "dark" | "system";

type Shortcut = {
  id: string;
  title: string;
  keys: string;
  description: string;
};

const isEditableTarget = (target: EventTarget | null) => {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if (el.isContentEditable) return true;
  return false;
};

const KeyboardShortcuts: React.FC = () => {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.auth.theme);

  const [open, setOpen] = useState(false);
  const [awaitingThemeKey, setAwaitingThemeKey] = useState(false);
  const chordTimerRef = useRef<number | null>(null);

  const shortcuts: Shortcut[] = useMemo(
    () => [
      {
        id: "theme-chord",
        title: "Theme",
        keys: "Ctrl/Cmd + K, then L / D / S",
        description: "Switch theme to Light / Dark / System",
      },
      {
        id: "shortcuts-modal",
        title: "Shortcuts",
        keys: "Ctrl/Cmd + /",
        description: "Show keyboard shortcuts",
      },
    ],
    [],
  );

  const clearChordTimer = useCallback(() => {
    if (chordTimerRef.current != null) {
      window.clearTimeout(chordTimerRef.current);
      chordTimerRef.current = null;
    }
  }, []);

  const startThemeChord = useCallback(() => {
    clearChordTimer();
    setAwaitingThemeKey(true);
    chordTimerRef.current = window.setTimeout(() => {
      setAwaitingThemeKey(false);
      chordTimerRef.current = null;
    }, 2000);
  }, [clearChordTimer]);

  const applyTheme = useCallback(
    (mode: ThemeMode) => {
      dispatch(setTheme(mode));
    },
    [dispatch],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;

      const key = e.key.toLowerCase();
      const ctrlOrCmd = e.ctrlKey || e.metaKey;

      // Open modal
      if (ctrlOrCmd && key === "/") {
        e.preventDefault();
        setOpen(true);
        setAwaitingThemeKey(false);
        clearChordTimer();
        return;
      }

      // Close modal
      if (open && key === "escape") {
        e.preventDefault();
        setOpen(false);
        setAwaitingThemeKey(false);
        clearChordTimer();
        return;
      }

      // Start theme chord → Ctrl/Cmd + K
      if (!awaitingThemeKey) {
        if (ctrlOrCmd && key === "k") {
          e.preventDefault();
          startThemeChord();
        }
        return;
      }

      // Second key handling
      if (key === "l") {
        e.preventDefault();
        applyTheme("light");
      } else if (key === "d") {
        e.preventDefault();
        applyTheme("dark");
      } else if (key === "s") {
        e.preventDefault();
        applyTheme("system");
      }

      setAwaitingThemeKey(false);
      clearChordTimer();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      clearChordTimer();
    };
  }, [applyTheme, awaitingThemeKey, clearChordTimer, open, startThemeChord]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/20 dark:bg-black/60 backdrop-blur-[6px]"
      onClick={() => setOpen(false)}
      aria-hidden
    >
      <div
        className="w-full max-w-2xl overflow-hidden card border border-neutral-200 dark:border-neutral-dark-200 bg-white/95 dark:bg-neutral-dark-100/95"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Keyboard shortcuts"
      >
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-neutral-200 dark:border-neutral-dark-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xs bg-brand-50 dark:bg-brand-600/10">
              <Keyboard className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Keyboard shortcuts</h2>
              <p className="text-xs mt-1">
                Theme: <span className="font-medium">{theme}</span>
                {awaitingThemeKey && (
                  <span className="ml-2 font-medium text-brand-600">
                    Waiting for L / D / S…
                  </span>
                )}
              </p>
            </div>
          </div>

          <button onClick={() => setOpen(false)}>
            <X />
          </button>
        </div>

        <div className="p-5">
          {shortcuts.map((s) => (
            <div key={s.id} className="flex justify-between py-2">
              <div>{s.title}</div>
              <div>{s.keys}</div>
              <div>{s.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default KeyboardShortcuts;