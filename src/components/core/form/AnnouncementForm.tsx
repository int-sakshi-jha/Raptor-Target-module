import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import {
  useCreateAnnouncementMutation,
  useGetAnnouncementDetailsQuery,
  useUpdateAnnouncementMutation,
  fetchAnnouncementTypeOptions,
  type Announcement,
  type AnnouncementAudience,
  type CreateAnnouncementInput,
} from "@/services/operations/announcementAPI";
import { fetchTenantNames } from "@/services/operations/tenantAPI";
import { fetchUserNames, fetchUserNamesByTenant } from "@/services/operations/userAPI";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import AsyncSelect, { type Option } from "@/components/common/AsyncSelect";
import Toggle from "@/components/common/Toggle";
import FormModeToggle from "@/components/common/FormModeToggle";
import RichTextEditor from "@/components/common/RichTextEditor";
import SectionSubHeader from "@/components/common/SectionSubHeader";
import {
  ANNOUNCEMENT_AUDIENCE_ROLE_OPTIONS,
  AUDIENCE_TYPE_OPTIONS,
} from "@/utils/selectOptions";
import { applyBackendErrors } from "@/utils/formValidators";
import { hasRichTextContent } from "@/utils/richTextContent";
import { Info, SlidersHorizontal, Users } from "lucide-react";
import type { MultiValue, SingleValue } from "react-select";

type AnnouncementFormValues = {
  title: string;
  content: string;
  type: string;
  audience_type: string;
  audience_roles: string[];
  audience_tenant_ids: string[];
  audience_user_ids: string[];
  start_date: string;
  end_date: string;
  is_active: boolean;
  dismissible: boolean;
};

type AnnouncementFormProps = {
  mode?: "create" | "edit";
  initialValues?: Partial<Announcement>;
  skipAnnouncementDetailsQuery?: boolean;
  onSuccess?: () => void;
};

