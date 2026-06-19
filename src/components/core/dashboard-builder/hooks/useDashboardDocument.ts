import { useCallback, useReducer } from "react";
import type { DashboardBreakpoint, DashboardDocument, DashboardWidgetInstance } from "../types/document";
import { getDocumentLayoutSignature } from "../core/bootstrapDocument";
import { newDashboardWidgetId } from "../core/constants";
import { buildInitialWidgetLayout, createDefaultLayouts, findAutoPlacement } from "../core/layoutEngine";
import { applyRglLayoutChange } from "../core/rglAdapter";
import { WIDGET_LIBRARY_BY_TYPE } from "../registry/widgetLibrary";
import type { WidgetLibraryType } from "../types/document";
import type { Layout } from "react-grid-layout/legacy";

type State = {
  document: DashboardDocument;
  selectedWidgetId: string | null;
  isDirty: boolean;
};

type Action =
  | { type: "SET_DOCUMENT"; document: DashboardDocument }
  | { type: "SET_NAME"; name: string }
  | { type: "SELECT_WIDGET"; widgetId: string | null }
  | { type: "ADD_WIDGET"; widgetType: WidgetLibraryType; breakpoint?: DashboardBreakpoint }
  | { type: "REMOVE_WIDGET"; widgetId: string }
  | { type: "DUPLICATE_WIDGET"; widgetId: string }
  | { type: "UPDATE_WIDGET"; widgetId: string; patch: Partial<DashboardWidgetInstance> }
  | { type: "LAYOUT_CHANGE"; breakpoint: DashboardBreakpoint; layout: Layout }
  | { type: "CLEAR_ALL_WIDGETS" }
  | { type: "MARK_CLEAN" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_DOCUMENT":
      return { document: action.document, selectedWidgetId: null, isDirty: false };
    case "SET_NAME":
      return {
        ...state,
        isDirty: true,
        document: { ...state.document, name: action.name },
      };
    case "SELECT_WIDGET":
      return { ...state, selectedWidgetId: action.widgetId };
    case "ADD_WIDGET": {
      const def = WIDGET_LIBRARY_BY_TYPE[action.widgetType];
      const id = newDashboardWidgetId(action.widgetType);
      const breakpoint = action.breakpoint ?? "lg";
      const baseLayout = buildInitialWidgetLayout(def, state.document.widgets, breakpoint);
      const widget: DashboardWidgetInstance = {
        id,
        type: action.widgetType,
        title: def.label,
        config: { ...(def.defaultConfig ?? {}) },
        layouts: createDefaultLayouts(baseLayout),
      };
      return {
        ...state,
        isDirty: true,
        selectedWidgetId: id,
        document: {
          ...state.document,
          widgets: { ...state.document.widgets, [id]: widget },
        },
      };
    }
    case "REMOVE_WIDGET": {
      const nextWidgets = { ...state.document.widgets };
      delete nextWidgets[action.widgetId];
      return {
        ...state,
        isDirty: true,
        selectedWidgetId:
          state.selectedWidgetId === action.widgetId ? null : state.selectedWidgetId,
        document: { ...state.document, widgets: nextWidgets },
      };
    }
    case "DUPLICATE_WIDGET": {
      const source = state.document.widgets[action.widgetId];
      if (!source) return state;
      const def = WIDGET_LIBRARY_BY_TYPE[source.type];
      const id = newDashboardWidgetId(source.type);
      const sourceLayout = source.layouts.lg ?? def?.defaultSize ?? { x: 0, y: 0, w: 6, h: 4 };
      const placement = findAutoPlacement({
        widgets: state.document.widgets,
        breakpoint: "lg",
        w: sourceLayout.w,
        h: sourceLayout.h,
      });
      const widget: DashboardWidgetInstance = {
        ...source,
        id,
        title: `${source.title ?? def?.label ?? source.type} (copy)`,
        config: { ...source.config },
        layouts: createDefaultLayouts({
          ...placement,
          w: sourceLayout.w,
          h: sourceLayout.h,
          minW: sourceLayout.minW ?? def?.defaultSize.minW,
          minH: sourceLayout.minH ?? def?.defaultSize.minH,
          maxW: sourceLayout.maxW ?? def?.maxSize?.maxW,
          maxH: sourceLayout.maxH ?? def?.maxSize?.maxH,
        }),
      };
      return {
        ...state,
        isDirty: true,
        selectedWidgetId: id,
        document: {
          ...state.document,
          widgets: { ...state.document.widgets, [id]: widget },
        },
      };
    }
    case "UPDATE_WIDGET": {
      const existing = state.document.widgets[action.widgetId];
      if (!existing) return state;
      const { config: configPatch, ...restPatch } = action.patch;
      const nextWidget: DashboardWidgetInstance = {
        ...existing,
        ...restPatch,
        ...(configPatch
          ? { config: { ...existing.config, ...configPatch } }
          : {}),
      };
      return {
        ...state,
        isDirty: true,
        document: {
          ...state.document,
          widgets: {
            ...state.document.widgets,
            [action.widgetId]: nextWidget,
          },
        },
      };
    }
    case "LAYOUT_CHANGE": {
      const nextDocument = applyRglLayoutChange({
        document: state.document,
        breakpoint: action.breakpoint,
        layout: action.layout,
      });
      if (getDocumentLayoutSignature(nextDocument) === getDocumentLayoutSignature(state.document)) {
        return state;
      }
      return {
        ...state,
        isDirty: true,
        document: nextDocument,
      };
    }
    case "CLEAR_ALL_WIDGETS":
      if (Object.keys(state.document.widgets).length === 0) return state;
      return {
        ...state,
        isDirty: true,
        selectedWidgetId: null,
        document: { ...state.document, widgets: {} },
      };
    case "MARK_CLEAN":
      return { ...state, isDirty: false };
    default:
      return state;
  }
}

