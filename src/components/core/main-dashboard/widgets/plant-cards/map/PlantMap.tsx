import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.Default.css";
import type { PlantDashboardMetrics } from "@/components/core/main-dashboard/types/dashboard.types";
import { PLANT_STATUS_COLORS } from "@/components/core/main-dashboard/constants/statusColors";
import { useMainDashboardStore } from "@/components/core/main-dashboard/store/mainDashboardStore";
import { PlantMapPopup } from "./PlantMapPopup";
import { createPortal } from "react-dom";
import { Maximize2, Minimize2, X } from "lucide-react";

interface PlantMapProps {
  plants: PlantDashboardMetrics[];
  fullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

function FitBounds({ plants }: { plants: PlantDashboardMetrics[] }) {
  const map = useMap();
  useEffect(() => {
    const coords = plants
      .filter((p) => p.latitude != null && p.longitude != null)
      .map((p) => [p.latitude!, p.longitude!] as [number, number]);
    if (coords.length === 1) {
      map.setView(coords[0]!, 10);
      return;
    }
    if (coords.length > 1) {
      map.fitBounds(coords, { padding: [40, 40], maxZoom: 12 });
    }
  }, [map, plants]);
  return null;
}

function useIsDarkMode() {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );
  useEffect(() => {
    const observer = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains("dark")),
    );
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

export function PlantMap({ plants, fullscreen, onToggleFullscreen }: PlantMapProps) {
  const isDark = useIsDarkMode();
  const selectedMapPlantId = useMainDashboardStore((s) => s.selectedMapPlantId);
  const setSelectedMapPlantId = useMainDashboardStore((s) => s.setSelectedMapPlantId);

  const mappable = useMemo(
    () => plants.filter((p) => p.latitude != null && p.longitude != null),
    [plants],
  );

  const selectedPlant = mappable.find((p) => p.plantId === selectedMapPlantId) ?? null;

  const defaultCenter: [number, number] = useMemo(() => {
    if (mappable.length) return [mappable[0]!.latitude!, mappable[0]!.longitude!];
    return [20.5937, 78.9629];
  }, [mappable]);

  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  const mapHeight = fullscreen ? "calc(100dvh - 48px)" : "100%";

  const floatingPopup =
    selectedPlant && typeof document !== "undefined"
      ? createPortal(
          <div
            className={
              fullscreen
                ? "fixed bottom-4 left-1/2 z-[10001] -translate-x-1/2"
                : "absolute bottom-3 left-3 z-[1000]"
            }
          >
            <PlantMapPopup
              plant={selectedPlant}
              isDark={isDark}
              onClose={() => setSelectedMapPlantId(null)}
            />
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      className={[
        "relative h-full min-h-[320px] overflow-hidden rounded-sm border border-neutral-200/80 dark:border-neutral-dark-300/60",
        fullscreen ? "fixed inset-0 z-[10000] rounded-none border-0 bg-neutral-900/20" : "",
      ].join(" ")}
    >
      {fullscreen ? (
        <div className="flex items-center justify-between border-b border-neutral-200/70 bg-white/90 px-3 py-2 dark:border-neutral-dark-400/50 dark:bg-neutral-dark-100/95">
          <p className="text-sm font-semibold">Plant Map</p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-neutral-200/80 dark:border-neutral-dark-400/50"
            >
              <Minimize2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-neutral-200/80 dark:border-neutral-dark-400/50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onToggleFullscreen}
          className="absolute right-2 top-2 z-[1000] inline-flex h-8 w-8 items-center justify-center rounded-sm border border-neutral-200/80 bg-white/90 shadow-sm dark:border-neutral-dark-400/50 dark:bg-neutral-dark-100/90"
          aria-label="Fullscreen map"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      )}

      <MapContainer
        center={defaultCenter}
        zoom={5}
        style={{ height: mapHeight, width: "100%" }}
        scrollWheelZoom
        className="z-0"
      >
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>' url={tileUrl} />
        <FitBounds plants={mappable} />
        <MarkerClusterGroup chunkedLoading maxClusterRadius={50}>
          {mappable.map((plant) => {
            const color = PLANT_STATUS_COLORS[plant.status].marker;
            return (
              <CircleMarker
                key={plant.plantId}
                center={[plant.latitude!, plant.longitude!]}
                radius={9}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.85,
                  weight: 2,
                }}
                eventHandlers={{
                  click: () => setSelectedMapPlantId(plant.plantId),
                }}
              >
                <Popup>
                  <span className="text-xs font-semibold">{plant.plantName}</span>
                </Popup>
              </CircleMarker>
            );
          })}
        </MarkerClusterGroup>
      </MapContainer>

      {floatingPopup}

      {!mappable.length ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/60 text-sm text-neutral-500 dark:bg-neutral-dark-100/60">
          No plants with location data available.
        </div>
      ) : null}
    </div>
  );
}
