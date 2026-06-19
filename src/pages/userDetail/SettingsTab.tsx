/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useParams } from "react-router-dom";
import {
    Settings,
    Info,
    Bell,
    BellRing,
    Clock3,
    Palette,
    Languages,
    Save,
    CheckCircle2,
} from "lucide-react";
import {
    useGetMyDetailProfileQuery,
    useGetUserDetailProfileQuery,
} from "@/services/operations/profileAPI";
import { useUpdateUserSettingsMutation, type UpdateUserSettingsInput } from "@/services/operations/userAPI";
import Button from "@/components/common/Button";
import SectionHeader from "@/components/common/SectionHeader";
import AsyncSelect, { type Option } from "@/components/common/AsyncSelect";
import Spinner from "@/components/common/Spinner";
import Switch from "@/components/common/Switch";
import { useAppSelector } from "@/store/hooks";
import { hasPermission, PERMISSIONS } from "@/utils/permissions";

// ─── Props ────────────────────────────────────────────────────────────────────

interface SettingsTabProps {
    context: "me" | "user";
}

type SettingsFormValues = Omit<UpdateUserSettingsInput, "id">;

type NormalizedSettingsPayload = Pick<
    Omit<UpdateUserSettingsInput, "id">,
    "language" | "timezone" | "date_format" | "time_format" | "theme" | "push_notifications"
>;

const DATE_FORMAT_OPTIONS = [
    "DD/MM/YYYY",
    "MM/DD/YYYY",
    "YYYY/MM/DD",
    "YYYY/DD/MM",
] as const;

const TIME_FORMAT_OPTIONS = [
    { value: "12h", label: "12-hour" },
    { value: "24h", label: "24-hour" },
] as const;

const DEFAULT_TIME_FORMAT = "24h";
const DEFAULT_DATE_FORMAT = "DD/MM/YYYY";
const DEFAULT_THEME_OPTIONS = "light";
const DEFAULT_LANGUGE_OPTIONS = "en";
const DEFAULT_TIMEZONE_OPTIONS = "Asia/Kolkata";

const THEME_OPTIONS = [
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
    { value: "system_default", label: "System Default" },
] as const;

const LANGUAGE_OPTIONS = [
    { value: "en", label: "English" },
    { value: "hi", label: "Hindi" },
    { value: "ru", label: "Russian" },
] as const;

const TIMEZONE_OPTIONS = [
    { value: "Asia/Kolkata", label: "Asia/Kolkata" },
    { value: "Europe/Moscow", label: "Europe/Moscow" },
] as const;

const normalizeTextValue = (value: unknown) => {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
};

const areValuesEqual = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);

const buildNormalizedSettingsPayload = (values: SettingsFormValues): NormalizedSettingsPayload => ({
    language: normalizeTextValue(values.language),
    timezone: normalizeTextValue(values.timezone),
    date_format: normalizeTextValue(values.date_format),
    time_format: normalizeTextValue(values.time_format),
    theme: normalizeTextValue(values.theme),
    push_notifications: !!values.push_notifications,
});

const SelectField = ({
    label,
    value,
    onChange,
    options,
    placeholder = "Select an option",
    disabled = false,
    description,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: readonly { value: string; label: string }[];
    placeholder?: string;
    disabled?: boolean;
    description?: string;
}) => (
    <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-neutral-800 dark:text-neutral-dark-900">{label}</label>
        {description ? (
            <p className="text-[11px] leading-5 text-neutral-400 dark:text-neutral-dark-500">{description}</p>
        ) : null}
        <AsyncSelect
            loadOptions={async () => options.map((o) => ({ value: o.value, label: o.label }))}
            placeholder={placeholder}
            value={
                options.map((o) => ({ value: o.value, label: o.label })).find(
                    (o) => o.value === value,
                ) ?? null
            }
            onChange={(v) => onChange(String((v as import('react-select').SingleValue<Option>)?.value ?? ""))}
            isClearable={false}
            isDisabled={disabled}
        />
    </div>
);