export function useDashboardDocument(initial: DashboardDocument) {
  const [state, dispatch] = useReducer(reducer, {
    document: initial,
    selectedWidgetId: null,
    isDirty: false,
  });

  const setDocument = useCallback((document: DashboardDocument) => {
    dispatch({ type: "SET_DOCUMENT", document });
  }, []);

  const setName = useCallback((name: string) => {
    dispatch({ type: "SET_NAME", name });
  }, []);

  const selectWidget = useCallback((widgetId: string | null) => {
    dispatch({ type: "SELECT_WIDGET", widgetId });
  }, []);

  const addWidget = useCallback(
    (widgetType: WidgetLibraryType, breakpoint?: DashboardBreakpoint) => {
      dispatch({ type: "ADD_WIDGET", widgetType, breakpoint });
    },
    [],
  );

  const removeWidget = useCallback((widgetId: string) => {
    dispatch({ type: "REMOVE_WIDGET", widgetId });
  }, []);

  const duplicateWidget = useCallback((widgetId: string) => {
    dispatch({ type: "DUPLICATE_WIDGET", widgetId });
  }, []);

  const updateWidget = useCallback(
    (widgetId: string, patch: Partial<DashboardWidgetInstance>) => {
      dispatch({ type: "UPDATE_WIDGET", widgetId, patch });
    },
    [],
  );

  const onLayoutChange = useCallback(
    (breakpoint: DashboardBreakpoint, layout: Layout) => {
      if (import.meta.env.DEV) {
        console.log("[useDashboardDocument] onLayoutChange", {
          breakpoint,
          items: layout.map((item) => ({
            i: item.i,
            x: item.x,
            y: item.y,
            w: item.w,
            h: item.h,
          })),
        });
      }
      dispatch({ type: "LAYOUT_CHANGE", breakpoint, layout });
    },
    [],
  );

  const markClean = useCallback(() => {
    dispatch({ type: "MARK_CLEAN" });
  }, []);

  const clearAllWidgets = useCallback(() => {
    dispatch({ type: "CLEAR_ALL_WIDGETS" });
  }, []);

  return {
    document: state.document,
    selectedWidgetId: state.selectedWidgetId,
    isDirty: state.isDirty,
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
  };
}
