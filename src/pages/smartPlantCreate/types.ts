import type { ComponentKindSlug, PHASE_TYPE, STATUS } from "./constants";
import type { AnnotationShape } from "./symbols";

export type NodeShapeStyle =
  | "rounded"
  | "square"
  | "circle"
  | "diamond"
  | "triangle"
  | "triangle_down"
  | "pill"
  | "hexagon"
  | "octagon"
  | "parallelogram"
  | "line";

/** Typography for annotation / text blocks (stored on `SmartFlowData`). */
export type AnnotationTextStyle = {
  fontSize?: number;
  fontWeight?: "normal" | "medium" | "semibold" | "bold";
  fontStyle?: "normal" | "italic";
  textAlign?: "left" | "center" | "right";
  /** Text color (CSS color). */
  color?: string;
  /** Background fill for text/table area. */
  backgroundColor?: string;
};

export const DEFAULT_ANNOTATION_TEXT_STYLE: AnnotationTextStyle = {
  fontSize: 12,
  fontWeight: "normal",
  fontStyle: "normal",
  textAlign: "left",
};

/** Per-node draft fields aligned with create-component payload (minus plant_id resolved at submit). */
export type NodeDraftFields = {
    component_name: string;
    component_code: string;
    component_label?: string;
    serial_number?: string;
    display_order?: number | null;
    device_id?: string | null;
    device_name?: string | null;
    inverter_type_id?: string | null;
    /** Display label for inverter type (board / inspector). */
    inverter_type_name?: string | null;
    tag_template_id?: string | null;
    tag_template_name?: string | null;
    vd_number?: number | null;
    ac_capacity_kw?: number | null;
    dc_capacity_kw?: number | null;
    brand?: string;
    model?: string;
    mppt_count?: number | null;
    strings_per_mppt?: number | null;
    phase_type?: PHASE_TYPE;
    module_count?: number | null;
    string_length?: number | null;
    ct_ratio?: number | null;
    rating_a?: number | null;
    channels?: number | null;
    area_sqm?: number | null;
    warranty_start_date?: string | null;
    warranty_end_date?: string | null;
    is_active?: boolean;
    status?: STATUS;
};

/** React Flow node `data` payload (avoid name clash with Flow `Node`). */
export type SmartFlowData = {
    kind: ComponentKindSlug;
    draft: NodeDraftFields;
    nodeShape?: NodeShapeStyle;
    /** Optional fill for component node body (board only). */
    node_fill_color?: string;
    /** Optional title text color (board only). */
    node_text_color?: string;
    /** Title alignment inside the shape (board only). */
    node_title_align?: "left" | "center" | "right";
    /** Minimal invisible endpoint for a connector stretched onto empty canvas. */
    is_line_anchor?: boolean;
    groupId?: string;
  annotation_shape?: AnnotationShape;
  annotation_text?: string;
  annotation_note?: string;
  annotation_text_style?: AnnotationTextStyle;
  /** First table row styled as header (pipe-separated table). */
  annotation_table_header_row?: boolean;
  /** Structured table cells; `annotation_text` is kept in sync as pipe-separated rows. */
  annotation_table_cells?: string[][];
  /** Column widths as percentages (sum ~100); drives resizable columns + fixed layout. */
  annotation_table_col_widths_pct?: number[];
  /** Board sketch tools (not exported as plant components). */
  draw_mode?: "freehand" | "line";
  draw_points?: [number, number][];
  draw_stroke_width?: number;
  draw_stroke_color?: string;
  /** Rotation in degrees around the sketch bounding box center. */
  draw_rotation_deg?: number;
} & Record<string, unknown>;
