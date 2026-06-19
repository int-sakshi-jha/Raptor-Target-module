import { useEffect, useMemo, useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import {
  useCreatePermissionMutation,
  useGetPermissionDetailsQuery,
  useGetPermissionListQuery,
  useUpdatePermissionMutation,
  PERMISSION_PARENT_OPTIONS_LIST_PARAMS,
  type CreatePermissionInput,
} from "@/services/operations/permissionAPI";
import type {
  GetAllPermissionsResponse,
  Permission,
} from "@/services/operations/permissionAPI";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import AsyncSelect, { type Option } from "@/components/common/AsyncSelect";
import Toggle from "@/components/common/Toggle";
import FormModeToggle from "@/components/common/FormModeToggle";
import type { SingleValue, MultiValue } from "react-select";
import { cleanEmptyStrings } from "@/utils/requestQuery";
import { applyBackendErrors } from "@/utils/formValidators";
import { PERMISSION_ROLE_OPTIONS } from "@/utils/selectOptions";
import SectionSubHeader from "@/components/common/SectionSubHeader";
import { Info, SlidersHorizontal } from "lucide-react";

type PermissionFormValues = {
  name: string;
  display_name: string;
  module: string;
  roles: string[];
  parent_permission_id?: string | null;
  is_active?: boolean;
  is_default?: boolean;
};

export type ParentPermissionListResult = {
  data: GetAllPermissionsResponse | undefined;
  isLoading: boolean;
};

type PermissionFormProps = {
  mode?: "create" | "edit";
  initialValues?: Partial<Permission>;
  /** When the parent already loaded full permission details (e.g. permission detail page), skip GET-by-id in this form to avoid a duplicate request. */
  skipPermissionDetailsQuery?: boolean;
  /**
   * When set, the parent owns the GET permission list used for the parent-permission dropdown
   * (same React Query cache key as `PERMISSION_PARENT_OPTIONS_LIST_PARAMS`). The form will not
   * run a second list request.
   */
  parentPermissionListResult?: ParentPermissionListResult;
  onSuccess?: () => void;
};

const ROLE_OPTIONS = PERMISSION_ROLE_OPTIONS;

const PermissionForm = ({
  mode = "create",
  initialValues,
  skipPermissionDetailsQuery = false,
  parentPermissionListResult,
  onSuccess,
}: PermissionFormProps) => {
  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    clearErrors,
    getValues,
    formState: { errors },
  } = useForm<PermissionFormValues>({

    defaultValues: {
      name: "",
      display_name: "",
      module: "",
      roles: [],
      parent_permission_id: null,
      is_active: true,
      is_default: false,
    },
  });

  const createMutation = useCreatePermissionMutation();
  const updateMutation = useUpdatePermissionMutation();
  const formFetchesParentList = parentPermissionListResult === undefined;
  const internalParentList = useGetPermissionListQuery({
    ...PERMISSION_PARENT_OPTIONS_LIST_PARAMS,
    enabled: formFetchesParentList,
  });
  const permissionsData = formFetchesParentList
    ? internalParentList.data
    : parentPermissionListResult.data;
  const isLoadingOptions = formFetchesParentList
    ? internalParentList.isLoading
    : parentPermissionListResult.isLoading;



  const isEdit = mode === "edit";
  const [showAdvanced, setShowAdvanced] = useState(isEdit);
  const permissionId = initialValues?.id ?? null;
  const shouldFetchPermissionDetails =
    isEdit && !!permissionId && !skipPermissionDetailsQuery;
  const { data: permissionDetailsResponse, isLoading: isLoadingDetails } =
    useGetPermissionDetailsQuery(shouldFetchPermissionDetails ? permissionId : null);
  const resolvedInitialValues = useMemo(() => {
    if (!isEdit) return initialValues;
    if (skipPermissionDetailsQuery && initialValues?.id) {
      return initialValues as Permission;
    }
    return permissionDetailsResponse?.data ?? initialValues;
  }, [
    initialValues,
    isEdit,
    permissionDetailsResponse?.data,
    skipPermissionDetailsQuery,
  ]);
  const isLoading =
    createMutation.isPending || updateMutation.isPending || isLoadingDetails;

  // Convert permissions to options for AsyncSelect
  const permissionOptions = useMemo(() => {
    const permissions = permissionsData?.data?.permissions ?? [];
    return permissions
      .filter((perm: Permission) => !isEdit || perm.id !== resolvedInitialValues?.id)
      .map((perm: Permission) => ({
        value: perm.id,
        label: perm.display_name || perm.name,
      }));
  }, [permissionsData, isEdit, resolvedInitialValues?.id]);

  const parentPermissionId = useWatch({
    control,
    name: "parent_permission_id",
  });
  const selectedRoles = useWatch({ control, name: "roles" }) || [];

  // Get current parent permission option
  const currentParentOption = useMemo(() => {
    const permissions = permissionsData?.data?.permissions ?? [];
    if (!parentPermissionId || permissions.length === 0) return null;
    const parent = permissions.find(
      (p: Permission) => p.id === parentPermissionId,
    );
    return parent
      ? { value: parent.id, label: parent.display_name || parent.name }
      : null;
  }, [parentPermissionId, permissionsData]);

  useEffect(() => {
    if (isEdit && resolvedInitialValues) {
      reset({
        name: resolvedInitialValues.name || "",
        display_name: resolvedInitialValues.display_name || "",
        module: resolvedInitialValues.module || "",
        roles: resolvedInitialValues.roles || [],
        parent_permission_id:
          (
            resolvedInitialValues as Permission & {
              parent_permission_id?: string | null;
            }
          ).parent_permission_id || null,
        is_active: resolvedInitialValues.is_active ?? false,
        is_default: resolvedInitialValues.is_default ?? false,
      });
    }
  }, [isEdit, resolvedInitialValues, reset]);

  const onSubmit = (data: PermissionFormValues) => {
    const cleaned = cleanEmptyStrings(data) as PermissionFormValues;

    const finalData: CreatePermissionInput = {
      name: cleaned.name,
      display_name: cleaned.display_name,
      module: cleaned.module,
      roles: cleaned.roles,
      parent_permission_id: cleaned.parent_permission_id ?? null,
      is_active: cleaned.is_active,
      is_default: cleaned.is_default,
    };

    if (isEdit && resolvedInitialValues?.id) {
      updateMutation.mutate(
        { id: resolvedInitialValues.id, ...finalData },
        {
          onSuccess: () => {
            if (onSuccess) onSuccess();
          },
          onError: (error) => applyBackendErrors(error, setError, getValues),
        },
      );
    } else {
      createMutation.mutate(finalData, {
        onSuccess: () => {
          reset();
          if (onSuccess) onSuccess();
        },
        onError: (error) => applyBackendErrors(error, setError, getValues),
      });
    }
  };

  const handleResetForm = () => {
    if (isEdit && resolvedInitialValues) {
      reset({
        name: resolvedInitialValues.name || "",
        display_name: resolvedInitialValues.display_name || "",
        module: resolvedInitialValues.module || "",
        roles: resolvedInitialValues.roles || [],
        parent_permission_id:
          (
            resolvedInitialValues as Permission & {
              parent_permission_id?: string | null;
            }
          ).parent_permission_id || null,
        is_active: resolvedInitialValues.is_active ?? false,
        is_default: resolvedInitialValues.is_default ?? false,
      });
      return;
    }

    reset({
      name: "",
      display_name: "",
      module: "",
      roles: [],
      parent_permission_id: null,
      is_active: true,
      is_default: false,
    });
  };

  return (
    <form
      onSubmit={(e) => {
        clearErrors();
        void handleSubmit(onSubmit)(e);
      }}
      className="flex h-[calc(100vh-92px)] flex-col gap-2"
    >

      {/* ── Form Mode Toggle ── */}
      <FormModeToggle
        showAdvanced={showAdvanced}
        onToggle={() => setShowAdvanced((prev) => !prev)}
        className="!absolute right-14 top-5 z-10"
      />

      <div className="space-y-2">
        {/* Basic Information */}
        <div className="space-y-2">
          <SectionSubHeader
            icon={Info}
            title="Basic Information"
          />

          <div>
            <Input
              label="Name"
              star
              {...register("name", {
                required: "Name is required",
                minLength: {
                  value: 1,
                  message: "Name must be at least 1 character",
                },
                maxLength: {
                  value: 255,
                  message: "Name must be at most 255 characters",
                },
              })}
              placeholder="Permission name"
              errors={errors.name}
            />
          </div>

          <div>
            <Input
              label="Display Name"
              star
              {...register("display_name", {
                required: "Display name is required",
                minLength: {
                  value: 1,
                  message: "Display name must be at least 1 character",
                },
                maxLength: {
                  value: 255,
                  message: "Display name must be at most 255 characters",
                },
              })}
              placeholder="Display name"
              errors={errors.display_name}
            />
          </div>

          <div>
            <Input
              label="Module"
              star
              placeholder="Module name"
              {...register("module", {
                required: "Module is required",
                minLength: { value: 1, message: "Module must be at least 1 character" },
                maxLength: { value: 255, message: "Module must be at most 255 characters" },
              })}
              errors={errors.module}
            />

          </div>

          {showAdvanced && (
            <div>
              <Controller
                name="parent_permission_id"
                control={control}
                render={({ field }) => (
                  <AsyncSelect
                    label="Parent Permission"
                    placeholder="Parent permission"
                    loadOptions={async () => {
                      // Return the permission options
                      return permissionOptions;
                    }}
                    value={currentParentOption}
                    onChange={(
                      selected: SingleValue<Option> | MultiValue<Option>,
                    ) => {
                      const singleValue = selected as SingleValue<Option>;
                      field.onChange(singleValue?.value || null);
                    }}
                    isClearable={true}
                    isLoading={isLoadingOptions}
                    errors={errors.parent_permission_id}
                  />
                )}
              />
            </div>)}
        </div>

        {/* Roles & Settings */}
        <div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Roles <sup className="text-error-500">*</sup>
            </label>
            <Controller
              name="roles"
              control={control}
              rules={{
                required: "At least one role is required",
                validate: (value) => {
                  if (!Array.isArray(value) || value.length === 0) {
                    return "At least one role is required";
                  }
                  const normalized = value.map((r) => r.toLowerCase());
                  const unique = new Set(normalized);
                  if (normalized.length !== unique.size) {
                    return "Duplicate roles are not allowed";
                  }
                  return true;
                },
              }}
              render={({ field }) => (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    {ROLE_OPTIONS.map((role) => (
                      <label
                        key={role.value}
                        className={`flex items-center gap-2 py-2 px-3 rounded-xs border cursor-pointer transition-colors ${selectedRoles.includes(role.value)
                          ? "border-brand-600 bg-brand-50 dark:bg-brand-600/10"
                          : "border-neutral-200 dark:border-neutral-700 hover:border-brand-300 dark:hover:border-brand-700"
                          }`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={selectedRoles.includes(role.value)}
                          onChange={(e) => {
                            const currentRoles = field.value || [];
                            if (e.target.checked) {
                              field.onChange([...currentRoles, role.value]);
                            } else {
                              field.onChange(
                                currentRoles.filter((r) => r !== role.value),
                              );
                            }
                          }}
                        />
                        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-dark-700">{role.label}</span>
                      </label>
                    ))}
                  </div>
                  {errors.roles && (
                    <p className="mt-1 text-xs text-error-500">
                      {errors.roles.message as string}
                    </p>
                  )}
                </div>
              )}
            />
          </div>
        </div>

        {showAdvanced && (
          <div className="space-y-2">
            <SectionSubHeader icon={SlidersHorizontal} title="Settings" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Toggle id="is_active" label="Is Active" {...register("is_active")} />

              <Toggle
                id="is_default"
                label="Default Permission"
                {...register("is_default")}
              />
            </div>
          </div>)}
      </div>

      <div className="z-20 mt-auto border-t border-neutral-200 bg-white/95 px-1 py-3 backdrop-blur-sm dark:border-neutral-500 dark:bg-neutral-dark-200/95">
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleResetForm}
            disabled={isLoading}
          >
            Reset
          </Button>

          <Button
            type="submit"
            variant="primary"
            disabled={isLoading}
            loading={isLoading}
          >
            {isEdit ? "Update Permission" : "Create Permission"}
          </Button>
        </div>
      </div>
    </form >
  );
};

export default PermissionForm;
