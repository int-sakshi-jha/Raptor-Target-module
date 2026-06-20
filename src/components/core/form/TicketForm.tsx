/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import AsyncSelect, { type Option } from "@/components/common/AsyncSelect";
import SectionSubHeader from "@/components/common/SectionSubHeader";
import {
    TICKET_STATUS_OPTIONS,
    TICKET_PRIORITY_OPTIONS,
    type TicketRow,
    type CreateTicketInput
} from "@/services/operations/ticketAPI";
import { useGetPlantNamesQuery } from "@/services/operations/plantAPI";
import { useGetComponentTypeOptionsQuery, useGetAllComponentQuery } from "@/services/operations/componentAPI";
import FileUpload from "@/components/common/FileUpload";
import { useGetAllUsersQuery } from "@/services/operations/userAPI";//
import { Ticket, User, Building2, Calendar, FileText, Upload } from "lucide-react";
import FormModeToggle from "@/components/common/FormModeToggle";
import { useCreateTicketMutation,useUpdateTicketMutation } from "@/services/operations/ticketAPI";
import { applyBackendErrors } from "@/utils/formValidators";

// ── Types ─────────────────────────────────────────────────────────────────────

type TicketFormMode = "create" | "edit";
type ComponentTypeOption = Option & { id?: string };

type TicketFormValues = {
    plant: Option | null;
    component_type: ComponentTypeOption | null; 
    component: Option | null;
    title: string;
    description: string;
    status: Option | null;
    priority: Option | null;
    assigned_to: Option | null;
    name: string;
    email: string;
    phone_number: string;
    due_date: string;
    media_files: File[]
};

