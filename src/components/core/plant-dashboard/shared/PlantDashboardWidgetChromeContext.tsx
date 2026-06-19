import { createContext } from "react";

export interface PlantDashboardWidgetChrome {
  /** Custom title from the dashboard builder; overrides the widget default when set. */
  titleOverride?: string;
  showHeading: boolean;
  /** True when rendered inside a dashboard grid cell (strip duplicate card chrome). */
  embedded?: boolean;
}

export const PlantDashboardWidgetChromeContext = createContext<PlantDashboardWidgetChrome>({
  showHeading: false,
});
