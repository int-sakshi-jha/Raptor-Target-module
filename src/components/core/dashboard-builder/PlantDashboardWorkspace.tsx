import {
  Copy,
  LayoutDashboard,
  PanelLeft,
  PanelRight,
  Pencil,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { toastError } from "@/utils/errorFormatter";
import { usePlantComponents } from "@/hooks/usePlantComponents";
import { PlantDashboardRenderer } from "@/components/core/plant-dashboard/shared/PlantDashboardRenderer";
import { usePlantDashboardConfig } from "@/components/core/plant-dashboard/shared/plantDashboardConfig";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import { DashboardEditorSidePanel } from "./builder/DashboardEditorSidePanel";
import {
  DASHBOARD_TOOLBAR_PRIMARY_ACTION,
  dashboardToolbarButtonClass,
} from "./builder/dashboardToolbarStyles";
import { DashboardTemplateManagerModal } from "./builder/DashboardTemplateManagerModal";
import { DashboardTemplatePicker } from "./builder/DashboardTemplatePicker";
import { SaveTemplateDialog } from "./builder/SaveTemplateDialog";
import { WidgetInspector } from "./builder/WidgetInspector";
import { WidgetPalette } from "./builder/WidgetPalette";
import { useDashboardEditorLayout } from "./hooks/useDashboardEditorLayout";
import { usePlantDashboardTemplates } from "./hooks/usePlantDashboardTemplates";
import {
  applyWidgetSizePreset,
  clampGridLayoutItem,
  type WidgetSizePreset,
} from "./builder/widgetSizePresets";
import type { GridLayoutItem } from "./types/document";
import {
  cloneDashboardDocument,
  createNewDashboardFromBase,
  normalizeDashboardDocument,
  resolveActiveLayoutDocument,
} from "./core/bootstrapDocument";
import { DEFAULT_DASHBOARD_NAME } from "./core/defaultDashboard";
import { newDashboardDocumentId } from "./core/constants";
import type {
  DashboardDocument,
  DashboardWidgetInstance,
  WidgetLibraryType,
} from "./types/document";
import { buildWidgetCapabilityFlags } from "./core/plantCapabilities";
import { filterWidgetsByCapabilities, WIDGET_LIBRARY_BY_TYPE } from "./registry/widgetLibrary";
import { useDashboardDocument } from "./hooks/useDashboardDocument";
import { DashboardGrid } from "./runtime/DashboardGrid";
import { DashboardEditGrid } from "./runtime/DashboardEditGrid";

interface PlantDashboardWorkspaceProps {
  plantId?: string;
}

type EditorSession =
  | { mode: "new"; initialDocument: DashboardDocument }
  | { mode: "edit"; templateId: string; initialDocument: DashboardDocument };

export function PlantDashboardWorkspace({ plantId }: PlantDashboardWorkspaceProps) {
  const [editorSession, setEditorSession] = useState<EditorSession | null>(null);
  const [showManager, setShowManager] = useState(false);

  const {
    templates,
    activeDocument,
    activeTemplateId,
    isLoading: templatesLoading,
    getTemplate,
    setActive,
    applyTemplate,
    saveTemplate,
    duplicateTemplate,
    removeTemplate,
  } = usePlantDashboardTemplates(plantId);

  const displayDocument = useMemo(
    () => (activeDocument ? normalizeDashboardDocument(activeDocument) : null),
    [activeDocument],
  );

  const { config, isLoading, isReady } = usePlantDashboardConfig(plantId);

  const isDefaultDashboardActive = !activeTemplateId;

  const activeLayoutName = useMemo(
    () =>
      activeTemplateId && displayDocument
        ? displayDocument.name
        : DEFAULT_DASHBOARD_NAME,
    [activeTemplateId, displayDocument],
  );

  const activeLayoutDocument = useMemo(
    () =>
      plantId
        ? resolveActiveLayoutDocument({
            plantId,
            autoConfig: config,
            configReady: isReady,
            activeTemplateId,
            savedTemplateDocument: displayDocument,
          })
        : null,
    [activeTemplateId, config, displayDocument, isReady, plantId],
  );

  const openCustomize = useCallback(() => {
    if (!activeLayoutDocument) {
      toast.error("Active layout is still loading. Please try again in a moment.");
      return;
    }

    const snapshot = cloneDashboardDocument(activeLayoutDocument);

    if (activeTemplateId) {
      setEditorSession({
        mode: "edit",
        templateId: activeTemplateId,
        initialDocument: snapshot,
      });
      return;
    }

    setEditorSession({
      mode: "new",
      initialDocument: createNewDashboardFromBase(plantId!, snapshot, "New dashboard"),
    });
  }, [activeLayoutDocument, activeTemplateId, plantId]);

  const openNewTemplate = useCallback(() => {
    if (!activeLayoutDocument) {
      toast.error("Active layout is still loading. Please try again in a moment.");
      return;
    }

    setEditorSession({
      mode: "new",
      initialDocument: createNewDashboardFromBase(
        plantId!,
        cloneDashboardDocument(activeLayoutDocument),
      ),
    });
  }, [activeLayoutDocument, plantId]);

  if (!plantId) {
    return (
      <div className="flex min-h-[240px] items-center justify-center text-sm text-neutral-500">
        Plant not found.
      </div>
    );
  }

  if (!editorSession && isLoading && !isReady && !activeTemplateId) {
    return (
      <div className="flex min-h-[240px] items-center justify-center text-sm text-neutral-500 dark:text-neutral-dark-600">
        Loading plant dashboard…
      </div>
    );
  }

  if (editorSession) {
    return (
      <PlantDashboardEditor
        key={`editor-${plantId}-${editorSession.mode}-${editorSession.mode === "edit" ? editorSession.templateId : editorSession.initialDocument.id}`}
        plantId={plantId}
        session={editorSession}
        activeLayoutLabel={activeLayoutName}
        isDefaultDashboardActive={isDefaultDashboardActive}
        onSaveTemplate={saveTemplate}
        onDone={() => setEditorSession(null)}
        onCancel={() => setEditorSession(null)}
      />
    );
  }

  return (
    <div className="space-y-2">
      <DashboardToolbar
        templates={templates}
        activeTemplateId={activeTemplateId}
        viewingTemplate={Boolean(activeTemplateId)}
        templatesLoading={templatesLoading}
        onSelectTemplate={(dashboardId) => {
          void (async () => {
            try {
              if (dashboardId) {
                const template = templates.find((item) => item.id === dashboardId);
                if (!template) {
                  toast.error("Template not found");
                  return;
                }
                await applyTemplate(template);
              } else {
                await setActive(null);
              }
              toast.success(
                dashboardId ? "Dashboard template applied" : `${DEFAULT_DASHBOARD_NAME} selected`,
              );
            } catch {
              // Backend message shown via mutation onError
            }
          })();
        }}
        onManageTemplates={() => setShowManager(true)}
        onCustomize={openCustomize}
        customizeDisabled={!activeLayoutDocument}
      />

      {activeTemplateId && displayDocument ? (
        <DashboardGrid document={displayDocument} plantId={plantId} />
      ) : isReady ? (
        <PlantDashboardRenderer config={config} plantId={plantId} />
      ) : (
        <div className="flex min-h-[320px] items-center justify-center rounded-sm border border-neutral-200/70 bg-white text-sm text-neutral-500 dark:border-neutral-dark-300/60 dark:bg-neutral-dark-100 dark:text-neutral-dark-600">
          Loading plant dashboard…
        </div>
      )}

      <DashboardTemplateManagerModal
        open={showManager}
        plantId={plantId}
        templates={templates}
        activeTemplateId={activeTemplateId}
        onClose={() => setShowManager(false)}
        onApply={async (template) => {
          try {
            await applyTemplate(template);
            toast.success(
              template.status === "draft"
                ? "Template published and applied"
                : "Dashboard template applied",
            );
          } catch {
            // Backend message shown via mutation onError
          }
        }}
        onEdit={async (templateId) => {
          let source: DashboardDocument | null;
          try {
            source =
              activeDocument?.id === templateId
                ? activeDocument
                : await getTemplate(templateId);
          } catch (error) {
            toastError(error);
            return;
          }
          if (!source) {
            toast.error("Template not found");
            return;
          }
          setShowManager(false);
          setEditorSession({
            mode: "edit",
            templateId,
            initialDocument: normalizeDashboardDocument(source),
          });
        }}
        onDuplicate={async (dashboardId, newName) => {
          try {
            await duplicateTemplate(dashboardId, newName);
            toast.success("Template duplicated");
          } catch {
            // Backend message shown via mutation onError
          }
        }}
        onRename={async (dashboardId, newName) => {
          let source: DashboardDocument | null;
          try {
            source =
              activeDocument?.id === dashboardId
                ? activeDocument
                : await getTemplate(dashboardId);
          } catch (error) {
            toastError(error);
            return;
          }
          if (!source) {
            toast.error("Template not found");
            return;
          }
          try {
            await saveTemplate({ ...source, name: newName });
            toast.success("Template renamed");
          } catch {
            // Backend message shown via mutation onError
          }
        }}
        onDelete={async (dashboardId) => {
          try {
            await removeTemplate(dashboardId);
            toast.success("Template deleted");
          } catch {
            // Backend message shown via mutation onError
          }
        }}
        onCreateNew={openNewTemplate}
      />
    </div>
  );
}

function DashboardToolbar({
  templates,
  activeTemplateId,
  viewingTemplate,
  templatesLoading,
  onSelectTemplate,
  onManageTemplates,
  onCustomize,
  customizeDisabled,
}: {
  templates: ReturnType<typeof usePlantDashboardTemplates>["templates"];
  activeTemplateId: string | null;
  viewingTemplate: boolean;
  templatesLoading: boolean;
  onSelectTemplate: (dashboardId: string | null) => void;
  onManageTemplates: () => void;
  onCustomize: () => void;
  customizeDisabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-neutral-200/70 bg-white px-2.5 py-1.5 dark:border-neutral-dark-300/60 dark:bg-neutral-dark-100">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <DashboardTemplatePicker
          templates={templates}
          activeTemplateId={activeTemplateId}
          onSelect={onSelectTemplate}
          onManage={onManageTemplates}
          disabled={templatesLoading}
        />
        <span className="hidden text-xs text-neutral-500 sm:inline dark:text-neutral-dark-600">
          {viewingTemplate ? "Saved template" : DEFAULT_DASHBOARD_NAME}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onCustomize}
          disabled={customizeDisabled}
          className={`${DASHBOARD_TOOLBAR_PRIMARY_ACTION} disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <Pencil className="h-3.5 w-3.5" />
          Customize
        </button>
      </div>
    </div>
  );
}

function PlantDashboardEditor({
  plantId,
  session,
  activeLayoutLabel,
  isDefaultDashboardActive,
  onSaveTemplate,
  onDone,
  onCancel,
}: {
  plantId: string;
  session: EditorSession;
  activeLayoutLabel: string;
  isDefaultDashboardActive: boolean;
  onSaveTemplate: ReturnType<typeof usePlantDashboardTemplates>["saveTemplate"];
  onDone: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const previousOverflow = window.document.body.style.overflow;
    window.document.body.style.overflow = "hidden";
    return () => {
      window.document.body.style.overflow = previousOverflow;
    };
  }, []);

  return createPortal(
    <PlantDashboardEditorCanvas
      plantId={plantId}
      session={session}
      initialDocument={session.initialDocument}
      activeLayoutLabel={activeLayoutLabel}
      isDefaultDashboardActive={isDefaultDashboardActive}
      onSaveTemplate={onSaveTemplate}
      onDone={onDone}
      onCancel={onCancel}
    />,
    window.document.body,
  );
}

function PlantDashboardEditorCanvas({
  plantId,
  session,
  initialDocument,
  activeLayoutLabel,
  isDefaultDashboardActive,
  onSaveTemplate,
  onDone,
  onCancel,
}: {
  plantId: string;
  session: EditorSession;
  initialDocument: DashboardDocument;
  activeLayoutLabel: string;
  isDefaultDashboardActive: boolean;
  onSaveTemplate: ReturnType<typeof usePlantDashboardTemplates>["saveTemplate"];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [showSaveAsDialog, setShowSaveAsDialog] = useState(false);
  const [showClearAllDialog, setShowClearAllDialog] = useState(false);

  const plantComponents = usePlantComponents({ plantId });
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
    clearAllWidgets,
  } = useDashboardDocument(initialDocument);

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

  const handleWidgetUpdate = useCallback(
    (widgetId: string, patch: Partial<DashboardWidgetInstance>) => {
      updateWidget(widgetId, patch);
    },
    [updateWidget],
  );

  const handleApplySizePreset = useCallback(
    (preset: WidgetSizePreset) => {
      if (!selectedWidgetId || !selectedWidget) return;
      const def = WIDGET_LIBRARY_BY_TYPE[selectedWidget.type];
      const current =
        selectedWidget.layouts.lg ??
        def?.defaultSize ?? { x: 0, y: 0, w: 6, h: 4 };
      const nextLayout = clampGridLayoutItem(applyWidgetSizePreset(current, preset, def), def);
      updateWidget(selectedWidgetId, {
        layouts: {
          ...selectedWidget.layouts,
          lg: nextLayout,
        },
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
    updateWidget(selectedWidgetId, {
      config: { ...(def?.defaultConfig ?? {}) },
    });
  }, [selectedWidget, selectedWidgetId, updateWidget]);

  const persistDocument = useCallback(
    async (options: { status: "draft" | "published"; setActive: boolean }) => {
      const saved = await onSaveTemplate(document, options);
      setDocument(saved);
      markClean();
      return saved;
    },
    [document, markClean, onSaveTemplate, setDocument],
  );

  const handleSaveDraft = useCallback(async () => {
    try {
      await persistDocument({ status: "draft", setActive: false });
      toast.success("Draft saved");
    } catch {
      // Backend message shown via mutation onError
    }
  }, [persistDocument]);

  const handleSaveAndApply = useCallback(async () => {
    try {
      await persistDocument({ status: "published", setActive: true });
      toast.success("Dashboard saved and applied");
      onDone();
    } catch {
      // Backend message shown via mutation onError
    }
  }, [onDone, persistDocument]);

  const handleSaveAsNew = useCallback(
    async (name: string) => {
      try {
        const copy = {
          ...document,
          id: newDashboardDocumentId(),
          name,
          meta: {
            ...document.meta,
            status: "draft" as const,
            kind: "custom" as const,
            isDefault: false,
            version: 1,
          },
        };
        const saved = await onSaveTemplate(copy, { status: "draft", setActive: false });
        setDocument(saved);
        markClean();
        toast.success("Saved as new template");
      } catch {
        // Backend message shown via mutation onError
      }
    },
    [document, markClean, onSaveTemplate, setDocument],
  );

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  const widgetCount = Object.keys(document.widgets).length;
  const layoutSourceLabel =
    session.mode === "edit"
      ? `Editing ${activeLayoutLabel}`
      : isDefaultDashboardActive
        ? `Customizing ${DEFAULT_DASHBOARD_NAME} · saves create a new template`
        : `New template from ${activeLayoutLabel}`;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-neutral-100 dark:bg-neutral-dark-50">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-neutral-200/80 bg-white px-3 py-2 shadow-sm sm:gap-3 sm:px-4 sm:py-2.5 dark:border-neutral-dark-300/60 dark:bg-neutral-dark-100">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <Pencil className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
          <div className="min-w-0 flex-1">
            <input
              type="text"
              value={document.name}
              onChange={(event) => setName(event.target.value)}
              className="w-full max-w-[14rem] truncate rounded-xs border border-transparent bg-transparent px-1 py-0.5 text-sm font-semibold text-neutral-900 hover:border-neutral-200 focus:border-brand-500/40 focus:outline-none sm:max-w-xs dark:text-neutral-dark-950 dark:hover:border-neutral-dark-300"
            />
            <p className="hidden text-[11px] text-neutral-500 sm:block dark:text-neutral-dark-600">
              {layoutSourceLabel} · drag the top bar to move · resize from the bottom-right
            </p>
          </div>
          {isDirty ? (
            <span className="shrink-0 rounded-xs bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
              Unsaved
            </span>
          ) : null}
        </div>
        <div className="flex w-full flex-wrap items-center justify-end gap-1.5 sm:w-auto">
          <button
            type="button"
            title="Open widget palette"
            onClick={() => (showPalette ? setShowPalette(false) : openPalette())}
            className={dashboardToolbarButtonClass(showPalette ? "active" : "default")}
          >
            <PanelLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Widgets</span>
          </button>
          <button
            type="button"
            title="Widget settings"
            onClick={() => (showInspector ? setShowInspector(false) : openInspector())}
            className={dashboardToolbarButtonClass(showInspector ? "active" : "default")}
          >
            <PanelRight className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Settings</span>
          </button>
          <button
            type="button"
            title="Remove all widgets from the canvas"
            disabled={widgetCount === 0}
            onClick={() => setShowClearAllDialog(true)}
            className={dashboardToolbarButtonClass("danger")}
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Clear all</span>
          </button>
          <button
            type="button"
            title="Save as a new template without changing the plant dashboard"
            onClick={() => setShowSaveAsDialog(true)}
            className={dashboardToolbarButtonClass()}
          >
            <Copy className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Save as new</span>
          </button>
          <button
            type="button"
            title="Discard changes and close editor"
            onClick={onCancel}
            className={`${dashboardToolbarButtonClass()} sm:px-2.5`}
          >
            <X className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Cancel</span>
          </button>
          {session.mode === "new" ? (
            <>
              <button
                type="button"
                title="Save as a new template draft"
                onClick={() => void handleSaveDraft()}
                className={dashboardToolbarButtonClass()}
              >
                <Save className="h-3.5 w-3.5" />
                Save draft
              </button>
              <button
                type="button"
                title="Save as a new template and apply it to this plant"
                onClick={() => void handleSaveAndApply()}
                className={DASHBOARD_TOOLBAR_PRIMARY_ACTION}
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                Save & apply
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                title="Save changes to this template"
                onClick={() => void handleSaveDraft()}
                className={dashboardToolbarButtonClass()}
              >
                <Save className="h-3.5 w-3.5" />
                Save draft
              </button>
              <button
                type="button"
                title="Save and apply this template"
                onClick={() => void handleSaveAndApply()}
                className={DASHBOARD_TOOLBAR_PRIMARY_ACTION}
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                Save & apply
              </button>
            </>
          )}
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
          className="dashboard-editor-main min-w-0 flex-1 p-2 sm:p-3 lg:p-4"
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
              handleWidgetUpdate(selectedWidgetId, patch);
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

      <ConfirmationDialog
        open={showClearAllDialog}
        overlayClassName="z-[230]"
        onClose={() => setShowClearAllDialog(false)}
        onConfirm={() => {
          clearAllWidgets();
          setShowClearAllDialog(false);
          toast.success("All widgets removed");
        }}
        title="Clear all widgets?"
        message="This removes every widget from the canvas so you can build a layout from scratch. You can still cancel the editor without saving."
        confirmText="Clear all"
        type="danger"
      />

      <SaveTemplateDialog
        open={showSaveAsDialog}
        title="Save as new template"
        subtitle={
          isDefaultDashboardActive
            ? `${DEFAULT_DASHBOARD_NAME} is not stored in the database. This creates a new saved template.`
            : "Create a separate copy without changing the current template"
        }
        initialName={`${document.name} (Copy)`}
        confirmLabel="Save copy"
        backdropClassName="z-[230]"
        containerClassName="z-[231]"
        onClose={() => setShowSaveAsDialog(false)}
        onConfirm={handleSaveAsNew}
      />
    </div>
  );
}
