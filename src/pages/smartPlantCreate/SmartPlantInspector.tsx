/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from "react";
import { format, startOfDay } from "date-fns";
import { Activity, Cpu, HardDrive } from "lucide-react";
import CommonDateRangeSelector from "@/components/common/CommonDataRangeSelector";
import Input from "@/components/common/Input";
import AsyncSelect from "@/components/common/AsyncSelect";
import type { Option } from "@/components/common/AsyncSelect";
import SectionHeader from "@/components/common/SectionHeader";
import { fetchDeviceNames, fetchDeviceNamesByIds } from "@/services/operations/deviceAPI";
import {
    fetchTagTemplateNames,
    fetchTagTemplateNamesByIds,
} from "@/services/operations/tagTemplateAPI";
import {
    fetchInverterTypeDisplayLabelById,
    fetchInverterTypeNames,
} from "@/services/operations/inverterTypeAPI";
import { VD_NUMBER_MAX, VD_NUMBER_MIN, VD_NUMBER_OPTIONS } from "@/constants/vdNumber";
import { componentTypeIncludesPayloadField } from "./buildPayload";
import { parseOptionalFiniteNumber } from "./numericFields";
import {
    COMPONENT_KIND_OPTIONS,
    PHASE_TYPE,
    STATUS,
    coercePhaseType,
    slugToApiType,
    type ComponentKindSlug,
} from "./constants";
import type { NodeDraftFields } from "./types";
import { warrantyRangeFromFields } from "./warrantyDateRange";

type Props = {
    plantId: string | null;
    draft: NodeDraftFields;
    kind: ComponentKindSlug;
    onChange: (next: Partial<NodeDraftFields>, kind?: ComponentKindSlug) => void;
};