const SettingsSection = ({
    icon: Icon,
    title,
    description,
    children,
}: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description?: string;
    children: React.ReactNode;
}) => (
    <section className="rounded-xs border border-neutral-200 dark:border-neutral-dark-200 bg-white dark:bg-neutral-dark-100 p-4 shadow-sm sm:p-5">
        <SectionHeader icon={Icon} title={title} description={description} compact />
        <div className="mt-3 space-y-3.5">{children}</div>
    </section>
);

// ─── Component ────────────────────────────────────────────────────────────────

const SettingsTab: React.FC<SettingsTabProps> = ({ context }) => {
    const { id } = useParams<{ id: string }>();
    const loggedUser = useAppSelector((state) => state.auth.user);
    const userPermissions = useAppSelector((state) => state.auth.permissions);
    const canEditSettings =
        context === "me"
            ? true
            : !!id &&
              (loggedUser?.role === "admin" || loggedUser?.role === "super_admin") &&
              hasPermission(userPermissions, PERMISSIONS.USER.UPDATE as any);
    const updateUserSettings = useUpdateUserSettingsMutation();

    // Only fire the relevant query — avoids calling both APIs simultaneously
    const myQuery = useGetMyDetailProfileQuery(context === "me");
    const userQuery = useGetUserDetailProfileQuery(context === "user" ? id : null);
    const query = context === "me" ? myQuery : userQuery;

    const raw = (query.data as any)?.data;
    const profile = raw?.user ?? raw?.data?.user ?? raw ?? null;
    const {
        register,
        reset,
        handleSubmit,
        setValue,
        control,
        formState: { isDirty },
    } = useForm<SettingsFormValues>({
        defaultValues: {
            language: DEFAULT_LANGUGE_OPTIONS,
            timezone: DEFAULT_TIMEZONE_OPTIONS,
            date_format: DEFAULT_DATE_FORMAT,
            time_format: DEFAULT_TIME_FORMAT,
            theme: DEFAULT_THEME_OPTIONS,
            push_notifications: false,
            notification_preferences: null,
        },
    });

    useEffect(() => {
        register("language");
        register("date_format");
        register("time_format");
        register("theme");
        register("push_notifications");
    }, [register]);

    useEffect(() => {
        if (!profile) return;

        reset({
            language: profile.language ?? DEFAULT_LANGUGE_OPTIONS,
            timezone: profile.timezone ?? DEFAULT_TIMEZONE_OPTIONS,
            date_format: profile.date_format ?? DEFAULT_DATE_FORMAT,
            time_format: profile.time_format ?? DEFAULT_TIME_FORMAT,
            theme: profile.theme ?? DEFAULT_THEME_OPTIONS,
            push_notifications: profile.push_notifications ?? false,
            notification_preferences: profile.notification_preferences ?? null,
        });
    }, [profile, reset]);

    const initialSettings = useMemo<NormalizedSettingsPayload | null>(() => {
        if (!profile) return null;

        return buildNormalizedSettingsPayload(
            {
                language: profile.language ?? DEFAULT_LANGUGE_OPTIONS,
                timezone: profile.timezone ?? DEFAULT_TIMEZONE_OPTIONS,
                date_format: profile.date_format ?? DEFAULT_DATE_FORMAT,
                time_format: profile.time_format ?? DEFAULT_TIME_FORMAT,
                theme: profile.theme ?? DEFAULT_THEME_OPTIONS,
                push_notifications: profile.push_notifications ?? false,
                notification_preferences: profile.notification_preferences ?? null,
            },
        );
    }, [profile]);

    const watchedValues = useWatch({ control });
    const summaryItems = useMemo(
        () => [
            { label: "Push notifications", value: watchedValues.push_notifications ? "Enabled" : "Disabled" },
            { label: "Language", value: watchedValues.language || "Not set" },
            { label: "Timezone", value: watchedValues.timezone || "Not set" },
            { label: "Date format", value: watchedValues.date_format || "Not set" },
            { label: "Time format", value: watchedValues.time_format || "Not set" },
            { label: "Theme", value: watchedValues.theme || "Not set" },
        ],
        [
            watchedValues.date_format,
            watchedValues.language,
            watchedValues.push_notifications,
            watchedValues.theme,
            watchedValues.time_format,
            watchedValues.timezone,
        ],
    );

    const submitSettings = async (values: SettingsFormValues) => {
        if (!initialSettings) return;
        if (context === "user" && !id) return;

        const normalizedPayload = buildNormalizedSettingsPayload(values);
        const changedEntries = Object.entries(normalizedPayload).filter(
            ([key, value]) => !areValuesEqual(initialSettings[key as keyof NormalizedSettingsPayload], value),
        );

        if (changedEntries.length === 0) {
            reset(values);
            return;
        }

        await updateUserSettings.mutateAsync(
            context === "user"
                ? {
                      id,
                      ...Object.fromEntries(changedEntries),
                  }
                : Object.fromEntries(changedEntries),
        );
        reset(values);
    };

    const onSubmit = handleSubmit(submitSettings);

    if (query.isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Spinner size={3} />
            </div>
        );
    }

    if (query.isError || !profile) {
        return (
            <div className="p-6">
                <div className="p-4 rounded-xs border border-error-500/30 bg-error-500/5 text-error-600 text-sm">
                    Failed to load settings.
                </div>
            </div>
        );
    }

    const fullName = profile.full_name || [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "User";
    const summaryBadgeLabel = canEditSettings ? (isDirty ? "Unsaved changes" : "All changes saved") : "Read only";

    return (
        <div className="mx-auto max-w-4xl space-y-4 p-3 sm:p-4 lg:p-5">
            <div className="overflow-hidden rounded-xs border border-neutral-200 bg-white shadow-sm dark:border-neutral-dark-200 dark:bg-neutral-dark-100">
                <div className="h-20 bg-gradient-to-br from-brand-400 via-brand-500 to-brand-700 dark:from-brand-600 dark:to-brand-900" />
                <div className="px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="min-w-0">
                            <div className="flex items-start gap-3">
                                <div className="-mt-8 inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/70 bg-white text-brand-600 shadow-sm dark:border-neutral-dark-200 dark:bg-neutral-dark-100 dark:text-brand-400 sm:-mt-10 sm:h-16 sm:w-16">
                                    <Settings className="h-6 w-6" />
                                </div>
                                <div className="min-w-0 pt-1">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400 dark:text-neutral-dark-500">
                                        Account Preferences
                                    </p>
                                    <h1 className="truncate text-xl font-bold text-neutral-900 dark:text-neutral-dark-950 sm:text-2xl">
                                        {fullName}
                                    </h1>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                            <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-600 dark:border-neutral-dark-200 dark:bg-neutral-dark-200/40 dark:text-neutral-dark-700">
                                <CheckCircle2 className="h-3.5 w-3.5 text-brand-500" />
                                {summaryBadgeLabel}
                            </div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-600 dark:border-neutral-dark-200 dark:bg-neutral-dark-200/40 dark:text-neutral-dark-700">
                                <Languages className="h-3.5 w-3.5 text-brand-500" />
                                Preferences
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xs border border-neutral-200 bg-white px-4 py-3 shadow-sm dark:border-neutral-dark-200 dark:bg-neutral-dark-100">
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-dark-950">Settings Panel</p>
                </div>
                <div className="flex items-center gap-2">
                    {canEditSettings ? (
                        <Button
                            type="submit"
                            form="user-settings-form"
                            loading={updateUserSettings.isPending}
                            disabled={!isDirty}
                            className="px-4"
                        >
                            <Save className="w-4 h-4" />
                            Save Settings
                        </Button>
                    ) : null}
                </div>
            </div>

            <form id="user-settings-form" onSubmit={onSubmit} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_300px]">
                <div className="space-y-4">
                    <SettingsSection
                        icon={Bell}
                        title="Notifications"
                        description="Manage push notification preferences for this user."
                    >
                        <div className="flex items-center justify-between gap-4 rounded-xs border border-neutral-200 bg-neutral-50/70 px-4 py-3.5 dark:border-neutral-dark-200 dark:bg-neutral-dark-200/40">
                            <div className="flex min-w-0 items-center gap-3">
                                <div className="shrink-0 rounded-xs bg-brand-50 p-2 dark:bg-brand-500/10">
                                    <BellRing className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-dark-950">Push Notifications</p>
                                    <p className="text-[11px] leading-5 text-neutral-500 dark:text-neutral-dark-600">
                                        Enable push delivery for supported notification channels.
                                    </p>
                                </div>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-1">
                                <Switch
                                    name="push_notifications"
                                    checked={!!watchedValues.push_notifications}
                                    onChange={(event) => setValue("push_notifications", event.target.checked, { shouldDirty: true })}
                                    disabled={!canEditSettings}
                                />
                                <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-dark-500">
                                    {watchedValues.push_notifications ? "On" : "Off"}
                                </span>
                            </div>
                        </div>
                    </SettingsSection>

                    <SettingsSection
                        icon={Clock3}
                        title="Locale & Display"
                        description="Adjust language, time, and theme values."
                    >
                        <div className="grid gap-3 sm:grid-cols-2">
                            <SelectField
                                label="Language"
                                value={watchedValues.language ?? ""}
                                onChange={(value) => setValue("language", value, { shouldDirty: true })}
                                options={LANGUAGE_OPTIONS}
                                disabled={!canEditSettings}
                                description=""
                            />
                            <SelectField
                                label="Timezone"
                                value={watchedValues.timezone ?? ""}
                                onChange={(value) => setValue("timezone", value, { shouldDirty: true })}
                                options={TIMEZONE_OPTIONS}
                                disabled={!canEditSettings}
                            />
                            <SelectField
                                label="Date Format"
                                value={watchedValues.date_format ?? ""}
                                onChange={(value) => setValue("date_format", value, { shouldDirty: true })}
                                options={DATE_FORMAT_OPTIONS.map((value) => ({ value, label: value }))}
                                disabled={!canEditSettings}
                                
                            />
                            <SelectField
                                label="Time Format"
                                value={watchedValues.time_format ?? ""}
                                onChange={(value) => setValue("time_format", value, { shouldDirty: true })}
                                options={TIME_FORMAT_OPTIONS}
                                disabled={!canEditSettings}

                            />
                            <div className="sm:col-span-2">
                                <SelectField
                                    label="Theme"
                                    value={watchedValues.theme ?? ""}
                                    onChange={(value) => setValue("theme", value, { shouldDirty: true })}
                                    options={THEME_OPTIONS}
                                    disabled={!canEditSettings}
                                
                                />
                            </div>
                        </div>
                    </SettingsSection>

                    {!canEditSettings ? (
                        <div className="flex items-start gap-2 rounded-xs border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400">
                            <Info className="mt-0.5 h-4 w-4 shrink-0" />
                            <p>
                                You need user update permission to edit these settings.
                            </p>
                        </div>
                    ) : null}
                </div>

                <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
                    <SettingsSection
                        icon={Palette}
                        title="Live Summary"
                        description="Quick view of the current state"
                    >
                        <div className="space-y-2.5 text-sm">
                            {summaryItems.map((item) => (
                                <div
                                    key={item.label}
                                    className="flex items-center justify-between gap-3 rounded-xs border border-neutral-100 bg-neutral-50/80 px-3 py-2 dark:border-neutral-dark-200 dark:bg-neutral-dark-200/30"
                                >
                                    <span className="text-xs font-medium text-neutral-500 dark:text-neutral-dark-600">{item.label}</span>
                                    <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-dark-950">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </SettingsSection>
                </div>
            </form>
        </div>
    );
};

export default SettingsTab;
