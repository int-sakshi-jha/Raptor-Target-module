import React from "react";
import TableRowActions, {
  type RowActionItem,
  type RowActionVariant,
} from "./TableRowActions";
import { hasPermission } from "@/utils/permissions";


const getColumnWidthStorageKey = (entityKey: string) =>
  `${entityKey}TableColumnWidths`;

export const resetSavedActionsColumnWidth = (
  entityKey: string,
  field = "id",
) => {
  if (!entityKey || typeof window === "undefined") return false;

  try {
    const storageKey = getColumnWidthStorageKey(entityKey);
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return false;

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!(field in parsed)) return false;

    delete parsed[field];
    window.localStorage.setItem(storageKey, JSON.stringify(parsed));
    return true;
  } catch {
    // Ignore malformed persisted state and continue with current defaults.
    return false;
  }
};

type GridRendererParams<TData, TContext> = {
  data?: TData;
  context?: TContext;
};

export const createContextRowActionsCellRenderer = <
  TData,
  TContext extends Record<string, unknown> = Record<string, unknown>,
>({
  className = "py-1",
  getItems,
}: {
  className?: string;
  getItems: (args: {
    data: TData;
    context: TContext;
    userPermissions?: string[];
    params: GridRendererParams<TData, TContext>;
  }) => RowActionItem[] | null | undefined;
}) => {
  return (rawParams: unknown) => {
    const params = (rawParams ?? {}) as GridRendererParams<TData, TContext>;
    const data = params.data;
    if (!data) return null;

    const context = (params.context ?? {}) as TContext;
    const userPermissions = context.userPermissions as string[] | undefined;
    const items = getItems({ data, context, userPermissions, params }) ?? [];

    if (items.length === 0) return null;

    return <TableRowActions className={className} items={items} />;
  };
};

export type CrudActionConfig<
  TData,
  TContext extends Record<string, unknown> = Record<string, unknown>,
> = {
  key: string;
  contextKey: string;
  permission?: string | string[];
  icon: React.ReactNode;
  label: string | ((data: TData) => string);
  variant?:
    | RowActionVariant
    | ((data: TData) => RowActionVariant);
  show?: (args: {
    data: TData;
    context: TContext;
    userPermissions?: string[];
  }) => boolean;
  getArgs?: (data: TData) => unknown[];
  cooldownMs?: number;

  disableClickGuard?: boolean;
};

const DEFAULT_ACTION_COOLDOWN_MS = 800;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : null;

const resolveRowIdentity = (value: unknown): string | null => {
  if (value == null) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  const obj = asRecord(value);
  if (!obj) return null;
  const id = obj.id ?? obj.uuid ?? obj._id;
  if (
    id != null &&
    (typeof id === "string" || typeof id === "number" || typeof id === "boolean")
  ) {
    return String(id);
  }
  return null;
};

export const createCrudRowActionsCellRenderer = <
  TData,
  TContext extends Record<string, unknown> = Record<string, unknown>,
>({
  className = "py-1",
  actions,
}: {
  className?: string;
  actions: CrudActionConfig<TData, TContext>[];
}) =>
  createContextRowActionsCellRenderer<TData, TContext>({
    className,
    getItems: ({ data, context, userPermissions }) =>
      actions.map((action): RowActionItem => {
        const contextHandler = context[action.contextKey] as
          | ((...args: unknown[]) => void)
          | undefined;
        const guardState = (() => {
          const anyContext = context as Record<string, unknown>;
          const key = "__crudActionGuardState";
          const existing = anyContext[key];
          if (existing && typeof existing === "object") {
            return existing as {
              inFlight: Set<string>;
              lastRunAt: Map<string, number>;
            };
          }
          const created = {
            inFlight: new Set<string>(),
            lastRunAt: new Map<string, number>(),
          };
          anyContext[key] = created;
          return created;
        })();

        return {
          key: action.key,
          label:
            typeof action.label === "function"
              ? action.label(data)
              : action.label,
          icon: action.icon,
          variant:
            typeof action.variant === "function"
              ? action.variant(data)
              : (action.variant ?? "neutral"),
          show:
            action.show?.({ data, context, userPermissions }) ??
            (action.permission
              ? hasPermission(userPermissions, action.permission)
              : true),
          onClick: (event) => {
            event.stopPropagation();
            const args = action.getArgs?.(data) ?? [data];
            if (action.disableClickGuard) {
              contextHandler?.(...args);
              return;
            }

            const rowId =
              resolveRowIdentity(args[0]) ??
              resolveRowIdentity(data) ??
              "unknown";
            const guardKey = `${action.contextKey}:${action.key}:${rowId}`;
            const cooldownMs = Math.max(0, action.cooldownMs ?? DEFAULT_ACTION_COOLDOWN_MS);
            const now = Date.now();
            const lastRunAt = guardState.lastRunAt.get(guardKey) ?? 0;

            // Block repeated rapid clicks and any click while an async action is in flight.
            if (guardState.inFlight.has(guardKey) || now - lastRunAt < cooldownMs) {
              return;
            }

            guardState.lastRunAt.set(guardKey, now);
            const result = contextHandler?.(...args);
            if (result && typeof (result as PromiseLike<unknown>).then === "function") {
              guardState.inFlight.add(guardKey);
              void Promise.resolve(result).finally(() => {
                guardState.inFlight.delete(guardKey);
                guardState.lastRunAt.set(guardKey, Date.now());
              });
            }
          },
        };
      }),
  });
