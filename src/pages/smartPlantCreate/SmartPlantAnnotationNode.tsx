import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { AlignCenter, AlignLeft, AlignRight, Bold, Italic } from "lucide-react";
import { Handle, NodeResizer, Position, type Node, type NodeProps } from "@xyflow/react";
import Button from "@/components/common/Button";
import {
  DEFAULT_ANNOTATION_TEXT_STYLE,
  type AnnotationTextStyle,
  type SmartFlowData,
} from "./types";
import { renderAnnotationShape } from "./symbols";
import {
  addTableColumn,
  addTableRow,
  cellsToPipeText,
  getColumnWidthsPct,
  getTableCellsFromData,
  normalizePctWidths,
  normalizeRectangular,
  removeTableColumn,
  removeTableRow,
  syncColWidthsWithGrid,
} from "./annotationTable";

export const ANNOTATION_UPDATE_EVENT = "smart-plant-annotation-update";

type AnnotationShapeName = NonNullable<SmartFlowData["annotation_shape"]>;

function fitTableTextAreaHeight(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${Math.max(el.scrollHeight, 32)}px`;
}

const FULL_WIDTH_TEXT_SHAPES = new Set<AnnotationShapeName>([
  "label",
  "meter",
  "note",
  "table",
  "bullet_list",
  "numbered_list",
]);

const ICON_PLUS_CAPTION_SHAPES = new Set<AnnotationShapeName>([
  "breaker",
  "isolator",
  "ct",
  "fuse",
  "spd",
]);

function mergeTextStyle(s: AnnotationTextStyle | undefined) {
  return {
    fontSize: s?.fontSize ?? DEFAULT_ANNOTATION_TEXT_STYLE.fontSize,
    fontWeight: s?.fontWeight ?? DEFAULT_ANNOTATION_TEXT_STYLE.fontWeight,
    fontStyle: s?.fontStyle ?? DEFAULT_ANNOTATION_TEXT_STYLE.fontStyle,
    textAlign: s?.textAlign ?? DEFAULT_ANNOTATION_TEXT_STYLE.textAlign,
    color: s?.color,
    backgroundColor: s?.backgroundColor,
  };
}

function weightClass(w: AnnotationTextStyle["fontWeight"]): string {
  switch (w) {
    case "medium":
      return "font-medium";
    case "semibold":
      return "font-semibold";
    case "bold":
      return "font-bold";
    default:
      return "font-normal";
  }
}

function alignClass(a: AnnotationTextStyle["textAlign"]): string {
  switch (a) {
    case "center":
      return "text-center";
    case "right":
      return "text-right";
    default:
      return "text-left";
  }
}

export default function SmartPlantAnnotationNode({
  id,
  data,
  selected,
  height,
}: NodeProps<Node<SmartFlowData>>) {
  const [isEditing, setIsEditing] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

  const shape = data.annotation_shape ?? "breaker";
  const isDivider = shape === "divider";
  const fullWidthText = FULL_WIDTH_TEXT_SHAPES.has(shape);
  const iconPlusCaption = ICON_PLUS_CAPTION_SHAPES.has(shape);
  const style = useMemo(() => mergeTextStyle(data.annotation_text_style), [data.annotation_text_style]);

  useEffect(() => {
    if (isEditing && !isDivider && shape !== "table") {
      textAreaRef.current?.focus();
    }
  }, [isEditing, isDivider, shape]);

  const pushInlineUpdate = (
    patch: Partial<
      Pick<
        SmartFlowData,
        | "annotation_text"
        | "annotation_note"
        | "annotation_text_style"
        | "annotation_table_header_row"
        | "annotation_table_cells"
        | "annotation_table_col_widths_pct"
      >
    >,
  ) => {
    globalThis.window.dispatchEvent(
      new CustomEvent(ANNOTATION_UPDATE_EVENT, {
        detail: {
          nodeId: id,
          patch,
        },
      }),
    );
  };

  const tableCells = getTableCellsFromData(data);

  const commitTableCells = (next: string[][]) => {
    const normalized = normalizeRectangular(next);
    const colCountAfter = normalized[0]?.length ?? 1;
    pushInlineUpdate({
      annotation_table_cells: normalized,
      annotation_text: cellsToPipeText(normalized),
      annotation_table_col_widths_pct: syncColWidthsWithGrid(
        data.annotation_table_col_widths_pct,
        colCountAfter,
      ),
    });
  };

  const textStyleProps: CSSProperties = {
    fontSize: style.fontSize,
    fontWeight:
      style.fontWeight === "bold"
        ? 700
        : style.fontWeight === "semibold"
          ? 600
          : style.fontWeight === "medium"
            ? 500
            : 400,
    fontStyle: style.fontStyle,
    textAlign: style.textAlign,
    ...(style.color ? { color: style.color } : {}),
  };

  /** Same fill as the outer frame + toolbar ▮; inputs need this inline or they stay white (UA default). */
  const tableFillStyle: CSSProperties = {
    ...textStyleProps,
    ...(style.backgroundColor ? { backgroundColor: style.backgroundColor } : {}),
  };
  /** When no custom fill, match the wrapper’s default brand tint on every cell + input. */
  const tableTintClass = style.backgroundColor ? "" : "bg-brand-50/80 dark:bg-brand-500/10";

  const captionClass = `w-full min-w-0 whitespace-pre-wrap break-words ${weightClass(style.fontWeight)} ${
    style.fontStyle === "italic" ? "italic" : "not-italic"
  } ${alignClass(style.textAlign)} ${
    style.color ? "" : "text-neutral-800 dark:text-neutral-dark-100"
  }`;

  const hasText = Boolean(data.annotation_text?.trim());

  const tableRef = useRef<HTMLTableElement | null>(null);
  /** Bordered table frame — measured to sync React Flow node height to content (no empty band below). */
  const tableFrameRef = useRef<HTMLDivElement | null>(null);
  const lastEmittedTableHeightRef = useRef<number | null>(null);

  const colCount = tableCells[0]?.length ?? 1;
  const colWidthsStable = getColumnWidthsPct(data, colCount);
  const [previewColWidths, setPreviewColWidths] = useState<number[] | null>(null);
  const colWidthsRender = previewColWidths ?? colWidthsStable;

  useLayoutEffect(() => {
    if (shape !== "table") return;
    const root = tableRef.current;
    if (!root) return;
    root.querySelectorAll("textarea").forEach((el) => {
      fitTableTextAreaHeight(el as HTMLTextAreaElement);
    });
  }, [shape, tableCells, colWidthsRender, data.annotation_text_style]);

  /** Keep annotation node height equal to rendered table (removes extra bottom gap; width still from resize handles). */
  useLayoutEffect(() => {
    if (shape !== "table") {
      lastEmittedTableHeightRef.current = null;
      return;
    }
    const frame = tableFrameRef.current;
    if (!frame) return;

    const sync = () => {
      const h = frame.getBoundingClientRect().height;
      const rounded = Math.max(32, Math.ceil(h));
      if (lastEmittedTableHeightRef.current === rounded) return;
      const nodeH = typeof height === "number" ? height : undefined;
      if (nodeH !== undefined && Math.abs(nodeH - rounded) <= 1) {
        lastEmittedTableHeightRef.current = rounded;
        return;
      }
      lastEmittedTableHeightRef.current = rounded;
      globalThis.window.dispatchEvent(
        new CustomEvent(ANNOTATION_UPDATE_EVENT, {
          detail: {
            nodeId: id,
            patch: {},
            nodeStyle: { height: rounded },
          },
        }),
      );
    };

    sync();
    const ro = new ResizeObserver(() => sync());
    ro.observe(frame);
    return () => {
      ro.disconnect();
    };
  }, [shape, id, height, tableCells, colWidthsRender, data.annotation_text_style, data.annotation_table_header_row]);

  const onColResizePointerDown = (e: ReactPointerEvent, colIndex: number) => {
    if (colIndex >= colCount - 1) return;
    e.preventDefault();
    e.stopPropagation();
    const snapshot = [...colWidthsStable];
    let lastX = e.clientX;
    setPreviewColWidths(snapshot);
    const move = (ev: PointerEvent) => {
      const tableEl = tableRef.current;
      if (!tableEl) return;
      const tw = tableEl.getBoundingClientRect().width;
      if (tw < 16) return;
      const dx = ev.clientX - lastX;
      lastX = ev.clientX;
      const dpct = (dx / tw) * 100;
      const minPct = 4;
      setPreviewColWidths((prev) => {
        const w = [...(prev ?? snapshot)];
        let a = w[colIndex] + dpct;
        let b = w[colIndex + 1] - dpct;
        if (a < minPct) {
          b -= minPct - a;
          a = minPct;
        }
        if (b < minPct) {
          a -= minPct - b;
          b = minPct;
        }
        w[colIndex] = a;
        w[colIndex + 1] = b;
        return normalizePctWidths(w);
      });
    };
    const up = () => {
      globalThis.window.removeEventListener("pointermove", move);
      setPreviewColWidths((current) => {
        if (current) {
          pushInlineUpdate({
            annotation_table_col_widths_pct: normalizePctWidths(current),
          });
        }
        return null;
      });
    };
    globalThis.window.addEventListener("pointermove", move);
    globalThis.window.addEventListener("pointerup", up, { once: true });
  };

  const renderTypographyToolbar = () => {
    if (!selected || isDivider) return null;
    const sizes = [10, 12, 14] as const;
    const setStyle = (next: Partial<AnnotationTextStyle>) =>
      pushInlineUpdate({
        annotation_text_style: { ...data.annotation_text_style, ...next },
      });
    const btn =
      "h-7 shrink-0 min-h-0 px-1.5 text-[10px] shadow-sm transition-colors dark:border-neutral-dark-400";
    return (
      <div
        className="nodrag nopan absolute -top-[2.35rem] left-1/2 z-20 flex w-max max-w-[min(100vw-0.5rem,40rem)] -translate-x-1/2 flex-nowrap items-center gap-1 overflow-x-auto rounded-xl border border-brand-200/90 bg-gradient-to-b from-white to-neutral-50/95 px-2 py-1.5 text-[10px] shadow-[0_8px_30px_rgba(0,0,0,0.12)] ring-1 ring-black/5 backdrop-blur-sm dark:border-brand-500/30 dark:from-neutral-dark-100 dark:to-neutral-dark-100 dark:ring-white/10 [scrollbar-width:thin]"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <span className="select-none text-[9px] font-bold uppercase tracking-wide text-brand-600/90 dark:text-brand-300/90">
          Text
        </span>
        <div className="mx-0.5 h-5 w-px shrink-0 bg-neutral-200/90 dark:bg-neutral-dark-400" />
        <label
          className="flex shrink-0 cursor-pointer items-center gap-1 rounded-md bg-white/80 px-1 py-0.5 dark:bg-neutral-dark-200/80"
          title="Text color"
        >
          <span className="text-[9px] font-semibold text-neutral-500 dark:text-neutral-300">A</span>
          <input
            type="color"
            className="h-6 w-6 shrink-0 cursor-pointer rounded-md border border-neutral-200/80 p-0.5 shadow-inner dark:border-neutral-dark-400"
            value={style.color ?? "#1f2937"}
            onChange={(e) => setStyle({ color: e.target.value })}
          />
        </label>
        <label
          className="flex shrink-0 cursor-pointer items-center gap-1 rounded-md bg-white/80 px-1 py-0.5 dark:bg-neutral-dark-200/80"
          title="Background fill"
        >
          <span className="text-[9px] font-semibold text-neutral-500 dark:text-neutral-300">Fill</span>
          <input
            type="color"
            className="h-6 w-6 shrink-0 cursor-pointer rounded-md border border-neutral-200/80 p-0.5 shadow-inner dark:border-neutral-dark-400"
            value={style.backgroundColor ?? "#fef3c7"}
            onChange={(e) => setStyle({ backgroundColor: e.target.value })}
          />
        </label>
        <div className="mx-0.5 h-5 w-px shrink-0 bg-neutral-200/90 dark:bg-neutral-dark-400" />
        {sizes.map((sz) => (
          <Button
            key={sz}
            type="button"
            variant="secondary"
            className={`${btn} min-w-[1.75rem] ${
              style.fontSize === sz
                ? "border-brand-500 bg-brand-50 ring-1 ring-brand-400/40 dark:bg-brand-500/15"
                : ""
            }`}
            onClick={() => setStyle({ fontSize: sz })}
          >
            {sz}
          </Button>
        ))}
        <div className="mx-0.5 h-5 w-px shrink-0 bg-neutral-200/90 dark:bg-neutral-dark-400" />
        <Button
          type="button"
          variant="secondary"
          className={`${btn} ${style.fontWeight === "normal" ? "border-brand-500 bg-brand-50 ring-1 ring-brand-400/50 dark:bg-brand-500/15" : ""}`}
          onClick={() => setStyle({ fontWeight: "normal" })}
        >
          R
        </Button>
        <Button
          type="button"
          variant="secondary"
          className={`${btn} ${style.fontWeight === "medium" ? "border-brand-500 bg-brand-50 ring-1 ring-brand-400/50 dark:bg-brand-500/15" : ""}`}
          onClick={() => setStyle({ fontWeight: "medium" })}
        >
          M
        </Button>
        <Button
          type="button"
          variant="secondary"
          className={`${btn} ${style.fontWeight === "semibold" ? "border-brand-500 bg-brand-50 ring-1 ring-brand-400/50 dark:bg-brand-500/15" : ""}`}
          onClick={() => setStyle({ fontWeight: "semibold" })}
        >
          S
        </Button>
        <Button
          type="button"
          variant="secondary"
          className={`${btn} ${style.fontWeight === "bold" ? "border-brand-500 bg-brand-50 ring-1 ring-brand-400/50 dark:bg-brand-500/15" : ""}`}
          onClick={() => setStyle({ fontWeight: "bold" })}
        >
          <Bold className="h-2.5 w-2.5" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          className={`${btn} ${style.fontStyle === "italic" ? "border-brand-500 bg-brand-50 ring-1 ring-brand-400/50 dark:bg-brand-500/15" : ""}`}
          onClick={() =>
            setStyle({
              fontStyle: style.fontStyle === "italic" ? "normal" : "italic",
            })
          }
        >
          <Italic className="h-2.5 w-2.5" />
        </Button>
        <div className="mx-0.5 h-5 w-px shrink-0 bg-neutral-200/90 dark:bg-neutral-dark-400" />
        <Button
          type="button"
          variant="secondary"
          className={`${btn} ${style.textAlign === "left" ? "border-brand-500 bg-brand-50 ring-1 ring-brand-400/50 dark:bg-brand-500/15" : ""}`}
          onClick={() => setStyle({ textAlign: "left" })}
        >
          <AlignLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          className={`${btn} ${style.textAlign === "center" ? "border-brand-500 bg-brand-50 ring-1 ring-brand-400/50 dark:bg-brand-500/15" : ""}`}
          onClick={() => setStyle({ textAlign: "center" })}
        >
          <AlignCenter className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          className={`${btn} ${style.textAlign === "right" ? "border-brand-500 bg-brand-50 ring-1 ring-brand-400/50 dark:bg-brand-500/15" : ""}`}
          onClick={() => setStyle({ textAlign: "right" })}
        >
          <AlignRight className="h-3.5 w-3.5" />
        </Button>
        {shape === "table" ? (
          <>
            <div className="mx-0.5 h-5 w-px shrink-0 bg-neutral-200/90 dark:bg-neutral-dark-400" />
            <Button
              type="button"
              variant="secondary"
              className={`${btn} ${data.annotation_table_header_row ? "border-brand-500 bg-brand-50 ring-1 ring-brand-400/50 dark:bg-brand-500/15" : ""}`}
              title="First row as header"
              onClick={() =>
                pushInlineUpdate({
                  annotation_table_header_row: !data.annotation_table_header_row,
                })
              }
            >
              Hdr
            </Button>
            <Button
              type="button"
              variant="secondary"
              className={btn}
              title="Add row"
              onClick={() => commitTableCells(addTableRow(tableCells))}
            >
              +R
            </Button>
            <Button
              type="button"
              variant="secondary"
              className={btn}
              title="Add column"
              onClick={() => commitTableCells(addTableColumn(tableCells))}
            >
              +C
            </Button>
            <Button
              type="button"
              variant="secondary"
              className={btn}
              title="Remove last row"
              disabled={tableCells.length <= 1}
              onClick={() => commitTableCells(removeTableRow(tableCells))}
            >
              −R
            </Button>
            <Button
              type="button"
              variant="secondary"
              className={btn}
              title="Remove last column"
              disabled={(tableCells[0]?.length ?? 1) <= 1}
              onClick={() => commitTableCells(removeTableColumn(tableCells))}
            >
              −C
            </Button>
          </>
        ) : null}
      </div>
    );
  };

  const renderStructuredContent = (): ReactNode => {
    if (shape === "bullet_list") {
      const items = (data.annotation_text ?? "")
        .split(/\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (items.length === 0) {
        return <span className={captionClass}>One item per line</span>;
      }
      return (
        <ul
          className={`${captionClass} list-inside list-disc`}
          style={textStyleProps}
        >
          {items.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      );
    }
    if (shape === "numbered_list") {
      const items = (data.annotation_text ?? "")
        .split(/\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (items.length === 0) {
        return <span className={captionClass}>One item per line</span>;
      }
      return (
        <ol
          className={`${captionClass} list-inside list-decimal`}
          style={textStyleProps}
        >
          {items.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ol>
      );
    }
    return (
      <span className={captionClass} style={textStyleProps}>
        {data.annotation_text}
      </span>
    );
  };

  /** No max-height / overflow scroll — height follows wrapped text; user resizes the node if needed. */
  const tableTextareaClass =
    "nodrag nopan min-h-[2rem] min-w-0 w-full max-w-full resize-none overflow-hidden appearance-none border-0 bg-transparent p-1 text-[length:inherit] leading-snug outline-none [overflow-wrap:anywhere] break-words placeholder:text-neutral-400 focus:ring-1 focus:ring-brand-400 dark:placeholder:text-neutral-500";
  const tableCellClass =
    "min-w-[4.5rem] border border-neutral-200/80 px-0.5 py-0 align-top text-[length:inherit] dark:border-neutral-dark-400/80";
  const tableThClass = `${tableCellClass} font-semibold`;

  let textContent: ReactNode = null;
  if (isDivider) {
    textContent = null;
  } else if (shape === "table") {
    const useHeader = Boolean(data.annotation_table_header_row) && tableCells.length > 0;
    const headerRow = useHeader ? tableCells[0] : null;
    const bodyRows = useHeader ? tableCells.slice(1) : tableCells;
    textContent = (
      <div className="w-full min-w-0" style={textStyleProps}>
        <table
          ref={tableRef}
          className="w-full min-w-0 table-fixed border-collapse text-[length:inherit]"
        >
          <colgroup>
            {colWidthsRender.map((pct, ci) => (
              <col
                key={`col-${ci}`}
                style={{ width: `${pct}%`, minWidth: "4.5rem" }}
              />
            ))}
          </colgroup>
          {headerRow ? (
            <thead>
              <tr>
                {headerRow.map((cell, ci) => (
                  <th
                    key={`th-${ci}`}
                    className={`${tableThClass} ${tableTintClass}`}
                    style={tableFillStyle}
                  >
                    <div className="relative min-w-0">
                      <textarea
                        rows={1}
                        className={`${tableTextareaClass} ${tableTintClass}`}
                        style={tableFillStyle}
                        value={cell}
                        placeholder="Column name"
                        onPointerDown={(event) => event.stopPropagation()}
                        onMouseDown={(event) => event.stopPropagation()}
                        onInput={(event) => fitTableTextAreaHeight(event.currentTarget)}
                        onChange={(event) => {
                          const next = tableCells.map((row) => [...row]);
                          next[0][ci] = event.target.value;
                          commitTableCells(next);
                          requestAnimationFrame(() =>
                            fitTableTextAreaHeight(event.target as HTMLTextAreaElement),
                          );
                        }}
                      />
                      {ci < colCount - 1 ? (
                        <div
                          className="nodrag nopan absolute -right-1 top-0 z-20 h-full w-2 cursor-col-resize rounded-sm hover:bg-white/25"
                          aria-hidden
                          onPointerDown={(event) => onColResizePointerDown(event, ci)}
                        />
                      ) : null}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
          ) : null}
          <tbody>
            {bodyRows.map((row, ri) => {
              const rowIndex = useHeader ? ri + 1 : ri;
              return (
                <tr key={`tr-${rowIndex}`}>
                  {row.map((cell, ci) => (
                    <td
                      key={`td-${rowIndex}-${ci}`}
                      className={`${tableCellClass} ${tableTintClass}`}
                      style={tableFillStyle}
                    >
                      <div className="relative min-w-0">
                        <textarea
                          rows={1}
                          className={`${tableTextareaClass} ${tableTintClass}`}
                          style={tableFillStyle}
                          value={cell}
                          placeholder="Cell"
                          onPointerDown={(event) => event.stopPropagation()}
                          onMouseDown={(event) => event.stopPropagation()}
                          onInput={(event) => fitTableTextAreaHeight(event.currentTarget)}
                          onChange={(event) => {
                            const next = tableCells.map((r) => [...r]);
                            next[rowIndex][ci] = event.target.value;
                            commitTableCells(next);
                            requestAnimationFrame(() =>
                              fitTableTextAreaHeight(event.target as HTMLTextAreaElement),
                            );
                          }}
                        />
                        {ci < colCount - 1 ? (
                          <div
                            className="nodrag nopan absolute -right-1 top-0 z-20 h-full w-2 cursor-col-resize rounded-sm hover:bg-white/25"
                            aria-hidden
                            onPointerDown={(event) => onColResizePointerDown(event, ci)}
                          />
                        ) : null}
                      </div>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  } else if (isEditing) {
    const placeholder =
      shape === "bullet_list" || shape === "numbered_list"
        ? "One item per line"
        : shape === "note"
          ? "Type your note…"
          : "";
    textContent = (
      <textarea
        ref={textAreaRef}
        value={data.annotation_text ?? ""}
        onBlur={() => setIsEditing(false)}
        onPointerDown={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onChange={(event) =>
          pushInlineUpdate({
            annotation_text: event.target.value,
          })
        }
        rows={shape === "note" ? 5 : 3}
        placeholder={placeholder}
        className="w-full min-h-[3rem] resize-y border-0 bg-transparent p-0 text-inherit outline-none placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
        style={textStyleProps}
      />
    );
  } else if (hasText) {
    if (shape === "bullet_list" || shape === "numbered_list") {
      textContent = (
        <div
          className="w-full cursor-text text-left"
          role="presentation"
          onClick={() => setIsEditing(true)}
        >
          {renderStructuredContent()}
        </div>
      );
    } else {
      textContent = (
        <div
          className="w-full cursor-text text-left"
          style={textStyleProps}
          role="presentation"
          onClick={() => setIsEditing(true)}
        >
          <span className={captionClass}>{data.annotation_text}</span>
        </div>
      );
    }
  } else if (fullWidthText) {
    textContent = (
      <span
        className={`${captionClass} text-brand-500/80 dark:text-brand-300/80`}
        style={textStyleProps}
      >
        {shape === "meter"
          ? "Meter text"
          : shape === "label"
            ? "Label text"
            : shape === "bullet_list" || shape === "numbered_list"
              ? "One item per line"
              : "Text note"}
      </span>
    );
  }

  const handleClass = "!h-2.5 !w-2.5 !border-2 !border-white !bg-brand-500";

  const sideCaption =
    iconPlusCaption && !isDivider ? (
      <div className="min-w-[40px] max-w-[220px] flex-1">
        {isEditing ? (
          <textarea
            ref={textAreaRef}
            value={data.annotation_text ?? ""}
            onBlur={() => setIsEditing(false)}
            onPointerDown={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
            onChange={(event) =>
              pushInlineUpdate({
                annotation_text: event.target.value,
              })
            }
            rows={3}
            className={`w-full resize-y border-0 bg-transparent p-0 text-xs outline-none ${captionClass}`}
            style={textStyleProps}
          />
        ) : hasText ? (
          <div
            className={`w-full cursor-text text-left ${captionClass}`}
            style={textStyleProps}
            role="presentation"
            onClick={() => setIsEditing(true)}
          >
            {data.annotation_text}
          </div>
        ) : (
          <div
            className="cursor-text text-left text-xs text-brand-500/70 dark:text-brand-300/70"
            style={textStyleProps}
            role="presentation"
            onClick={() => setIsEditing(true)}
          >
            Caption…
          </div>
        )}
      </div>
    ) : null;

  return (
    <div
      className={`relative flex ${shape === "table" ? "gap-0" : "gap-2"} ${
        shape === "table"
          ? "h-auto w-full min-h-0 min-w-[80px] items-start"
          : `h-full w-full items-center ${isDivider ? "min-h-[12px] min-w-[64px]" : "min-h-[44px] min-w-[72px]"}`
      } ${selected ? "opacity-100" : "opacity-95"}`}
    >
      <Handle type="target" id="t-top" position={Position.Top} className={handleClass} />
      <Handle type="target" id="t-left" position={Position.Left} className={handleClass} />
      <Handle type="target" id="t-right" position={Position.Right} className={handleClass} />
      <Handle type="target" id="t-bottom" position={Position.Bottom} className={handleClass} />
      <Handle type="source" id="s-left" position={Position.Left} className={handleClass} />
      <Handle type="source" id="s-top" position={Position.Top} className={handleClass} />
      <Handle type="source" id="s-right" position={Position.Right} className={handleClass} />
      <Handle type="source" id="s-bottom" position={Position.Bottom} className={handleClass} />
      {renderTypographyToolbar()}
      <NodeResizer
        isVisible={selected}
        minWidth={isDivider ? 48 : shape === "table" ? 80 : 40}
        minHeight={isDivider ? 8 : shape === "table" ? 32 : 36}
        lineStyle={{ borderColor: "#e97124" }}
        handleStyle={{
          width: 8,
          height: 8,
          borderRadius: 999,
          border: "1px solid #e97124",
          background: "#fff",
        }}
      />
      {isDivider ? (
        <div className="h-px w-full bg-neutral-400 dark:bg-neutral-500" />
      ) : fullWidthText ? (
        <div
          ref={shape === "table" ? tableFrameRef : undefined}
          className={`flex cursor-text items-start rounded border border-brand-500/60 text-left ${
            shape === "table"
              ? "box-border h-auto w-full min-w-0 flex-col overflow-x-auto overflow-y-visible p-0"
              : "h-full min-h-[36px] w-full px-2 py-1"
          } ${style.backgroundColor ? "" : "bg-brand-50/80 dark:bg-brand-500/10"}`}
          style={{
            ...(style.backgroundColor ? { backgroundColor: style.backgroundColor } : {}),
          }}
          role="presentation"
          onClick={() => {
            if (shape === "table") return;
            if (!isEditing) setIsEditing(true);
          }}
        >
          {shape === "table" ? (
            textContent
          ) : (
            <div className="w-full">{textContent}</div>
          )}
        </div>
      ) : (
        <>
          <button
            type="button"
            className="flex h-full min-h-[36px] min-w-[36px] shrink-0 items-center justify-center"
            onClick={() => setIsEditing(true)}
          >
            {renderAnnotationShape(shape)}
          </button>
          {sideCaption}
        </>
      )}
    </div>
  );
}
