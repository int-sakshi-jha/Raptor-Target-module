import { useCallback, useState } from "react";
import { useMediaQuery } from "usehooks-ts";

function readInitialPaletteOpen() {
  if (typeof window === "undefined") return true;
  return !window.matchMedia("(max-width: 767px)").matches;
}

function readInitialInspectorOpen() {
  if (typeof window === "undefined") return true;
  return !window.matchMedia("(max-width: 1023px)").matches;
}

export function useDashboardEditorLayout(_selectedWidgetId: string | null) {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const isTablet = useMediaQuery("(max-width: 1023px)");
  const isDesktop = !isTablet;

  const [showPalette, setShowPalette] = useState(readInitialPaletteOpen);
  const [showInspector, setShowInspector] = useState(readInitialInspectorOpen);

  const openPalette = useCallback(() => {
    setShowPalette(true);
    if (isMobile) setShowInspector(false);
  }, [isMobile]);

  const openInspector = useCallback(() => {
    setShowInspector(true);
    if (isMobile) setShowPalette(false);
  }, [isMobile]);

  const closePanels = useCallback(() => {
    setShowPalette(false);
    setShowInspector(false);
  }, []);

  return {
    isMobile,
    isTablet,
    isDesktop,
    showPalette,
    setShowPalette,
    showInspector,
    setShowInspector,
    openPalette,
    openInspector,
    closePanels,
    paletteVariant: isMobile ? ("drawer" as const) : ("sidebar" as const),
    inspectorVariant: isMobile ? ("drawer" as const) : ("sidebar" as const),
  };
}
