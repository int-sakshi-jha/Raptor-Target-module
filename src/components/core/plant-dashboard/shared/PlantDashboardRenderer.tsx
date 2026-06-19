import type React from "react";
import type {
  PlantDashboardConfig,
  PlantDashboardGroupItem,
  PlantDashboardItem,
  PlantDashboardWidgetItem,
} from "./dashboardTypes";
import { PlantDashboardWorkspace } from "@/components/core/dashboard-builder/PlantDashboardWorkspace";
import { PlantDashboardWidgetChromeContext } from "./PlantDashboardWidgetChromeContext";
import { PLANT_DASHBOARD_WIDGET_REGISTRY } from "./widgetRegistry";

interface PlantDashboardRendererProps {
  config: PlantDashboardConfig;
  plantId?: string;
}

function isEnabled(item: PlantDashboardItem): boolean {
  return item.enabled !== false;
}

function PlantDashboardWidgetNode({
  item,
  plantId,
}: {
  item: PlantDashboardWidgetItem;
  plantId?: string;
}) {
  const definition = PLANT_DASHBOARD_WIDGET_REGISTRY[item.type];
  if (!definition) return null;

  const Widget = definition.component;
  const wrapperClass = [
    item.className,
    item.className?.includes("h-full") || item.className?.includes("flex-1")
      ? "flex h-full min-h-0 flex-col [&>*]:h-full [&>*]:min-h-0"
      : null,
  ]
    .filter(Boolean)
    .join(" ");

  const showHeading =
    (item.config as { showHeading?: boolean } | undefined)?.showHeading === true;

  return (
    <PlantDashboardWidgetChromeContext.Provider
      value={{ titleOverride: item.title, showHeading, embedded: false }}
    >
      <div className={wrapperClass || undefined}>
        <Widget plantId={plantId} title={item.title} config={item.config} />
      </div>
    </PlantDashboardWidgetChromeContext.Provider>
  );
}

function PlantDashboardGroupNode({
  item,
  plantId,
}: {
  item: PlantDashboardGroupItem;
  plantId?: string;
}) {
  const children = item.children
    .filter(isEnabled)
    .map((child) => <PlantDashboardNode key={child.id} item={child} plantId={plantId} />)
    .filter((node) => node != null);

  if (children.length === 0) return null;

  return <div className={item.className}>{children}</div>;
}

function PlantDashboardNode({
  item,
  plantId,
}: {
  item: PlantDashboardItem;
  plantId?: string;
}): React.ReactNode {
  if (!isEnabled(item)) return null;

  if (item.type === "group") {
    return <PlantDashboardGroupNode item={item} plantId={plantId} />;
  }
  return <PlantDashboardWidgetNode item={item} plantId={plantId} />;
}

export function PlantDashboardRenderer({ config, plantId }: PlantDashboardRendererProps) {
  return <PlantDashboardGroupNode item={config.root} plantId={plantId} />;
}

/** Plant dashboard with inline customize mode (grid builder). */
export function PlantDashboardView({ plantId }: { plantId?: string }) {
  return <PlantDashboardWorkspace plantId={plantId} />;
}