type TicketFormProps = {
    mode?: TicketFormMode;
    initialValues?: Partial<TicketRow>;
    onSuccess?: () => void;
    close?: () => void;
    isOpen?: boolean;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const buildOption = (value: string | null | undefined): Option | null =>
    value ? { value, label: value } : null;

function buildEditFormValues(iv: Partial<TicketRow>): TicketFormValues {
    return {
        plant: iv.plant_id ? { value: iv.plant_id, label: iv.plant_name ?? iv.plant_id } : null,
        component_type: iv.component_type_id ? { value: iv.component_type_id, label: iv.component_type ?? iv.component_type_id } : null,
        component: iv.component_id ? { value: iv.component_id, label: iv.component ?? iv.component_id } : null,
        title: iv.title ?? "",
        description: iv.description ?? "",
        status: buildOption(iv.status),
        priority: buildOption(iv.priority),
        assigned_to: iv.assigned_to ? { value: iv.assigned_to, label: iv.assigned_to_name ?? iv.assigned_to } : null,
        name: iv.name ?? "",
        email: iv.email ?? "",
        phone_number: iv.phone_number ?? "",
        due_date: iv.due_date ? String(iv.due_date).slice(0, 10) : "",
        media_files: []
    };
}

const DEFAULT_VALUES: TicketFormValues = {
    plant: null,
    component_type: null,
    component: null,
    title: "",
    description: "",
    status: null,
    priority: null,
    assigned_to: null,
    name: "",
    email: "",
    phone_number: "",
    due_date: "",
    media_files: []
};

// ── Component ─────────────────────────────────────────────────────────────────

const TicketForm: React.FC<TicketFormProps> = ({
    mode = "create",
    initialValues,
    onSuccess,
    isOpen = true,
}) => {
    const isEdit = mode === "edit";
    const [showAdvanced, setShowAdvanced] = useState(isEdit);

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        setError,
        getValues,
        control,
        watch,
        formState: { errors },
    } = useForm<TicketFormValues>({
        defaultValues:
            isEdit && initialValues
                ? buildEditFormValues(initialValues)
                : DEFAULT_VALUES,
    });

    const selectedComponentType = watch("component_type");

    // ── Options ────────────────────────────────────────────────────────────────

    const { data: plantData } = useGetPlantNamesQuery();
    const loadPlantOptions = useCallback(
        async (): Promise<Option[]> => (plantData?.data.plants ?? []).map(
            (u: any) => ({ value: u.id, label: u.plant_name ?? u.email ?? u.id })
        ),

        [plantData]
    );

    const { data: componentTypeData } = useGetComponentTypeOptionsQuery();
    console.log('com', componentTypeData)

    const loadComponentTypeOptions = useCallback(
        async (): Promise<Option[]> => componentTypeData ?? [],
        [componentTypeData]
    );


    const { data: componentData } = useGetAllComponentQuery({});
    const loadComponentOptions = useCallback(
        async (): Promise<Option[]> => (componentData?.data.data ?? []).map(
            (u: any) => ({ value: u.id, label: u.component_name ?? u.email ?? u.id })
        ),
        [componentData]
    );





    const { data: userOptionsData } = useGetAllUsersQuery({});
    const loadUserOptions = useCallback(
        async (): Promise<Option[]> =>
            (userOptionsData?.rows ?? userOptionsData?.data?.rows ?? []).map(
                (u: any) => ({ value: u.id, label: u.name ?? u.email ?? u.id })
            ),
        [userOptionsData]
    );

    const loadStatusOptions = useCallback(
        async () => TICKET_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
        []
    );

    const loadPriorityOptions = useCallback(
        async () => TICKET_PRIORITY_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
        []
    );

    // ── Submit ─────────────────────────────────────────────────────────────────

    

    const createMutation = useCreateTicketMutation();
    const updateMutation = useUpdateTicketMutation();

    const onSubmit = (data: TicketFormValues) => {
    const finalData: CreateTicketInput = {
        plant_id: data.plant?.value ?? null,
        component_type_id: (data.component_type as ComponentTypeOption)?.id ?? null,
        component_id: data.component?.value ?? null,
        name: data.name.trim(),
        email: data.email.trim(),
        phone_number: data.phone_number.trim(),
        title: data.title.trim(),
        description: data.description.trim(),
        status: data.status?.value ?? "",
        priority: data.priority?.value ?? "",
        
        due_date: data.due_date || null,
    };

    if (isEdit && initialValues?.id) {
        updateMutation.mutate(
            { id: initialValues.id, ...finalData },
            {
                onSuccess: () => { onSuccess?.(); },
                onError: (error) => {
                    applyBackendErrors(error, setError, getValues);
                },
            }
        );
    } else {
        createMutation.mutate(finalData, {
            onSuccess: () => { reset(); onSuccess?.(); },
            onError: (error) => {
                applyBackendErrors(error, setError, getValues);
            },
            
        });
    }
};

    const watchedMediaFiles = watch("media_files");


    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex h-full flex-col gap-2"
            noValidate
        >
            <FormModeToggle
                showAdvanced={showAdvanced}
                onToggle={() => setShowAdvanced((prev) => !prev)}
                className="!absolute right-14 top-5 z-10"
            />
            <div className="space-y-2">

                {/* Ticket Details */}
                <div className="space-y-2">
                    <SectionSubHeader icon={Ticket} title="Ticket Details" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">

                        <Input
                            label="Title"
                            star
                            {...register("title", { required: "Title is required" })}
                            errors={errors.title}
                            className="md:col-span-2"
                        />

                        <Controller
                            name="status"
                            control={control}
                            render={({ field }) => (
                                <AsyncSelect
                                    label="Status"
                                    loadOptions={loadStatusOptions}
                                    value={field.value}
                                    onChange={(v) => field.onChange(v ?? null)}
                                    isClearable
                                />
                            )}
                        />

                        <Controller
                            name="priority"
                            control={control}
                            render={({ field }) => (
                                <AsyncSelect
                                    label="Priority"
                                    loadOptions={loadPriorityOptions}
                                    value={field.value}
                                    onChange={(v) => field.onChange(v ?? null)}
                                    isClearable
                                />
                            )}
                        />



                        <Input
                            type="date"
                            label="Due Date"
                            {...register("due_date")}
                        />

                    </div>
                </div>


                {/* Description */}
                <div className="space-y-2">
                    <SectionSubHeader icon={FileText} title="Description" />
                    <textarea
                        {...register("description")}
                        rows={3}
                        className="input resize-none"
                    />
                </div>

                {/* Context */}
                <div className="space-y-2">
                    <SectionSubHeader icon={Building2} title="Context" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">

                        <Controller
                            name="plant"
                            control={control}
                            render={({ field }) => (
                                <AsyncSelect
                                    label="Plant"
                                    apiSearch
                                    loadOptions={loadPlantOptions}
                                    value={field.value}
                                    onChange={(v) => field.onChange(v ?? null)}
                                    isClearable
                                />
                            )}
                        />

                        <Controller
                            name="component_type"
                            control={control}
                            render={({ field }) => (
                                <AsyncSelect
                                    label="Component Type"
                                    apiSearch
                                    loadOptions={loadComponentTypeOptions}
                                    value={field.value}
                                    onChange={(v) => field.onChange(v ?? null)}
                                    isClearable
                                />
                            )}
                        />

                        <Controller
                            name="component"
                            control={control}
                            render={({ field }) => (
                                <AsyncSelect
                                    label="Component"
                                    apiSearch
                                    loadOptions={loadComponentOptions}
                                    value={field.value}
                                    onChange={(v) => field.onChange(v ?? null)}
                                    isClearable
                                    isDisabled={!selectedComponentType}
                                />
                            )}
                        />

                    </div>
                </div>



                {showAdvanced && (
                    <>
                        {/* Reporter */}
                        <div className="space-y-2">
                            <SectionSubHeader icon={User} title="Reporter" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">

                                <Input
                                    label="Reporter Name"
                                    {...register("name")}
                                />

                                <Input
                                    label="Reporter Email"
                                    type="email"
                                    {...register("email")}
                                />

                                <Input
                                    label="Phone Number"
                                    {...register("phone_number")}
                                />

                            </div>
                        </div>


                        <div className="space-y-2">
                            <SectionSubHeader icon={Upload} title="Media" />
                            <FileUpload
                                multiple
                                value={watchedMediaFiles}
                                onChange={(files) =>
                                    setValue("media_files", files, { shouldDirty: true })
                                }
                            />
                        </div>
                    </>
                )}

            </div>

            <div className="flex justify-between z-20 mt-auto border-t border-neutral-200 bg-white/95 px-1 py-3 backdrop-blur-sm dark:border-neutral-700 dark:bg-neutral-dark-200/95">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                        reset(isEdit && initialValues ? buildEditFormValues(initialValues) : DEFAULT_VALUES)
                    }
                >
                    Reset
                </Button>

                <Button type="submit">
                    {isEdit ? "Update Ticket" : "Create Ticket"}
                </Button>
            </div>
        </form>
    );
};

export default TicketForm;