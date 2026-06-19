import type { ReactNode } from "react";
import {
  CircleDot,
  FileText,
  Gauge,
  List,
  ListOrdered,
  Minus,
  ShieldAlert,
  Table2,
  Tag,
  Zap,
} from "lucide-react";

export type AnnotationShape =
  | "breaker"
  | "isolator"
  | "ct"
  | "meter"
  | "fuse"
  | "spd"
  | "label"
  | "note"
  | "table"
  | "bullet_list"
  | "numbered_list"
  | "divider";

/** Symbols that can be dropped onto a connector line (electrical icons only). */
export type EdgeAttachableSymbol =
  | "breaker"
  | "isolator"
  | "ct"
  | "meter"
  | "fuse"
  | "spd";

export const SYMBOL_DRAG_MIME = "application/x-smart-plant-symbol";
export const EDGE_SYMBOL_DROP_EVENT = "smart-plant-edge-symbol-drop";

export const isEdgeAttachableSymbol = (
  shape: AnnotationShape,
): shape is EdgeAttachableSymbol => {
  switch (shape) {
    case "breaker":
    case "isolator":
    case "ct":
    case "meter":
    case "fuse":
    case "spd":
      return true;
    default:
      return false;
  }
};

export const ANNOTATION_SYMBOL_OPTIONS: Array<{
  shape: AnnotationShape;
  label: string;
}> = [
  { shape: "breaker", label: "Breaker" },
  { shape: "isolator", label: "Isolator" },
  { shape: "ct", label: "CT Core" },
  { shape: "meter", label: "Meter" },
  { shape: "fuse", label: "Fuse" },
  { shape: "spd", label: "SPD" },
  { shape: "label", label: "Label" },
];

export const ANNOTATION_TEXT_OPTIONS: Array<{
  shape: AnnotationShape;
  label: string;
}> = [
  { shape: "note", label: "" },
  { shape: "table", label: "" },
  { shape: "bullet_list", label: "" },
  { shape: "numbered_list", label: "" },
  { shape: "divider", label: "" },
];

/** Full list for inspector dropdowns (symbols + text blocks). */
export const ANNOTATION_ALL_OPTIONS = [
  ...ANNOTATION_SYMBOL_OPTIONS,
  ...ANNOTATION_TEXT_OPTIONS,
];

export const renderElectricalSymbolSwatch = (
  symbol: EdgeAttachableSymbol,
  size = 14,
) => {
  const px = String(size);
  if (symbol === "breaker") {
    return (
      <svg
        viewBox="0 0 24 24"
        width={px}
        height={px}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
      >
        <path d="M12 2v20" />
        <path d="M7 14l10-4" />
      </svg>
    );
  }
  if (symbol === "isolator") {
    return (
      <svg
        viewBox="0 0 24 24"
        width={px}
        height={px}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
      >
        <path d="M12 3v18" />
        <path d="M5 16l14-8" />
      </svg>
    );
  }
  if (symbol === "ct") {
    return (
      <svg
        viewBox="0 0 24 24"
        width={px}
        height={px}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
      >
        <circle cx="12" cy="12" r="7" />
        <circle cx="12" cy="12" r="2.4" />
      </svg>
    );
  }
  if (symbol === "meter") {
    return (
      <svg
        viewBox="0 0 24 24"
        width={px}
        height={px}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
      >
        <path d="M4 16a8 8 0 1 1 16 0v3H4z" />
        <path d="M12 12l3-3" />
      </svg>
    );
  }
  if (symbol === "fuse") {
    return (
      <svg
        viewBox="0 0 24 24"
        width={px}
        height={px}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
      >
        <path d="M4 12h5l2-4 2 8 2-4h5" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      width={px}
      height={px}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
    >
      <path d="M12 2v8" />
      <path d="M12 13v9" />
      <path d="M8 9l8 6" />
      <path d="M16 9l-8 6" />
    </svg>
  );
};

export const renderAnnotationPaletteIcon = (
  shape: AnnotationShape,
  size = 14,
): ReactNode => {
  const iconClass = size >= 20 ? "h-5 w-5" : size === 14 ? "h-3.5 w-3.5" : "h-4 w-4";
  if (isEdgeAttachableSymbol(shape)) {
    return renderElectricalSymbolSwatch(shape, size);
  }
  switch (shape) {
    case "label":
      return <Tag className={iconClass} />;
    case "note":
      return <FileText className={iconClass} />;
    case "table":
      return <Table2 className={iconClass} />;
    case "bullet_list":
      return <List className={iconClass} />;
    case "numbered_list":
      return <ListOrdered className={iconClass} />;
    case "divider":
      return <Minus className={iconClass} />;
    default:
      return null;
  }
};

export const renderEdgeSymbolIcon = (
  symbol: EdgeAttachableSymbol | "none",
): ReactNode => {
  switch (symbol) {
    case "breaker":
    case "isolator":
      return renderElectricalSymbolSwatch(symbol, 12);
    case "ct":
      return <CircleDot className="h-3 w-3" />;
    case "meter":
      return <Gauge className="h-3 w-3" />;
    case "fuse":
      return <Zap className="h-3 w-3" />;
    case "spd":
      return <ShieldAlert className="h-3 w-3" />;
    default:
      return null;
  }
};

export const renderAnnotationShape = (
  shape: AnnotationShape | undefined,
): ReactNode => {
  if (shape === "label") {
    return (
      <div className="flex h-6 min-w-9 items-center justify-center rounded border border-brand-500 bg-brand-50 px-2 text-xs font-semibold uppercase text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
        <Tag className="h-3.5 w-3.5" />
      </div>
    );
  }

  if (shape === "breaker" || !shape) {
    return (
      <div className="relative h-10 w-10 text-brand-500 dark:text-brand-300">
        <svg
          viewBox="0 0 40 40"
          className="h-full w-full fill-none stroke-current"
          strokeWidth="2"
        >
          <path d="M20 4V36" />
          <path d="M11 24L29 16" />
        </svg>
      </div>
    );
  }

  if (isEdgeAttachableSymbol(shape) && shape !== "breaker") {
    return (
      <div className="relative z-10 flex h-10 w-10 items-center justify-center text-brand-500 dark:text-brand-300">
        {renderElectricalSymbolSwatch(shape, 24)}
      </div>
    );
  }

  return (
    <div className="relative z-10 flex h-10 w-10 items-center justify-center text-brand-500 dark:text-brand-300">
      {renderAnnotationPaletteIcon(shape, 24)}
    </div>
  );
};
