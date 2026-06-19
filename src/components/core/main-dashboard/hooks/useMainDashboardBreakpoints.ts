import { useMediaQuery } from "usehooks-ts";
import { MAIN_DASHBOARD_BREAKPOINTS } from "@/components/core/main-dashboard/constants/breakpoints";

export function useMainDashboardBreakpoints() {
  const isMobile = useMediaQuery(MAIN_DASHBOARD_BREAKPOINTS.mobile);
  const isTablet = useMediaQuery(MAIN_DASHBOARD_BREAKPOINTS.tablet);
  const isLaptop = useMediaQuery(MAIN_DASHBOARD_BREAKPOINTS.laptop);
  const isDesktop = useMediaQuery(MAIN_DASHBOARD_BREAKPOINTS.desktop);
  const isUltraWide = useMediaQuery(MAIN_DASHBOARD_BREAKPOINTS.ultraWide);
  const useKpiSlider = useMediaQuery(MAIN_DASHBOARD_BREAKPOINTS.kpiSlider);

  return {
    isMobile,
    isTablet,
    isLaptop,
    isDesktop,
    isUltraWide,
    useKpiSlider,
    isCompact: isMobile || isTablet,
    /** Plant cards grid column count driven by viewport. */
    plantCardsGridCols: isUltraWide ? 4 : isDesktop ? 3 : isLaptop || isTablet ? 2 : 1,
    /** Stack card sections vertically on small screens. */
    plantCardStacked: isMobile,
    /** Badges span full width below title on mobile. */
    plantCardBadgesFullWidth: isMobile,
  };
}

export { useMediaQuery };
