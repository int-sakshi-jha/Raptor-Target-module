import { Edit, Power, Trash2, RefreshCw } from "lucide-react";
import { type CrudActionConfig } from "@/components/core/table/TableRenderers";

/**
 * Common builder for an "Edit" row action.
 */
export const buildEditRowAction = <TData, TContext extends Record<string, unknown>>(
  contextKey: string,
  permission?: string | string[],
  config?: Partial<CrudActionConfig<TData, TContext>>,
): CrudActionConfig<TData, TContext> => ({
  key: "edit",
  contextKey,
  permission,
  label: "Edit",
  icon: <Edit className="w-4 h-4" />,
  variant: "brand",
  getArgs: (data: TData) => [data],
  ...config,
});

/**
 * Common builder for a "Delete" row action.
 * Usually passes data.id to the context handler.
 */
export const buildDeleteRowAction = <
  TData extends { id: string },
  TContext extends Record<string, unknown>,
>(
  contextKey: string,
  permission?: string | string[],
  config?: Partial<CrudActionConfig<TData, TContext>>,
): CrudActionConfig<TData, TContext> => ({
  key: "delete",
  contextKey,
  permission,
  label: "Delete",
  icon: <Trash2 className="w-4 h-4" />,
  variant: "danger",
  getArgs: (data: TData) => [data.id],
  ...config,
});

/**
 * Common builder for a "Toggle Status" row action (e.g., Activate/Deactivate).
 */
export const buildToggleStatusRowAction = <
  TData extends { is_active?: boolean | null },
  TContext extends Record<string, unknown>,
>(
  contextKey: string,
  permission?: string | string[],
  config?: Partial<CrudActionConfig<TData, TContext>>,
): CrudActionConfig<TData, TContext> => ({
  key: "toggle",
  contextKey,
  permission,
  label: (data: TData) => (data.is_active ? "Deactivate" : "Activate"),
  icon: <Power className="w-4 h-4" />,
  variant: (data: TData) => (data.is_active ? "success" : "neutral"),
  getArgs: (data: TData) => [data],
  ...config,
});


export const buildReplaceRowAction = <
  TData extends { id: string },
  TContext extends Record<string, unknown>,
>(
  contextKey: string,
  permission?: string | string[],
  config?: Partial<CrudActionConfig<TData, TContext>>,
): CrudActionConfig<TData, TContext> => ({
  key: "replace",
  contextKey,
  permission,
  label: "Replace",
  icon: <RefreshCw className="w-4 h-4" />,
  variant: "success",
  getArgs: (data: TData) => [data.id],
  ...config,
});
