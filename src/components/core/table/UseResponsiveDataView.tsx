import { useCallback, useEffect, useState } from "react";

export type DataViewMode = "table" | "cards" | "heatmap";

const MOBILE_MEDIA_QUERY = "(max-width: 767px)";

const getDefaultView = (
  isMobile: boolean,
  desktopDefault: DataViewMode,
  mobileDefault: DataViewMode,
): DataViewMode => (isMobile ? mobileDefault : desktopDefault);

export const useResponsiveDataView = (
  desktopDefault: DataViewMode = "table",
  mobileDefault: DataViewMode = "cards",
) => {
  const [selectedView, setSelectedView] = useState<DataViewMode>(desktopDefault);
  const [hasUserChangedView, setHasUserChangedView] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);

    const syncDefaultView = (matches: boolean) => {
      if (hasUserChangedView) return;
      setSelectedView(getDefaultView(matches, desktopDefault, mobileDefault));
    };

    syncDefaultView(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      syncDefaultView(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [desktopDefault, hasUserChangedView, mobileDefault]);

  const handleSetSelectedView = useCallback((view: DataViewMode) => {
    setHasUserChangedView(true);
    setSelectedView(view);
  }, []);

  return [selectedView, handleSetSelectedView] as const;
};
