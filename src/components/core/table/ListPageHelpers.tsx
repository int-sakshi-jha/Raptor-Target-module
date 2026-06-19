import { Link } from "react-router-dom";
import { dateTimeFormatter, formateDateTime, dateFormatter } from "@/utils/gridFormatters";
import type { CommonColumnConfig } from "./CommonTable";
import type { ValueFormatterParams } from "@ag-grid-community/core";
import { boolCellRenderer } from "@/utils/agGridCellRenderers";
import ColorBadge from "@/components/common/ColorBadge";

// --- Base Types ---
type CellRendererParams = {
  value?: any;
  data?: any;
};

const entityLinkClass =
  "text-brand-700 dark:text-brand-400 hover:underline font-medium";

const renderTextCell = (params: CellRendererParams) => params.value || "-";
const renderCapitalizedTextCell = (params: CellRendererParams) => {
  const value = params.value;
  if (value == null || value === "") return "-";
  return <span className="capitalize">{String(value).replaceAll("_", " ")}</span>;
};
const renderNumberCell = (params: CellRendererParams) => params.value ?? "-";

const defaultBooleanFilterParams = {
  values: [true, false],
  valueFormatter: (params: ValueFormatterParams<boolean>) =>
    params.value ? "Yes" : "No",
};

const activeBooleanFilterParams = {
  values: [true, false],
  valueFormatter: (params: ValueFormatterParams<boolean>) =>
    params.value ? "Active" : "Inactive",
};

// --- Date Helpers ---

export const getDateColumn = (
  field: string,
  headerName: string,
  options: Partial<CommonColumnConfig> & { dateOnly?: boolean } = {}
): CommonColumnConfig => {
  const { dateOnly = false, ...rest } = options;

  return {
    field,
    headerName,
    minWidth: 200,
    filter: "agDateColumnFilter",
    filterValueGetter: (params: any) => {
      const value = params.data?.[field];
      return value ? new Date(value) : null;
    },
    visible: true,
    filterParams: {
      comparator: (filterLocalDateAtMidnight: Date, cellValue: string) => {
        if (!cellValue) return -1;
        const cellDate = new Date(cellValue);
        const cellDateOnly = new Date(
          cellDate.getFullYear(),
          cellDate.getMonth(),
          cellDate.getDate()
        );
        if (cellDateOnly < filterLocalDateAtMidnight) return -1;
        if (cellDateOnly > filterLocalDateAtMidnight) return 1;
        return 0;
      },
    },
    valueFormatter: (params: ValueFormatterParams) => {
      if (!params.value) return "-";
      return dateOnly
        ? dateFormatter({ value: params.value } as ValueFormatterParams)
        : dateTimeFormatter({ value: params.value } as ValueFormatterParams);
    },
    ...rest,
  };
};

export const buildDateColumn = getDateColumn;

export function buildDateTimeAuditColumn({
  field,
  headerName,
  visible = false,
  minWidth = 200,
}: {
  field: string;
  headerName: string;
  visible?: boolean;
  minWidth?: number;
}): CommonColumnConfig {
  return {
    field,
    headerName,
    visible,
    minWidth,
    filter: "agDateColumnFilter",
    valueGetter: (params: any) => {
      const val = params.data?.[field];
      return val ? new Date(val) : null;
    },
    cellRenderer: (params: CellRendererParams) =>
      params.value ? formateDateTime(params.value) : "-",
  };
}

// --- Text & Number Helpers ---

export function buildTextColumn(
  field: string,
  headerName: string,
  options: Partial<CommonColumnConfig> = {}
): CommonColumnConfig {
  return {
    field,
    headerName,
    visible: true,
    minWidth: 160,
    filter: "agTextColumnFilter",
    ...options,
  };
}

export const getTextColumn = buildTextColumn;

export function buildDisplayTextColumn(
  field: string,
  headerName: string,
  options: Partial<CommonColumnConfig> = {}
): CommonColumnConfig {
  return buildTextColumn(field, headerName, {
    cellRenderer: renderTextCell,
    ...options,
  });
}

export const getDisplayTextColumn = buildDisplayTextColumn;

export function buildCapitalizedDisplayTextColumn(
  field: string,
  headerName: string,
  options: Partial<CommonColumnConfig> = {}
): CommonColumnConfig {
  return buildTextColumn(field, headerName, {
    cellRenderer: renderCapitalizedTextCell,
    ...options,
  });
}

