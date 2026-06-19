import type { ReactNode } from "react";
import { useMemo } from "react";
import { format } from "date-fns";
import type { ICellRendererParams } from "@ag-grid-community/core";
import { Table } from "lucide-react";
import CommonTable from "@/components/core/table/CommonTable";
import {
  buildEquipmentColumnsFromRows,
  formatCellValue,
  resolveCommunicationMode,
  type EquipmentColumnKind,
  type EquipmentFilterComponentType,
} from "@/utils/plantLiveFormatters";
import type { WidgetRenderProps } from "../registry/widgetLibrary";
import {
  buildTagGroupTableColumns,
  buildTagGroupTableRows,
} from "../core/tagGroupRuntime";
import { widgetShowHeading } from "../core/tagTemplateRuntime";
import { useTagTemplateWidgetData } from "../hooks/useTagTemplateWidgetData";
import { DashboardWidgetShell } from "./shared/DashboardWidgetShell";

function renderDataTableCell(
  kind: EquipmentColumnKind,
  params: ICellRendererParams<unknown, unknown>,
): ReactNode {
  if (kind === "status") return String(params.value ?? "-");
  const field = String(params.colDef?.field ?? "");
  return formatCellValue(params.data, field);
}

export function ConfigurableDataTableWidget({ plantId, title, config, editMode }: WidgetRenderProps) {
  const componentType =
    (config.componentType as EquipmentFilterComponentType | undefined) ?? "inverter";
  const pageSize = typeof config.pageSize === "number" ? config.pageSize : 10;
  const tableHeight = typeof config.tableHeight === "number" ? config.tableHeight : 360;
  const showHeading = widgetShowHeading(config);

  const { live, tagConfig, resolvedTagKeys, hasTagTemplate, isTagTemplateLoading } =
    useTagTemplateWidgetData({
      plantId,
      tagTemplateId: config.tagTemplateId,
      tagKeys: config.tagKeys,
      componentType,
    });

  const today = format(new Date(), "yyyy-MM-dd");

  const { columns, rows } = useMemo(() => {
    if (hasTagTemplate && (tagConfig.length > 0 || resolvedTagKeys.length > 0)) {
      const tagRows = buildTagGroupTableRows({
        tagConfig,
        tagKeys: resolvedTagKeys,
        processedByComponentId: live.processedByComponentId,
        componentById: live.componentById,
      });
      return {
        columns: buildTagGroupTableColumns(resolvedTagKeys),
        rows: tagRows,
      };
    }

    const equipmentRows = live.getEquipmentRows({
      analysisMode: "equipment",
      componentType,
      startDate: today,
      endDate: today,
    });

    const communicationMode = resolveCommunicationMode(componentType, false);
    return {
      columns: buildEquipmentColumnsFromRows({
        rows: equipmentRows,
        componentType,
        communicationMode,
        renderCell: renderDataTableCell,
      }),
      rows: equipmentRows,
    };
  }, [
    componentType,
    hasTagTemplate,
    live,
    resolvedTagKeys,
    tagConfig,
    today,
  ]);

  return (
    <DashboardWidgetShell
      icon={Table}
      title={title ?? "Data Table"}
      showHeading={showHeading}
      description={
        hasTagTemplate
          ? "Live values from the configured tag template."
          : `Live ${componentType.replace(/_/g, " ")} equipment data.`
      }
      embedded
      fillHeight
      className={editMode ? "pointer-events-none select-none" : undefined}
    >
      {isTagTemplateLoading ? (
        <div className="flex flex-1 items-center justify-center text-xs text-neutral-500">
          Loading tag template…
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden rounded-xs border border-neutral-200/80 dark:border-neutral-dark-300/60">
          <CommonTable
            entityKey={`dashboard-data-table-${plantId ?? "plant"}-${String(config.tagTemplateId ?? componentType)}`}
            columns={columns}
            defaultColumns={columns}
            data={rows}
            loading={!live.hasLiveData && rows.length === 0}
            columnSelectorTitle="Data Table"
            pageSize={pageSize}
            tableHeight={tableHeight}
            rowIdField="id"
          />
        </div>
      )}
    </DashboardWidgetShell>
  );
}