const SmartPlantInspector: React.FC<Props> = ({ plantId, draft, kind, onChange }) => {
    const apiType = slugToApiType(kind);
    const hasPayload = (field: string) => componentTypeIncludesPayloadField(apiType, field);
    const showInvSpecs = kind === "inverter";
    const showAcKw = hasPayload("ac_capacity_kw");
    const showDcKw = hasPayload("dc_capacity_kw");
    const showDeviceTags =
        hasPayload("device_id") || hasPayload("tag_template_id") || hasPayload("vd_number");

    const patchNumber = <K extends keyof NodeDraftFields>(field: K, raw: string) => {
        const v = parseOptionalFiniteNumber(raw);
        if (v === undefined) return;
        onChange({ [field]: v } as Partial<NodeDraftFields>);
    };

    const warrantyDateRangePicker = useMemo(
        () =>
            warrantyRangeFromFields({
                warranty_start_date: draft.warranty_start_date,
                warranty_end_date: draft.warranty_end_date,
            }),
        [draft.warranty_start_date, draft.warranty_end_date],
    );

    const [deviceLabels, setDeviceLabels] = useState<Record<string, string>>({});
    const [tagTemplateLabels, setTagTemplateLabels] = useState<Record<string, string>>({});
    const [inverterTypeLabels, setInverterTypeLabels] = useState<Record<string, string>>({});

    useEffect(() => {
        const deviceId = draft.device_id;
        if (deviceId && !deviceLabels[deviceId]) {
            void fetchDeviceNamesByIds([deviceId]).then((resolved) => {
                const next = resolved[deviceId];
                if (!next) return;
                setDeviceLabels((current) => ({ ...current, [deviceId]: next }));
            });
        }
    }, [deviceLabels, draft.device_id]);

    useEffect(() => {
        const tagTemplateId = draft.tag_template_id;
        if (tagTemplateId && !tagTemplateLabels[tagTemplateId]) {
            void fetchTagTemplateNamesByIds([tagTemplateId]).then((resolved) => {
                const next = resolved[tagTemplateId];
                if (!next) return;
                setTagTemplateLabels((current) => ({
                    ...current,
                    [tagTemplateId]: next,
                }));
            });
        }
    }, [draft.tag_template_id, tagTemplateLabels]);

    useEffect(() => {
        const id = draft.inverter_type_id;
        if (!id) return;
        if (draft.inverter_type_name || inverterTypeLabels[id]) return;
        void fetchInverterTypeDisplayLabelById(id).then((label) => {
            if (!label) return;
            setInverterTypeLabels((cur) => (cur[id] ? cur : { ...cur, [id]: label }));
        });
    }, [draft.inverter_type_id, draft.inverter_type_name, inverterTypeLabels]);

    const inverterTypeLabelsMerged = useMemo(() => {
        if (!draft.inverter_type_id || !draft.inverter_type_name) return inverterTypeLabels;
        return { ...inverterTypeLabels, [draft.inverter_type_id]: draft.inverter_type_name };
    }, [draft.inverter_type_id, draft.inverter_type_name, inverterTypeLabels]);

    const toSelectedOption = (
        value: string | null | undefined,
        labels: Record<string, string>,
        fallbackLabel?: string | null,
    ): Option | null => {
        if (!value) return null;
        return { value, label: labels[value] ?? fallbackLabel ?? value };
    };

    return (
        <div className="flex flex-col gap-4 overflow-y-auto custom-scrollbar px-1 pb-6">
            <div>
                <label className="form-label">Component Type *</label>
                <select
                    className="input"
                    value={kind}
                    onChange={(e) => onChange({}, e.target.value as ComponentKindSlug)}
                >
                    {COMPONENT_KIND_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </select>
            </div>

            <Input
                label="Name"
                star
                value={draft.component_name}
                onChange={(e) => onChange({ component_name: e.target.value })}
            />
            <Input label="Code" star value={draft.component_code} onChange={(e) => onChange({ component_code: e.target.value })} />
            {hasPayload("serial_number") ? (
                <Input
                    label="Serial number"
                    value={draft.serial_number ?? ""}
                    onChange={(e) => onChange({ serial_number: e.target.value })}
                />
            ) : null}

            {showDeviceTags ? (
                <>
                    <SectionHeader
                        icon={HardDrive}
                        title="Device & tags"
                        description="VD required with device + template when those fields apply."
                        compact
                    />
                    {hasPayload("device_id") ? (
                        <AsyncSelect
                            name="device_id"
                            loadOptions={(s = "") => fetchDeviceNames(s, 1, 50, plantId)}
                            isMulti={false}
                            placeholder={plantId ? "Device" : "Select plant first"}
                            isDisabled={!plantId}
                            value={toSelectedOption(draft.device_id, deviceLabels, draft.device_name)}
                            onChange={(v: any) => {
                                if (v?.value && v?.label) {
                                    setDeviceLabels((current) => ({ ...current, [String(v.value)]: String(v.label) }));
                                }
                                onChange({
                                    device_id: v?.value || null,
                                    device_name: v?.label ? String(v.label) : null,
                                });
                            }}
                            isClearable
                        />
                    ) : null}
                    {hasPayload("vd_number") ? (
                        <div>
                            <label className="form-label">
                                VD number <span className="text-red-500">*</span>
                            </label>
                            <select
                                className="input"
                                value={draft.vd_number != null ? String(draft.vd_number) : ""}
                                onChange={(e) =>
                                    onChange({
                                        vd_number: e.target.value === "" ? null : Number(e.target.value),
                                    })
                                }
                            >
                                <option value="">Select VD (1–25)</option>
                                {draft.vd_number != null &&
                                (!Number.isInteger(draft.vd_number) ||
                                    draft.vd_number < VD_NUMBER_MIN ||
                                    draft.vd_number > VD_NUMBER_MAX) ? (
                                    <option value={String(draft.vd_number)}>
                                        {draft.vd_number} (current)
                                    </option>
                                ) : null}
                                {VD_NUMBER_OPTIONS.map((n) => (
                                    <option key={n} value={n}>
                                        {n}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : null}
                    {hasPayload("tag_template_id") ? (
                        <AsyncSelect
                            name="tag_template_id"
                            loadOptions={(s = "") => fetchTagTemplateNames(s, 1, 50)}
                            isMulti={false}
                            placeholder="Tag template"
                            value={toSelectedOption(
                                draft.tag_template_id,
                                tagTemplateLabels,
                                draft.tag_template_name,
                            )}
                            onChange={(v: any) => {
                                if (v?.value && v?.label) {
                                    setTagTemplateLabels((current) => ({ ...current, [String(v.value)]: String(v.label) }));
                                }
                                onChange({
                                    tag_template_id: v?.value || null,
                                    tag_template_name: v?.label ? String(v.label) : null,
                                });
                            }}
                            isClearable
                        />
                    ) : null}
                </>
            ) : null}

            {(kind === "inverter" || kind === "acdb" || kind === "dcdb") && hasPayload("inverter_type_id") ? (
                <AsyncSelect
                    name="inverter_type_id"
                    loadOptions={(s = "") => fetchInverterTypeNames(s, 1, 50)}
                    apiSearch
                    isMulti={false}
                    placeholder="Inverter type"
                    value={toSelectedOption(
                        draft.inverter_type_id,
                        inverterTypeLabelsMerged,
                        draft.inverter_type_name,
                    )}
                    onChange={(v: any) => {
                        if (v?.value && v?.label) {
                            setInverterTypeLabels((current) => ({ ...current, [String(v.value)]: String(v.label) }));
                        }
                        onChange({
                            inverter_type_id: v?.value || null,
                            inverter_type_name: v?.label ? String(v.label) : null,
                        });
                    }}
                    isClearable
                />
            ) : null}

            {(showAcKw || showDcKw) && (
                <>
                    {showAcKw && (
                        <Input
                            type="number"
                            step="0.01"
                            min={0}
                            inputMode="decimal"
                            label="AC capacity (kW)"
                            value={draft.ac_capacity_kw != null ? String(draft.ac_capacity_kw) : ""}
                            onChange={(e) => patchNumber("ac_capacity_kw", e.target.value)}
                        />
                    )}
                    {showDcKw && (
                        <Input
                            type="number"
                            step="0.01"
                            min={0}
                            inputMode="decimal"
                            label="DC capacity (kW)"
                            value={draft.dc_capacity_kw != null ? String(draft.dc_capacity_kw) : ""}
                            onChange={(e) => patchNumber("dc_capacity_kw", e.target.value)}
                        />
                    )}
                </>
            )}

            {(kind === "plant" || kind === "block") && (hasPayload("module_count") || hasPayload("area_sqm")) ? (
                <>
                    <SectionHeader
                        icon={Cpu}
                        title={kind === "plant" ? "Plant sizing" : "Block sizing"}
                        compact
                    />
                    {hasPayload("module_count") ? (
                        <Input
                            type="number"
                            step={1}
                            min={0}
                            inputMode="numeric"
                            label="Module count"
                            value={draft.module_count != null ? String(draft.module_count) : ""}
                            onChange={(e) => patchNumber("module_count", e.target.value)}
                        />
                    ) : null}
                    {hasPayload("area_sqm") ? (
                        <Input
                            type="number"
                            step="0.01"
                            min={0}
                            inputMode="decimal"
                            label="Area (sqm)"
                            value={draft.area_sqm != null ? String(draft.area_sqm) : ""}
                            onChange={(e) => patchNumber("area_sqm", e.target.value)}
                        />
                    ) : null}
                </>
            ) : null}

            {kind === "block" && hasPayload("rating_a") ? (
                <Input
                    type="number"
                    step="0.01"
                    min={0}
                    inputMode="decimal"
                    label="Rating (A)"
                    value={draft.rating_a != null ? String(draft.rating_a) : ""}
                    onChange={(e) => patchNumber("rating_a", e.target.value)}
                />
            ) : null}

            {kind === "meter" ? (
                <>
                    <SectionHeader icon={Activity} title="Meter" compact />
                    {hasPayload("phase_type") ? (
                        <div>
                            <label className="form-label">Phase</label>
                            <select
                                className="input"
                                value={draft.phase_type ?? ""}
                                onChange={(e) => onChange({ phase_type: coercePhaseType(e.target.value) })}
                            >
                                <option value={PHASE_TYPE.SINGLE_PHASE}>Single phase</option>
                                <option value={PHASE_TYPE.THREE_PHASE}>Three phase</option>
                            </select>
                        </div>
                    ) : null}
                    {hasPayload("warranty_start_date") || hasPayload("warranty_end_date") ? (
                        <CommonDateRangeSelector
                            label="Warranty period"
                            maxDays={365 * 25}
                            dateRange={warrantyDateRangePicker}
                            onDateRangeChange={(range) => {
                                onChange({
                                    warranty_start_date: format(startOfDay(range.startDate), "yyyy-MM-dd"),
                                    warranty_end_date: format(startOfDay(range.endDate), "yyyy-MM-dd"),
                                });
                            }}
                        />
                    ) : null}
                </>
            ) : null}

            {kind === "weather_station" ? (
                <>
                    <SectionHeader icon={Activity} title="Weather station" compact />
                    {hasPayload("warranty_start_date") || hasPayload("warranty_end_date") ? (
                        <CommonDateRangeSelector
                            label="Warranty period"
                            maxDays={365 * 25}
                            dateRange={warrantyDateRangePicker}
                            onDateRangeChange={(range) => {
                                onChange({
                                    warranty_start_date: format(startOfDay(range.startDate), "yyyy-MM-dd"),
                                    warranty_end_date: format(startOfDay(range.endDate), "yyyy-MM-dd"),
                                });
                            }}
                        />
                    ) : null}
                </>
            ) : null}

            {(kind === "string" || kind === "dcdb") &&
            (hasPayload("channels") ||
                (kind === "dcdb" &&
                    (hasPayload("string_length") || hasPayload("ct_ratio") || hasPayload("rating_a")))) ? (
                <>
                    <SectionHeader icon={Cpu} title={kind === "dcdb" ? "DCDB" : "String"} compact />
                    {hasPayload("channels") ? (
                        <Input
                            type="number"
                            step={1}
                            min={0}
                            inputMode="numeric"
                            label="Channels"
                            value={draft.channels != null ? String(draft.channels) : ""}
                            onChange={(e) => patchNumber("channels", e.target.value)}
                        />
                    ) : null}
                    {kind === "dcdb" && hasPayload("string_length") ? (
                        <Input
                            type="number"
                            step={1}
                            min={0}
                            inputMode="numeric"
                            label="String length"
                            value={draft.string_length != null ? String(draft.string_length) : ""}
                            onChange={(e) => patchNumber("string_length", e.target.value)}
                        />
                    ) : null}
                    {kind === "dcdb" && hasPayload("ct_ratio") ? (
                        <Input
                            type="number"
                            step="0.01"
                            min={0}
                            inputMode="decimal"
                            label="CT ratio"
                            value={draft.ct_ratio != null ? String(draft.ct_ratio) : ""}
                            onChange={(e) => patchNumber("ct_ratio", e.target.value)}
                        />
                    ) : null}
                    {kind === "dcdb" && hasPayload("rating_a") ? (
                        <Input
                            type="number"
                            step="0.01"
                            min={0}
                            inputMode="decimal"
                            label="Rating (A)"
                            value={draft.rating_a != null ? String(draft.rating_a) : ""}
                            onChange={(e) => patchNumber("rating_a", e.target.value)}
                        />
                    ) : null}
                </>
            ) : null}

            {showInvSpecs && (
                <>
                    <SectionHeader icon={Cpu} title="Inverter specs" compact />
                    {hasPayload("brand") ? (
                        <Input label="Brand" value={draft.brand ?? ""} onChange={(e) => onChange({ brand: e.target.value })} />
                    ) : null}
                    {hasPayload("model") ? (
                        <Input label="Model" value={draft.model ?? ""} onChange={(e) => onChange({ model: e.target.value })} />
                    ) : null}
                    {hasPayload("phase_type") ? (
                        <div>
                            <label className="form-label">Phase</label>
                            <select
                                className="input"
                                value={draft.phase_type ?? ""}
                                onChange={(e) => onChange({ phase_type: coercePhaseType(e.target.value) })}
                            >
                                <option value={PHASE_TYPE.SINGLE_PHASE}>Single phase</option>
                                <option value={PHASE_TYPE.THREE_PHASE}>Three phase</option>
                            </select>
                        </div>
                    ) : null}
                    {hasPayload("mppt_count") ? (
                        <Input
                            type="number"
                            step={1}
                            min={0}
                            inputMode="numeric"
                            label="MPPT count"
                            value={draft.mppt_count != null ? String(draft.mppt_count) : ""}
                            onChange={(e) => patchNumber("mppt_count", e.target.value)}
                        />
                    ) : null}
                    {hasPayload("strings_per_mppt") ? (
                        <Input
                            type="number"
                            step={1}
                            min={0}
                            inputMode="numeric"
                            label="Strings / MPPT"
                            value={draft.strings_per_mppt != null ? String(draft.strings_per_mppt) : ""}
                            onChange={(e) => patchNumber("strings_per_mppt", e.target.value)}
                        />
                    ) : null}
                    {hasPayload("ct_ratio") ? (
                        <Input
                            type="number"
                            step="0.01"
                            min={0}
                            inputMode="decimal"
                            label="CT ratio"
                            value={draft.ct_ratio != null ? String(draft.ct_ratio) : ""}
                            onChange={(e) => patchNumber("ct_ratio", e.target.value)}
                        />
                    ) : null}
                    {hasPayload("rating_a") ? (
                        <Input
                            type="number"
                            step="0.01"
                            min={0}
                            inputMode="decimal"
                            label="Rating (A)"
                            value={draft.rating_a != null ? String(draft.rating_a) : ""}
                            onChange={(e) => patchNumber("rating_a", e.target.value)}
                        />
                    ) : null}
                    {hasPayload("channels") ? (
                        <Input
                            type="number"
                            step={1}
                            min={0}
                            inputMode="numeric"
                            label="Channels"
                            value={draft.channels != null ? String(draft.channels) : ""}
                            onChange={(e) => patchNumber("channels", e.target.value)}
                        />
                    ) : null}
                    {hasPayload("warranty_start_date") || hasPayload("warranty_end_date") ? (
                        <div className="grid grid-cols-2 gap-2">
                            {hasPayload("warranty_start_date") ? (
                                <div>
                                    <label className="form-label text-xs">Warranty start</label>
                                    <input
                                        type="date"
                                        className="input"
                                        value={draft.warranty_start_date ?? ""}
                                        onChange={(e) => onChange({ warranty_start_date: e.target.value || null })}
                                    />
                                </div>
                            ) : null}
                            {hasPayload("warranty_end_date") ? (
                                <div>
                                    <label className="form-label text-xs">Warranty end</label>
                                    <input
                                        type="date"
                                        className="input"
                                        value={draft.warranty_end_date ?? ""}
                                        onChange={(e) => onChange({ warranty_end_date: e.target.value || null })}
                                    />
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                </>
            )}

            <label className="form-checkbox-row">
                <input
                    type="checkbox"
                    className="form-checkbox"
                    checked={draft.is_active !== false}
                    onChange={(e) => onChange({ is_active: e.target.checked })}
                />
                <span className="form-checkbox-label">Active</span>
            </label>
            <div>
                <label className="form-label">Status</label>
                <select
                    className="input"
                    value={draft.status ?? STATUS.ACTIVE}
                    onChange={(e) => onChange({ status: e.target.value as typeof STATUS[keyof typeof STATUS] })}
                >
                    <option value={STATUS.ACTIVE}>Active</option>
                    <option value={STATUS.INACTIVE}>Inactive</option>
                    <option value={STATUS.FAULTY}>Faulty</option>
                    <option value={STATUS.MAINTENANCE}>Maintenance</option>
                    <option value={STATUS.DECOMMISSIONED}>Decommissioned</option>
                </select>
            </div>
        </div>
    );
};

export default SmartPlantInspector;
