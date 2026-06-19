/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { Check, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import type { CommonCustomCardProps } from "@/components/core/table/CommonCardList";
import Avatar from "@/components/common/Avatar";
import { formateDateTime } from "@/utils/gridFormatters";

/* ─── helpers ──────────────────────────────────────── */
const getText = (value: any): string => {
  if (value == null || value === "") return "—";
  return String(value);
};

const isActionsColumn = (col: {
  field: string;
  headerName: string;
  cellRenderer?: (params: any) => React.ReactNode;
}) =>
  col.field === "id" &&
  typeof col.cellRenderer === "function" &&
  col.headerName.trim().toLowerCase().startsWith("action");

/* ─── KPI chip ──────────────────────────────────────── */
const KpiChip: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex flex-1 flex-col items-center justify-center rounded-xs bg-gray-300/20 border-gray-300/25 dark:bg-white/10 border dark:border-white/10 px-2 py-2 min-w-0">
    <span className="text-[13px] font-semibold text-neutral-700 dark:text-neutral-300 leading-none truncate max-w-full">
      {value}
    </span>
    <span className="mt-1 text-[9px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 leading-none">
      {label}
    </span>
  </div>
);

/* ─── Pill badge ────────────────────────────────────── */
const Pill: React.FC<{
  children: React.ReactNode;
  variant: "active" | "inactive" | "ghost" | "warn"|"normal";
}> = ({ children, variant }) => {
  const cls: Record<string, string> = {
    active: "bg-emerald-400/20 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-400/30 dark:border-emerald-500/25 py-1 px-2",
    inactive: "bg-red-500/10 dark:bg-red-400/10 text-red-700 dark:text-red-500 border-red-500/25 dark:border-red-500 py-1 px-2",
    ghost: "bg-white/8 text-white/75 border-white/12 py-1 px-2",
    warn: "bg-amber-400/20 dark:bg-amber-400/20 text-amber-600 dark:text-amber-300 border-amber-400/25 dark:border-amber-400/25 py-1 px-2",
    normal:"bg-gray-300/20 dark:bg-white/20 border-gray-300/30 dark:border-white/20 text-gray-600 dark:text-white/75 py-1 px-2"
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium leading-none tracking-wide whitespace-nowrap border-white/20 dark:border-white/20 ${cls[variant]}`}
    >
      {children}
    </span>
  );
};

/* ─── 2-col meta field ─────────────────────────────── */
const MetaField: React.FC<{
  label: string;
  value: React.ReactNode;
  isNode?: boolean;
}> = ({ label, value, isNode = false }) => (
  <div className="min-w-0 flex flex-col gap-0.5">
    <p className="text-[9px] uppercase tracking-widest font-semibold text-neutral-400 dark:text-neutral-500 leading-none mb-0.5">
      {label}
    </p>
    {isNode ? (
      <div className="text-[11.5px] font-medium text-neutral-700 dark:text-neutral-300 leading-snug truncate">
        {value}
      </div>
    ) : (
      <p
        className="text-[11.5px] font-medium text-neutral-700 dark:text-neutral-300 leading-snug"
        style={{
          display: "-webkit-box",
          WebkitLineClamp: 1,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        } as React.CSSProperties}
      >
        {value as string}
      </p>
    )}
  </div>
);

/* ════════════════════════════════════════════════════
   PLANT CARD
   ════════════════════════════════════════════════════ */
const PlantCard: React.FC<CommonCustomCardProps> = ({
  row,
  rowId,
  columns,
  onRowClick,
  gridContext,
  selected = false,
  onToggleSelect,
}) => {
  const actionsColumn = columns.find(isActionsColumn);

  const plantName = getText(row.plant_name);
  const location = getText(row.location_name || row.city || row.state);
  const dcCapacity = row.dc_capacity_kw != null ? `${row.dc_capacity_kw} kW` : "—";
  const acCapacity = row.ac_capacity_kw != null ? `${row.ac_capacity_kw} kW` : "—";
  const ppaRate = row.ppa_rate != null ? `₹${row.ppa_rate}` : "—";
  const isActive = !!row.is_active;
  const typeLabel = getText(row.plant_type);
  const categoryLabel = row.plant_category ? getText(row.plant_category) : null;
  const gridLabel =
    row.grid_type === "on_grid" ? "On-Grid" :
      row.grid_type === "off_grid" ? "Off-Grid" :
        row.grid_type ? getText(row.grid_type) : null;
  const ownerName = getText(row.owner?.name || row.username);
  const orgName = row.organization_name ? ` · ${row.organization_name}` : "";
  const discom = getText(row.discom_name);
  const contact = getText(row.contact_person_name);
  const codDate = row.cod_date ? formateDateTime(row.cod_date) : "—";

  return (
    <div
      onClick={() => onRowClick?.(row)}
      className={[
        "group flex min-w-0 flex-col rounded-xs overflow-hidden",
        "border transition-all duration-50",
        selected
          ? "border-orange-400/60 ring-2 ring-blue-500/15 dark:border-orange-400/50 dark:ring-blue-400/10"
          : "border-neutral-300 dark:border-neutral-dark-300/60 hover:border-neutral-400/75 dark:hover:border-neutral-dark-400",
        onRowClick ? "cursor-pointer" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* ── HERO ───────────────────────────────────────── */}
      <div
        className="relative px-3.5 pt-3.5 pb-3 overflow-hidden bg-[radial-gradient(circle_at_bottom_left,_#fff4eb_0%,_#fffaf5_40%,_#ffffff_100%)] dark:bg-[radial-gradient(circle_at_bottom_left,_#3b1f10_0%,_#26140a_32%,_#121212_100%)]"

      >
        {/* decorative orbs */}
        <span className="pointer-events-none absolute -right-20 -top-36 h-64 w-64 rounded-full blur-[1px] dark:blur-[4px] bg-[#fff4eb] dark:bg-[#3b1f10]" />
        {/* <span className="pointer-events-none absolute -right-2 bottom-0 h-14 w-14 rounded-full blur-sm bg-blue-400/5" /> */}

        {/* ── Row 1: avatar / title / actions ── */}
        <div className="relative flex items-start gap-2.5">

          {/* selectable avatar */}
          {onToggleSelect ? (
            <button
              type="button"
              aria-label={selected ? `Deselect ${plantName}` : `Select ${plantName}`}
              aria-pressed={selected}
              onClick={(e) => { e.stopPropagation(); onToggleSelect(rowId); }}
              className={[
                "relative shrink-0 rounded-full transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
                selected ? "ring-2 ring-white/70 ring-offset-1 ring-offset-[#1e1b4b]" : "",
              ].join(" ")}
              style={{ width: 36, height: 36 }}
            >
              <span className={["absolute inset-0 transition-opacity duration-200", selected ? "opacity-0" : "opacity-100"].join(" ")}>
                <Avatar label={plantName} seed={rowId} size={36} />
              </span>
              <span className={["absolute inset-0 flex items-center justify-center rounded-full transition-all duration-200 bg-white/90", selected ? "opacity-100 scale-100" : "opacity-0 scale-90 hover:opacity-100 hover:scale-100"].join(" ")}>
                <Check className="w-4 h-4 text-indigo-700" aria-hidden />
              </span>
            </button>
          ) : (
            <div className="shrink-0">
              <Avatar label={plantName} seed={rowId} size={36} />
            </div>
          )}

          {/* name + location */}
          <div className="min-w-0 flex-1">
            <Link
              to={`/plants/${row.id}`}
              onClick={(e) => e.stopPropagation()}
              className="block truncate text-[13px] font-semibold text-black dark:text-white hover:underline underline-offset-2 leading-snug"
              title={plantName}
            >
              {plantName}
            </Link>
            <p className="mt-0.5 flex items-center gap-1 text-[10px] text-black/50 dark:text-white/50 leading-none truncate">
              <MapPin className="h-2.5 w-2.5 shrink-0" aria-hidden />
              <span className="truncate">{location}</span>
            </p>
          </div>

          {/* ── Action buttons — top right ── */}
          {actionsColumn?.cellRenderer && (
            <div
              className="shrink-0 flex items-center gap-0.5 -mt-0.5 -mr-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              {actionsColumn.cellRenderer({
                value: row.id,
                data: row,
                context: gridContext,
              })}
            </div>
          )}
        </div>

        {/* ── Row 2: badges ── */}
        <div className="relative mt-2.5 flex flex-wrap gap-1.5">
          <Pill variant={isActive ? "active" : "inactive"}>
            {isActive && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
            {isActive ? "Active" : "Inactive"}
          </Pill>
          {typeLabel !== "—" && <Pill variant="normal">{typeLabel}</Pill>}
          {categoryLabel && <Pill variant="normal">{categoryLabel}</Pill>}
          {gridLabel && <Pill variant="normal">{gridLabel}</Pill>}
          {!row.is_commissioned && <Pill variant="warn">Not commissioned</Pill>}
        </div>

        {/* ── Row 3: KPI chips ── */}
        <div className="relative mt-2 flex gap-1">
          <KpiChip label="DC kW" value={dcCapacity} />
          <KpiChip label="AC kW" value={acCapacity} />
          <KpiChip label="PPA/unit" value={ppaRate} />
        </div>
      </div>

      {/* ── META BODY — 2-col grid ─────────────────────── */}
      <div className="bg-white dark:bg-neutral-dark-100 px-3.5 py-3 grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-neutral-100 dark:border-white/5">
        <MetaField label="DISCOM" value={discom} />
        <MetaField label="COD Date" value={codDate} />

        <MetaField
          label="Owner"
          isNode
          value={
            row.owner?.id ? (
              <Link
                to={`/users/${row.owner.id}/profile`}
                onClick={(e) => e.stopPropagation()}
                className="truncate block text-orange-600 dark:text-orange-400 hover:underline"
              >
                {ownerName}{orgName}
              </Link>
            ) : (
              <span className="truncate block">{ownerName}{orgName}</span>
            )
          }
        />

        <MetaField label="Contact" value={contact} />
      </div>
    </div>
  );
};

export default PlantCard;