export const getCapitalizedDisplayTextColumn = buildCapitalizedDisplayTextColumn;

export function getRendererColumn(
  field: string,
  headerName: string,
  cellRenderer: NonNullable<CommonColumnConfig["cellRenderer"]>,
  options: Partial<CommonColumnConfig> = {}
): CommonColumnConfig {
  return buildTextColumn(field, headerName, {
    cellRenderer,
    ...options,
  });
}

export function buildDerivedTextColumn({
  field,
  headerName,
  valueGetter,
  ...options
}: {
  field: string;
  headerName: string;
  valueGetter: NonNullable<CommonColumnConfig["valueGetter"]>;
} & Partial<CommonColumnConfig>): CommonColumnConfig {
  return buildTextColumn(field, headerName, {
    valueGetter,
    cellRenderer: renderTextCell,
    ...options,
  });
}

export function getDerivedTextColumn(
  field: string,
  headerName: string,
  valueGetter: NonNullable<CommonColumnConfig["valueGetter"]>,
  options: Partial<CommonColumnConfig> = {}
): CommonColumnConfig {
  return buildTextColumn(field, headerName, {
    valueGetter,
    cellRenderer: renderTextCell,
    ...options,
  });
}

export function buildLinkColumn({
  field,
  headerName,
  getHref,
  valueGetter,
  emptyValue = "-",
  ...options
}: {
  field: string;
  headerName: string;
  getHref: (params: CellRendererParams) => string | null | undefined;
  valueGetter?: NonNullable<CommonColumnConfig["valueGetter"]>;
  emptyValue?: string;
} & Partial<CommonColumnConfig>): CommonColumnConfig {
  return buildTextColumn(field, headerName, {
    valueGetter,
    cellRenderer: (params: CellRendererParams) => {
      const label = params.value || emptyValue;
      const href = getHref(params);
      if (!href || label === emptyValue) return label;
      return (
        <Link to={href} className={entityLinkClass}>
          {String(label)}
        </Link>
      );
    },
    ...options,
  });
}

export function getLinkColumn(
  field: string,
  headerName: string,
  getHref: (params: CellRendererParams) => string | null | undefined,
  options: Partial<CommonColumnConfig> & {
    valueGetter?: NonNullable<CommonColumnConfig["valueGetter"]>;
    emptyValue?: string;
  } = {}
): CommonColumnConfig {
  const { valueGetter, emptyValue = "-", ...rest } = options;

  return buildTextColumn(field, headerName, {
    valueGetter,
    cellRenderer: (params: CellRendererParams) => {
      const label = params.value || emptyValue;
      const href = getHref(params);
      if (!href || label === emptyValue) return label;
      return (
        <Link to={href} className={entityLinkClass}>
          {String(label)}
        </Link>
      );
    },
    ...rest,
  });
}

export function buildNumberColumn(
  field: string,
  headerName: string,
  options: Partial<CommonColumnConfig> = {}
): CommonColumnConfig {
  return {
    field,
    headerName,
    visible: true,
    minWidth: 130,
    filter: "agNumberColumnFilter",
    valueGetter: (params: any) => {
      const val = params.data?.[field];
      return val != null && val !== "" ? Number(val) : null;
    },
    ...options,
  };
}

export const getNumberColumn = buildNumberColumn;

export function buildDisplayNumberColumn(
  field: string,
  headerName: string,
  options: Partial<CommonColumnConfig> = {}
): CommonColumnConfig {
  return buildNumberColumn(field, headerName, {
    cellRenderer: renderNumberCell,
    ...options,
  });
}

export const getDisplayNumberColumn = buildDisplayNumberColumn;

export function buildBooleanColumn({
  field,
  headerName,
  filterParams,
  cellRenderer = boolCellRenderer,
  minWidth = 120,
  visible = true,
  ...options
}: {
  field: string;
  headerName: string;
  filterParams?: Record<string, unknown>;
  cellRenderer?: NonNullable<CommonColumnConfig["cellRenderer"]>;
  minWidth?: number;
  visible?: boolean;
} & Partial<CommonColumnConfig>): CommonColumnConfig {
  return {
    field,
    headerName,
    visible,
    minWidth,
    filter: "agSetColumnFilter",
    filterParams: {
      ...defaultBooleanFilterParams,
      ...filterParams,
    },
    cellRenderer,
    ...options,
  };
}