function toLocalDatetimeInputValue(iso: string | undefined | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toIsoFromLocalDatetime(local: string): string {
  if (!local.trim()) return "";
  return new Date(local).toISOString();
}

function buildAudiencePayload(
  audienceType: string,
  roles: string[],
  tenantIds: string[],
  userIds: string[],
): AnnouncementAudience | null {
  switch (audienceType) {
    case "role":
      return { roles };
    case "tenant":
      return { tenant_ids: tenantIds };
    case "users":
      return { user_ids: userIds };
    default:
      return null;
  }
}

const loadAudienceTypeOptions = async (search = "") => {
  const q = search.trim().toLowerCase();
  return AUDIENCE_TYPE_OPTIONS.filter(
    (opt) =>
      !q ||
      opt.label.toLowerCase().includes(q) ||
      opt.value.toLowerCase().includes(q),
  ).map((opt) => ({ value: opt.value, label: opt.label }));
};

const loadAudienceRoleOptions = async (search = "") => {
  const q = search.trim().toLowerCase();
  return ANNOUNCEMENT_AUDIENCE_ROLE_OPTIONS.filter(
    (opt) =>
      !q ||
      opt.label.toLowerCase().includes(q) ||
      opt.value.toLowerCase().includes(q),
  ).map((opt) => ({ value: opt.value, label: opt.label }));
};

async function resolveOptionsByIds(
  ids: string[],
  loader: (search?: string, page?: number, limit?: number) => Promise<Option[]>,
): Promise<Option[]> {
  if (!ids.length) return [];
  const options = await loader("", 1, Math.max(50, ids.length));
  return ids.map((id) => options.find((o) => o.value === id) ?? { value: id, label: id });
}

const AnnouncementForm = ({
  mode = "create",
  initialValues,
  skipAnnouncementDetailsQuery = false,
  onSuccess,
}: AnnouncementFormProps) => {
  const isEdit = mode === "edit";
  const [showAdvanced, setShowAdvanced] = useState(isEdit);
  const announcementId = initialValues?.id ?? null;

  const [selectedTenantOptions, setSelectedTenantOptions] = useState<Option[]>([]);
  const [selectedUserOptions, setSelectedUserOptions] = useState<Option[]>([]);
  const [usersFilterTenantId, setUsersFilterTenantId] = useState<string | null>(null);
  const [usersFilterTenantOption, setUsersFilterTenantOption] = useState<Option | null>(null);

  const { data: detailsResponse, isLoading: isLoadingDetails } =
    useGetAnnouncementDetailsQuery(
      isEdit && announcementId && !skipAnnouncementDetailsQuery ? announcementId : null,
    );

  const resolvedInitialValues = useMemo(() => {
    if (!isEdit) return initialValues;
    if (skipAnnouncementDetailsQuery && initialValues?.id) {
      return initialValues as Announcement;
    }
    return detailsResponse?.data ?? initialValues;
  }, [detailsResponse?.data, initialValues, isEdit, skipAnnouncementDetailsQuery]);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    setError,
    clearErrors,
    getValues,
    formState: { errors },
  } = useForm<AnnouncementFormValues>({
    defaultValues: {
      title: "",
      content: "",
      type: "general",
      audience_type: "all",
      audience_roles: [],
      audience_tenant_ids: [],
      audience_user_ids: [],
      start_date: "",
      end_date: "",
      is_active: true,
      dismissible: true,
    },
  });

  const createMutation = useCreateAnnouncementMutation();
  const updateMutation = useUpdateAnnouncementMutation();
  const audienceType = useWatch({ control, name: "audience_type" });

  const isLoading =
    createMutation.isPending || updateMutation.isPending || isLoadingDetails;

  const loadAudienceUserOptions = useCallback(
    (search = "") => {
      if (usersFilterTenantId) {
        return fetchUserNamesByTenant(usersFilterTenantId, search, 1, 50);
      }
      return fetchUserNames(search, 1, 50);
    },
    [usersFilterTenantId],
  );

  useEffect(() => {
    if (!resolvedInitialValues) return;
    const audience = resolvedInitialValues.audience;

    reset({
      title: resolvedInitialValues.title || "",
      content: resolvedInitialValues.content || "",
      type: resolvedInitialValues.type || "general",
      audience_type: resolvedInitialValues.audience_type || "all",
      audience_roles: audience?.roles ?? [],
      audience_tenant_ids: audience?.tenant_ids ?? [],
      audience_user_ids: audience?.user_ids ?? [],
      start_date: toLocalDatetimeInputValue(resolvedInitialValues.start_date),
      end_date: toLocalDatetimeInputValue(resolvedInitialValues.end_date),
      is_active: resolvedInitialValues.is_active ?? true,
      dismissible: resolvedInitialValues.dismissible ?? true,
    });

    if (!isEdit) return;

    void (async () => {
      if (audience?.tenant_ids?.length) {
        setSelectedTenantOptions(
          await resolveOptionsByIds(audience.tenant_ids, fetchTenantNames),
        );
      } else {
        setSelectedTenantOptions([]);
      }

      if (audience?.user_ids?.length) {
        setSelectedUserOptions(
          await resolveOptionsByIds(audience.user_ids, fetchUserNames),
        );
      } else {
        setSelectedUserOptions([]);
      }

      setUsersFilterTenantId(null);
      setUsersFilterTenantOption(null);
    })();
  }, [resolvedInitialValues, reset, isEdit]);

  const onSubmit = (data: AnnouncementFormValues) => {
    const startIso = toIsoFromLocalDatetime(data.start_date);
    const endIso = toIsoFromLocalDatetime(data.end_date);

    if (new Date(endIso).getTime() < new Date(startIso).getTime()) {
      setError("end_date", { message: "End date must be on or after start date" });
      return;
    }

    if (data.audience_type === "role" && !data.audience_roles.length) {
      setError("audience_roles", { message: "Select at least one role" });
      return;
    }
    if (data.audience_type === "tenant" && !data.audience_tenant_ids.length) {
      setError("audience_tenant_ids", { message: "Select at least one tenant" });
      return;
    }
    if (data.audience_type === "users" && !data.audience_user_ids.length) {
      setError("audience_user_ids", { message: "Select at least one user" });
      return;
    }

    const audience = buildAudiencePayload(
      data.audience_type,
      data.audience_roles,
      data.audience_tenant_ids,
      data.audience_user_ids,
    );

    const payload: CreateAnnouncementInput = {
      title: data.title.trim(),
      content: data.content,
      type: data.type || "general",
      audience_type: data.audience_type,
      audience,
      start_date: startIso,
      end_date: endIso,
      is_active: data.is_active,
      dismissible: data.dismissible,
    };

    if (isEdit && resolvedInitialValues?.id) {
      updateMutation.mutate(
        { id: resolvedInitialValues.id, ...payload },
        {
          onSuccess: () => onSuccess?.(),
          onError: (error) => applyBackendErrors(error, setError, getValues),
        },
      );
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        reset();
        setSelectedTenantOptions([]);
        setSelectedUserOptions([]);
        setUsersFilterTenantId(null);
        setUsersFilterTenantOption(null);
        onSuccess?.();
      },
      onError: (error) => applyBackendErrors(error, setError, getValues),
    });
  };

  const handleAudienceTypeChange = (
    selected: SingleValue<Option> | MultiValue<Option>,
    onChange: (value: string) => void,
  ) => {
    const single = selected as SingleValue<Option>;
    const next = single?.value ?? "all";
    onChange(next);
    setValue("audience_roles", []);
    setValue("audience_tenant_ids", []);
    setValue("audience_user_ids", []);
    setSelectedTenantOptions([]);
    setSelectedUserOptions([]);
    setUsersFilterTenantId(null);
    setUsersFilterTenantOption(null);
    clearErrors(["audience_roles", "audience_tenant_ids", "audience_user_ids"]);
  };

  return (
    <form
      onSubmit={(e) => {
        clearErrors();
        void handleSubmit(onSubmit)(e);
      }}
      className="flex h-[calc(100vh-92px)] flex-col gap-2"
    >
      <FormModeToggle
        showAdvanced={showAdvanced}
        onToggle={() => setShowAdvanced((prev) => !prev)}
        className="!absolute right-14 top-5 z-10"
      />

      <div className="space-y-3 pr-1">
        <SectionSubHeader icon={Info} title="Announcement" />

        <Input
          label="Title"
          star
          {...register("title", {
            required: "Title is required",
            maxLength: { value: 255, message: "Title must be at most 255 characters" },
          })}
          placeholder="Announcement title"
          errors={errors.title}
        />

        <Controller
          name="type"
          control={control}
          rules={{ required: "Type is required" }}
          render={({ field }) => (
            <AsyncSelect
              label="Type"
              star
              apiSearch
              placeholder="Select type"
              loadOptions={fetchAnnouncementTypeOptions}
              value={field.value ? { value: field.value, label: field.value } : null}
              onChange={(selected: SingleValue<Option> | MultiValue<Option>) => {
                const single = selected as SingleValue<Option>;
                field.onChange(single?.value ?? "");
              }}
              errors={errors.type}
            />
          )}
        />

        <Controller
          name="content"
          control={control}
          rules={{
            validate: (value) =>
              hasRichTextContent(value) || "Content is required",
          }}
          render={({ field }) => (
            <RichTextEditor
              label="Content"
              required
              value={field.value}
              onChange={field.onChange}
              error={errors.content?.message}
            />
          )}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="Start date"
            star
            type="datetime-local"
            {...register("start_date", { required: "Start date is required" })}
            errors={errors.start_date}
          />
          <Input
            label="End date"
            star
            type="datetime-local"
            {...register("end_date", { required: "End date is required" })}
            errors={errors.end_date}
          />
        </div>

        <SectionSubHeader icon={Users} title="Audience" />

        <Controller
          name="audience_type"
          control={control}
          rules={{ required: "Audience type is required" }}
          render={({ field }) => (
            <AsyncSelect
              label="Audience type"
              star
              placeholder="Select audience type"
              loadOptions={loadAudienceTypeOptions}
              value={
                field.value
                  ? {
                      value: field.value,
                      label:
                        AUDIENCE_TYPE_OPTIONS.find((o) => o.value === field.value)?.label ??
                        field.value,
                    }
                  : null
              }
              onChange={(selected) => handleAudienceTypeChange(selected, field.onChange)}
              errors={errors.audience_type as { message?: string }}
            />
          )}
        />

        {audienceType === "role" ? (
          <Controller
            name="audience_roles"
            control={control}
            render={({ field }) => (
              <AsyncSelect
                label="Roles"
                star
                isMulti
                placeholder="Select roles"
                loadOptions={loadAudienceRoleOptions}
                value={ANNOUNCEMENT_AUDIENCE_ROLE_OPTIONS.filter((opt) =>
                  (field.value || []).includes(opt.value),
                ).map((opt) => ({ value: opt.value, label: opt.label }))}
                onChange={(selected: SingleValue<Option> | MultiValue<Option>) => {
                  const multi = selected as MultiValue<Option>;
                  field.onChange(multi.map((o) => o.value));
                }}
                errors={errors.audience_roles}
              />
            )}
          />
        ) : null}

        {audienceType === "tenant" ? (
          <Controller
            name="audience_tenant_ids"
            control={control}
            render={({ field }) => (
              <AsyncSelect
                label="Tenants"
                star
                isMulti
                apiSearch
                placeholder="Search and select tenants"
                loadOptions={(search = "") => fetchTenantNames(search, 1, 50)}
                value={selectedTenantOptions}
                onChange={(selected: SingleValue<Option> | MultiValue<Option>) => {
                  const multi = selected as MultiValue<Option>;
                  setSelectedTenantOptions([...multi]);
                  field.onChange(multi.map((o) => o.value));
                }}
                errors={errors.audience_tenant_ids}
              />
            )}
          />
        ) : null}

        {audienceType === "users" ? (
          <>
            <AsyncSelect
              label="Filter by tenant (optional)"
              apiSearch
              isClearable
              placeholder="All tenants — or pick one to narrow users"
              loadOptions={(search = "") => fetchTenantNames(search, 1, 50)}
              value={usersFilterTenantOption}
              onChange={(selected: SingleValue<Option> | MultiValue<Option>) => {
                const single = selected as SingleValue<Option>;
                setUsersFilterTenantOption(single);
                setUsersFilterTenantId(single?.value ?? null);
                setSelectedUserOptions([]);
                setValue("audience_user_ids", []);
              }}
            />

            <Controller
              name="audience_user_ids"
              control={control}
              render={({ field }) => (
                <AsyncSelect
                  key={usersFilterTenantId ?? "all-users"}
                  label="Users"
                  star
                  isMulti
                  apiSearch
                  placeholder={
                    usersFilterTenantId
                      ? "Search users in selected tenant"
                      : "Search all users"
                  }
                  loadOptions={loadAudienceUserOptions}
                  value={selectedUserOptions}
                  onChange={(selected: SingleValue<Option> | MultiValue<Option>) => {
                    const multi = selected as MultiValue<Option>;
                    setSelectedUserOptions([...multi]);
                    field.onChange(multi.map((o) => o.value));
                  }}
                  errors={errors.audience_user_ids}
                />
              )}
            />
          </>
        ) : null}

        {showAdvanced ? (
          <div className="space-y-2">
            <SectionSubHeader icon={SlidersHorizontal} title="Settings" />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Toggle id="is_active" label="Active" {...register("is_active")} />
              <Toggle id="dismissible" label="Dismissible" {...register("dismissible")} />
            </div>
          </div>
        ) : null}
      </div>

      <div className="z-20 mt-auto border-t border-neutral-200 bg-white/95 px-1 py-3 backdrop-blur-sm dark:border-neutral-dark-300 dark:bg-neutral-dark-200/95">
        <div className="flex justify-end">
          <Button type="submit" variant="primary" disabled={isLoading} loading={isLoading}>
            {isEdit ? "Update announcement" : "Create announcement"}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default AnnouncementForm;
