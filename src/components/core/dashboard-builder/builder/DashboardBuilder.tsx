import { Copy, Eye, LayoutDashboard, PanelLeft, PanelRight, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { toastError } from "@/utils/errorFormatter";
import { usePlantComponents } from "@/hooks/usePlantComponents";
import { filterWidgetsByCapabilities } from "../registry/widgetLibrary";
import { buildWidgetCapabilityFlags } from "../core/plantCapabilities";
import { newDashboardDocumentId } from "../core/constants";
import { createDefaultDashboardDocument } from "../core/defaultTemplate";
import { getDashboardPersistence } from "../core/dashboardPersistence";
import { useDashboardDocument } from "../hooks/useDashboardDocument";
import { useDashboardEditorLayout } from "../hooks/useDashboardEditorLayout";
import { DashboardEditGrid } from "../runtime/DashboardEditGrid";
import type { GridLayoutItem, WidgetLibraryType } from "../types/document";
import { WIDGET_LIBRARY_BY_TYPE } from "../registry/widgetLibrary";
import { DashboardEditorSidePanel } from "./DashboardEditorSidePanel";
import { WidgetInspector } from "./WidgetInspector";
import { WidgetPalette } from "./WidgetPalette";
import {
  applyWidgetSizePreset,
  clampGridLayoutItem,
  type WidgetSizePreset,
} from "./widgetSizePresets";

interface DashboardBuilderProps {
  plantId: string;
  dashboardId?: string;
  onPreview?: () => void;
}

export function DashboardBuilder({ plantId, dashboardId, onPreview }: DashboardBuilderProps) {
  const plantComponents = usePlantComponents({ plantId });
  const [initial] = useState(() => createDefaultDashboardDocument(plantId));
  const [loaded, setLoaded] = useState(!dashboardId);

  const {
    document,
    selectedWidgetId,
    isDirty,
    setDocument,
    setName,
    selectWidget,
    addWidget,
    removeWidget,
    duplicateWidget,
    updateWidget,
    onLayoutChange,
    markClean,
  } = useDashboardDocument(initial);

  useEffect(() => {
    if (!dashboardId) return;
    let cancelled = false;
    void getDashboardPersistence()
      .get(plantId, dashboardId)
      .then((doc) => {
        if (cancelled || !doc) return;
        setDocument(doc);
        setLoaded(true);
      })
      .catch((error) => {
        if (!cancelled) toastError(error);
      });
    return () => {
      cancelled = true;
    };
  }, [dashboardId, plantId, setDocument]);

  const capabilities = useMemo(
    () => buildWidgetCapabilityFlags(plantComponents.plant, plantComponents.components),
    [plantComponents.components, plantComponents.plant],
  );

  const availableWidgets = useMemo(
    () => filterWidgetsByCapabilities(capabilities),
    [capabilities],
  );

  const selectedWidget = selectedWidgetId ? (document.widgets[selectedWidgetId] ?? null) : null;

  const {
    isMobile,
    showPalette,
    setShowPalette,
    showInspector,
    setShowInspector,
    openPalette,
    openInspector,
    paletteVariant,
    inspectorVariant,
  } = useDashboardEditorLayout(selectedWidgetId);

  const handleAddWidget = useCallback(
    (type: WidgetLibraryType) => {
      addWidget(type);
      if (isMobile) setShowPalette(false);
    },
    [addWidget, isMobile, setShowPalette],
  );

  const handleApplySizePreset = useCallback(
    (preset: WidgetSizePreset) => {
      if (!selectedWidgetId || !selectedWidget) return;
      const def = WIDGET_LIBRARY_BY_TYPE[selectedWidget.type];
      const current =
        selectedWidget.layouts.lg ?? def?.defaultSize ?? { x: 0, y: 0, w: 6, h: 4 };
      const nextLayout = clampGridLayoutItem(applyWidgetSizePreset(current, preset, def), def);
      updateWidget(selectedWidgetId, {
        layouts: { ...selectedWidget.layouts, lg: nextLayout },
      });
    },
    [selectedWidget, selectedWidgetId, updateWidget],
  );

  const handleApplyLayout = useCallback(
    (layout: GridLayoutItem) => {
      if (!selectedWidgetId || !selectedWidget) return;
      const def = WIDGET_LIBRARY_BY_TYPE[selectedWidget.type];
      updateWidget(selectedWidgetId, {
        layouts: {
          ...selectedWidget.layouts,
          lg: clampGridLayoutItem(layout, def),
        },
      });
    },
    [selectedWidget, selectedWidgetId, updateWidget],
  );

  const handleResetConfig = useCallback(() => {
    if (!selectedWidgetId || !selectedWidget) return;
    const def = WIDGET_LIBRARY_BY_TYPE[selectedWidget.type];
    updateWidget(selectedWidgetId, { config: { ...(def?.defaultConfig ?? {}) } });
  }, [selectedWidget, selectedWidgetId, updateWidget]);

  const handleSaveDraft = useCallback(async () => {
    try {
      const saved = await getDashboardPersistence().save({
        ...document,
        meta: { ...document.meta, status: "draft" },
      });
      setDocument(saved);
      markClean();
      toast.success("Draft saved");
    } catch (error) {
      toastError(error);
    }
  }, [document, markClean, setDocument]);

  const handleSaveAndApply = useCallback(async () => {
    try {
      const saved = await getDashboardPersistence().save(
        {
          ...document,
          meta: { ...document.meta, status: "published" },
        },
        { setActive: true },
      );
      setDocument(saved);
      markClean();
      toast.success("Dashboard saved and applied");
    } catch (error) {
      toastError(error);
    }
  }, [document, markClean, setDocument]);

  const handleDuplicate = useCallback(async () => {
    try {
      const saved = await getDashboardPersistence().duplicate({
        source: document,
        newId: newDashboardDocumentId(),
        newName: `${document.name} (Copy)`,
        status: "draft",
      });
      setDocument(saved);
      markClean();
      toast.success("Dashboard duplicated");
    } catch (error) {
      toastError(error);
    }
  }, [document, markClean, setDocument]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  if (dashboardId && !loaded) {
    return (
      <div className="flex min-h-[240px] items-center justify-center text-sm text-neutral-500">
        Loading dashboard…
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[480px] flex-col overflow-hidden rounded-md border border-neutral-200/80 bg-neutral-100/90 sm:min-h-[640px] dark:border-neutral-dark-300/70 dark:bg-neutral-dark-50">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-neutral-200/80 bg-white px-3 py-2 dark:border-neutral-dark-300/60 dark:bg-neutral-dark-100">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <LayoutDashboard className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
          <input
            type="text"
            value={document.name}
            onChange={(event) => setName(event.target.value)}
            className="min-w-0 max-w-[10rem] truncate rounded-xs border border-transparent bg-transparent px-1 py-0.5 text-sm font-semibold hover:border-neutral-200 focus:border-brand-500/40 focus:outline-none sm:max-w-xs dark:hover:border-neutral-dark-300"
          />
          {isDirty ? (
            <span className="rounded-xs bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
              Unsaved
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => (showPalette ? setShowPalette(false) : openPalette())}
            className={`inline-flex items-center gap-1 rounded-xs border px-2 py-1 text-xs font-medium ${
              showPalette
                ? "border-brand-500/40 bg-brand-500/10 text-brand-700 dark:text-brand-400"
                : "border-neutral-200/80 hover:bg-neutral-50 dark:border-neutral-dark-300/60"
            }`}
          >
            <PanelLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Widgets</span>
          </button>
          <button
            type="button"
            onClick={() => (showInspector ? setShowInspector(false) : openInspector())}
            className={`inline-flex items-center gap-1 rounded-xs border px-2 py-1 text-xs font-medium ${
              showInspector
                ? "border-brand-500/40 bg-brand-500/10 text-brand-700 dark:text-brand-400"
                : "border-neutral-200/80 hover:bg-neutral-50 dark:border-neutral-dark-300/60"
            }`}
          >
            <PanelRight className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Settings</span>
          </button>
          {onPreview ? (
            <button
              type="button"
              onClick={onPreview}
              className="inline-flex items-center gap-1 rounded-xs border border-neutral-200/80 px-2 py-1 text-xs font-medium hover:bg-neutral-50 dark:border-neutral-dark-300/60 dark:hover:bg-neutral-dark-200/50"
            >
              <Eye className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Preview</span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void handleDuplicate()}
            className="inline-flex items-center gap-1 rounded-xs border border-neutral-200/80 px-2 py-1 text-xs font-medium hover:bg-neutral-50 dark:border-neutral-dark-300/60 dark:hover:bg-neutral-dark-200/50"
          >
            <Copy className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Duplicate</span>
          </button>
          <button
            type="button"
            onClick={() => void handleSaveDraft()}
            className="inline-flex items-center gap-1 rounded-xs border border-neutral-200/80 px-2 py-1 text-xs font-medium hover:bg-neutral-50 dark:border-neutral-dark-300/60 dark:hover:bg-neutral-dark-200/50"
          >
            <Save className="h-3.5 w-3.5" />
            Save draft
          </button>
          <button
            type="button"
            onClick={() => void handleSaveAndApply()}
            className="inline-flex items-center gap-1 rounded-xs bg-brand-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-700"
          >
            Save & apply
          </button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <DashboardEditorSidePanel
          open={showPalette}
          side="left"
          overlay={isMobile}
          onClose={() => setShowPalette(false)}
        >
          <WidgetPalette
            widgets={availableWidgets}
            onAdd={handleAddWidget}
            variant={paletteVariant}
            onClose={isMobile ? () => setShowPalette(false) : undefined}
          />
        </DashboardEditorSidePanel>

        <main
          className="dashboard-editor-main min-w-0 flex-1 p-2 sm:p-3"
          onClick={() => selectWidget(null)}
        >
          <DashboardEditGrid
            document={document}
            plantId={plantId}
            selectedWidgetId={selectedWidgetId}
            onLayoutChange={onLayoutChange}
            onSelectWidget={(widgetId) => {
              selectWidget(widgetId);
              if (isMobile && widgetId) openInspector();
            }}
          />
        </main>

        <DashboardEditorSidePanel
          open={showInspector}
          side="right"
          overlay={isMobile}
          onClose={() => setShowInspector(false)}
        >
          <WidgetInspector
            plantId={plantId}
            widget={selectedWidget}
            variant={inspectorVariant}
            onClose={isMobile ? () => setShowInspector(false) : undefined}
            onUpdate={(patch) => {
              if (!selectedWidgetId) return;
              updateWidget(selectedWidgetId, patch);
            }}
            onApplySizePreset={handleApplySizePreset}
            onApplyLayout={handleApplyLayout}
            onDuplicate={() => {
              if (!selectedWidgetId) return;
              duplicateWidget(selectedWidgetId);
            }}
            onResetConfig={handleResetConfig}
            onRemove={() => {
              if (!selectedWidgetId) return;
              removeWidget(selectedWidgetId);
            }}
          />
        </DashboardEditorSidePanel>
      </div>
    </div>
  );
}