export function getBooleanColumn(
  field: string,
  headerName: string,
  options: {
    filterParams?: Record<string, unknown>;
    cellRenderer?: NonNullable<CommonColumnConfig["cellRenderer"]>;
    minWidth?: number;
    visible?: boolean;
  } & Partial<CommonColumnConfig> = {}
): CommonColumnConfig {
  const {
    filterParams,
    cellRenderer = boolCellRenderer,
    minWidth = 120,
    visible = true,
    ...rest
  } = options;

  return {
    field,
    headerName,
    visible,
    minWidth,
    filter: "agSetColumnFilter",
    filterParams: {
      ...defaultBooleanFilterParams,
      ...filterParams,
    },
    cellRenderer,
    ...rest,
  };
}

export function getActiveStatusColumn(
  field = "is_active",
  headerName = "Active",
  options: {
    minWidth?: number;
    visible?: boolean;
    falseVariant?: "gray" | "green" | "blue" | "orange" | "yes" | "no";
    trueLabel?: string;
    falseLabel?: string;
    fallbackValue?: boolean;
    badgeClassName?: string;
  } & Partial<CommonColumnConfig> = {}
): CommonColumnConfig {
  const {
    minWidth = 100,
    visible = true,
    falseVariant = "gray",
    trueLabel = "Active",
    falseLabel = "Inactive",
    fallbackValue,
    badgeClassName,
    ...rest
  } = options;

  return {
    field,
    headerName,
    visible,
    minWidth,
    filter: "agSetColumnFilter",
    filterParams: activeBooleanFilterParams,
    cellRenderer: (params: CellRendererParams) => {
      const rawValue = params.value;
      if (rawValue == null && fallbackValue == null) return "-";
      const isActive = rawValue != null ? Boolean(rawValue) : fallbackValue;
      return (
        <ColorBadge
          variant={isActive ? "green" : falseVariant}
          className={badgeClassName}
        >
          {isActive ? trueLabel : falseLabel}
        </ColorBadge>
      );
    },
    ...rest,
  };
}

// --- Audit/User Helpers ---

export function buildLinkedUserNameAuditColumn({
  field,
  headerName,
  idField,
  visible = false,
  minWidth = 200,
}: {
  field: string;
  headerName: string;
  idField: string;
  visible?: boolean;
  minWidth?: number;
}): CommonColumnConfig {
  return {
    field,
    headerName,
    visible,
    minWidth,
    filter: "agTextColumnFilter",
    valueGetter: (params: any) =>
      params.data?.[field] || params.data?.[idField] || "",
    cellRenderer: (params: CellRendererParams) => {
      const userId = params.data?.[idField];
      const label = params.value || "-";
      if (!userId || label === "-") return label;
      return (
        <Link
          to={`/users/${String(userId)}/profile`}
          className={entityLinkClass}
        >
          {String(label)}
        </Link>
      );
    },
  };
}

export function getLinkedUserNameAuditColumn(
  field: string,
  headerName: string,
  idField: string,
  options: {
    visible?: boolean;
    minWidth?: number;
  } = {}
): CommonColumnConfig {
  const { visible = false, minWidth = 200 } = options;

  return {
    field,
    headerName,
    visible,
    minWidth,
    filter: "agTextColumnFilter",
    valueGetter: (params: any) =>
      params.data?.[field] || params.data?.[idField] || "",
    cellRenderer: (params: CellRendererParams) => {
      const userId = params.data?.[idField];
      const label = params.value || "-";
      if (!userId || label === "-") return label;
      return (
        <Link to={`/users/${String(userId)}/profile`} className={entityLinkClass}>
          {String(label)}
        </Link>
      );
    },
  };
}

// --- Actions Column Builder ---

export function getActionsColumn(
  cellRenderer: CommonColumnConfig["cellRenderer"],
  options: { width?: number } = {},
): CommonColumnConfig {
  const w = options.width ?? 140;
  return {
    field: "id",
    headerName: "Action",
    visible: true,
    width: w,
    minWidth: w,
    maxWidth: w,
    resizable: false,
    cellRenderer,
    filter: false,
    pinned: "right",
    sortable: false,
  };
}
