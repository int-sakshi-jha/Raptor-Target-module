import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Shield } from "lucide-react";
import Button from "@/components/common/Button";
import Spinner from "@/components/common/Spinner";
import Toggle from "@/components/common/Toggle";
import {
  useGetPermissionNameRoleWiseQuery,
  type PermissionModuleGroup,
  type PermissionNameRoleWise,
} from "@/services/operations/permissionAPI";
import { formatModuleName, formatPermissionText } from "@/utils/permissions";

const textMuted = "text-neutral-400 dark:text-neutral-dark-500";
const textSecondary = "text-neutral-600 dark:text-neutral-dark-700";
const textBody = "text-neutral-900 dark:text-neutral-dark-950";
const linkBrand =
  "text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300";

export type PermissionPickerProps = {
  value: string[];
  onChange: (next: string[]) => void;
  className?: string;
  filterRole?: string | null;
  enabled?: boolean;
  /** Create flow: when true, auto-select `is_default` permissions once per role. */
  autoSelectDefaults?: boolean;
  /** Edit flow: when true, shows a button to add default permissions. */
  showAddDefaultsButton?: boolean;
};

function countSelected(names: (string | undefined | null)[], selected: Set<string>) {
  return names.filter((name) => name && selected.has(name)).length;
}

function getPermissionNames(group: PermissionModuleGroup) {
  return group.permissions?.map((permission) => permission?.name).filter(Boolean) as string[];
}

function EmptyMessage({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xs border border-dashed border-neutral-200 bg-neutral-50/90 px-4 py-10 text-center dark:border-neutral-dark-300 dark:bg-neutral-dark-100/70">
      <p className={`text-sm leading-relaxed ${textSecondary}`}>{children}</p>
    </div>
  );
}

function MasterAccessBanner({
  isAllSelected,
  onGrantAll,
  onRevokeAll,
}: {
  isAllSelected: boolean;
  onGrantAll: () => void;
  onRevokeAll: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xs border border-brand-200/80 bg-brand-50/90 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between dark:border-brand-700/40 dark:bg-brand-950/25">
      <div className="flex min-w-0 items-start gap-2.5">
        <Shield
          className="mt-0.5 h-5 w-5 shrink-0 text-brand-600 dark:text-brand-400"
          aria-hidden
        />
        <div className="min-w-0">
          <p className="text-sm font-bold text-brand-800 dark:text-brand-200">
            Permission Picker
          </p>
          <p className="mt-0.5 text-xs leading-snug text-brand-700/80 dark:text-brand-300/80">
            Grant or revoke all assignable permissions for this user in one click.
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        className="!shrink-0 !border-neutral-200 !bg-white !px-3 !py-2 !text-xs !font-semibold dark:!border-neutral-dark-300 dark:!bg-neutral-dark-200"
        onClick={isAllSelected ? onRevokeAll : onGrantAll}
      >
        <span className="inline-flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5" aria-hidden />
          {isAllSelected ? "Revoke All" : "Grant All"}
        </span>
      </Button>
    </div>
  );
}

function ModuleEnableItem({
  module,
  displayName,
  isEnabled,
  onToggleEnabled,
  onNavigate,
}: {
  module: string;
  displayName: string;
  isEnabled: boolean;
  onToggleEnabled: (checked: boolean) => void;
  onNavigate: () => void;
}) {
  const checkboxId = `module-enable-${module}`;

  return (
    <div
      className={`flex items-center gap-2 rounded-xs border px-3 py-2.5 transition-colors ${
        isEnabled
          ? "border-brand-300/90 bg-brand-50/70 dark:border-brand-600/50 dark:bg-brand-950/30"
          : "border-neutral-200 bg-white dark:border-neutral-dark-300 dark:bg-neutral-dark-200"
      }`}
    >
      <button
        type="button"
        onClick={onNavigate}
        className={`min-w-0 flex-1 text-left text-sm font-semibold leading-tight transition-colors hover:text-brand-700 dark:hover:text-brand-300 ${
          isEnabled ? "text-brand-800 dark:text-brand-200" : textBody
        }`}
      >
        {displayName}
      </button>
      <input
        id={checkboxId}
        type="checkbox"
        checked={isEnabled}
        onChange={(event) => onToggleEnabled(event.target.checked)}
        className="form-checkbox h-4 w-4 shrink-0 cursor-pointer rounded-xs border-2 border-brand-400 accent-brand-600 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:ring-offset-1 dark:border-brand-400 dark:checked:border-brand-400"
        aria-label={`Enable ${displayName} module`}
      />
    </div>
  );
}

function PermissionModuleCard({
  group,
  selectedPermissionSet,
  sectionRef,
  onToggleModulePermissions,
  onTogglePermission,
}: {
  group: PermissionModuleGroup;
  selectedPermissionSet: Set<string>;
  sectionRef: (el: HTMLDivElement | null) => void;
  onToggleModulePermissions: (permissionNames: string[], checked: boolean) => void;
  onTogglePermission: (permissionName: string, checked: boolean) => void;
}) {
  const permissionNames = getPermissionNames(group);
  const selectedCount = countSelected(permissionNames, selectedPermissionSet);
  const isGroupSelected =
    permissionNames.length > 0 && selectedCount === permissionNames.length;

  return (
    <div
      ref={sectionRef}
      data-module={group.module}
      className="scroll-mt-3 overflow-hidden rounded-xs border border-neutral-200 bg-white shadow-sm dark:border-neutral-dark-300 dark:bg-neutral-dark-200"
    >
      <div className="flex items-center justify-between gap-2 border-b border-neutral-200/90 px-3 py-2.5 dark:border-neutral-dark-200">
        <div className="min-w-0">
          <p className={`text-sm font-bold leading-tight ${textBody}`}>
            {formatModuleName(group.module)}
          </p>
          <p className={`mt-0.5 text-[11px] leading-tight ${textMuted}`}>
            {group.permissions.length} specific rule
            {group.permissions.length === 1 ? "" : "s"}
          </p>
        </div>
        <button
          type="button"
          className={`shrink-0 text-xs font-semibold leading-none ${linkBrand}`}
          onClick={() => onToggleModulePermissions(permissionNames, !isGroupSelected)}
        >
          {isGroupSelected ? "Deselect All" : "Select All"}
        </button>
      </div>

      <ul className="divide-y divide-neutral-100 dark:divide-neutral-dark-200/80 px-2 space-y-1 pb-1">
        {group.permissions?.filter(Boolean).map((permission: PermissionNameRoleWise) => (
          <li
            key={permission.id || permission.name}
            className="transition-colors hover:bg-brand-50/40 dark:hover:bg-brand-950/20"
          >
            <PermissionToggleRow
              permission={permission}
              checked={selectedPermissionSet.has(permission.name)}
              onToggle={onTogglePermission}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function PermissionToggleRow({
  permission,
  checked,
  onToggle,
}: {
  permission: PermissionNameRoleWise;
  checked: boolean;
  onToggle: (permissionName: string, checked: boolean) => void;
}) {
  if (!permission) return null;

  const label = formatPermissionText(permission.display_name || permission.name);
  const switchId = `permission-${permission.name}`;

  return (
    <Toggle
      id={switchId}
      name={`permission-${permission.name}`}
      label={label}
      checked={checked}
      onChange={(event) => onToggle(permission.name, event.target.checked)}
      aria-label={label}
      className="!gap-0"
      labelClassName="!py-0"
    />
  );
}

const PermissionPicker = ({
  value,
  onChange,
  className = "",
  filterRole,
  enabled = true,
  autoSelectDefaults = true,
  showAddDefaultsButton = false,
}: PermissionPickerProps) => {
  const hasRoleFilter = filterRole !== undefined;

  const {
    permissionGroups,
    allPermissionNames,
    isLoading: isLoadingPermissions,
    isError: isPermissionsError,
  } = useGetPermissionNameRoleWiseQuery(
    hasRoleFilter
      ? {
          role: filterRole,
          enabled,
        }
      : undefined,
  );

  const defaultsInitializedForRole = useRef<string | null>(null);
  const permissionsPanelRef = useRef<HTMLDivElement | null>(null);
  const moduleSectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const selectedPermissions = useMemo(() => value ?? [], [value]);
  const selectedPermissionSet = useMemo(
    () => new Set(selectedPermissions),
    [selectedPermissions],
  );

  /** Per-role explicit enable/disable; undefined entry = infer from selected permissions. */
  const [moduleEnableByRole, setModuleEnableByRole] = useState<
    Record<string, Record<string, boolean>>
  >({});

  const roleKey =
    filterRole != null && String(filterRole).trim() !== "" ? String(filterRole).trim() : null;

  const moduleEnableState = useMemo(
    () => (roleKey ? (moduleEnableByRole[roleKey] ?? {}) : {}),
    [moduleEnableByRole, roleKey],
  );

  const setModuleEnableState = useCallback(
    (
      updater:
        | Record<string, boolean>
        | ((prev: Record<string, boolean>) => Record<string, boolean>),
    ) => {
      if (!roleKey) return;
      setModuleEnableByRole((prev) => {
        const current = prev[roleKey] ?? {};
        const next = typeof updater === "function" ? updater(current) : updater;
        return { ...prev, [roleKey]: next };
      });
    },
    [roleKey],
  );

  const defaultPermissionNames = useMemo(() => {
    return permissionGroups
      .flatMap((group) => group.permissions ?? [])
      .filter((permission) => !!permission?.is_default)
      .map((permission) => permission?.name)
      .filter(Boolean) as string[];
  }, [permissionGroups]);

  const enabledModules = useMemo(() => {
    const modules = new Set<string>();
    for (const group of permissionGroups) {
      const module = group.module;
      const explicit = moduleEnableState[module];
      if (explicit === true) {
        modules.add(module);
        continue;
      }
      if (explicit === false) continue;

      const names = getPermissionNames(group);
      if (names.some((name) => selectedPermissionSet.has(name))) {
        modules.add(module);
      }
    }
    return modules;
  }, [moduleEnableState, permissionGroups, selectedPermissionSet]);

  useEffect(() => {
    if (!autoSelectDefaults) return;
    if (!roleKey) return;
    if (isLoadingPermissions || isPermissionsError) return;
    if (defaultsInitializedForRole.current === roleKey) return;

    defaultsInitializedForRole.current = roleKey;

    if (defaultPermissionNames.length === 0) return;
    const next = Array.from(new Set([...selectedPermissions, ...defaultPermissionNames]));
    if (next.length !== selectedPermissions.length) {
      onChange(next);
    }
  }, [
    autoSelectDefaults,
    defaultPermissionNames,
    roleKey,
    isLoadingPermissions,
    isPermissionsError,
    onChange,
    selectedPermissions,
  ]);

  const selectedPermissionsCount = countSelected(
    allPermissionNames,
    selectedPermissionSet,
  );
  const isAllPermissionsSelected =
    allPermissionNames.length > 0 &&
    selectedPermissionsCount === allPermissionNames.length;

  const updateSelectedPermissions = useCallback(
    (next: string[]) => {
      onChange(Array.from(new Set(next)));
    },
    [onChange],
  );

  const handleGrantAll = useCallback(() => {
    updateSelectedPermissions(allPermissionNames);
    setModuleEnableState(
      Object.fromEntries(permissionGroups.map((group) => [group.module, true])),
    );
  }, [allPermissionNames, permissionGroups, setModuleEnableState, updateSelectedPermissions]);

  const handleRevokeAll = useCallback(() => {
    updateSelectedPermissions([]);
    setModuleEnableState({});
  }, [setModuleEnableState, updateSelectedPermissions]);

  const handleToggleModulePermissions = useCallback(
    (permissionNames: string[], checked: boolean) => {
      const next = checked
        ? [...selectedPermissions, ...permissionNames]
        : selectedPermissions.filter((name) => !permissionNames.includes(name));
      updateSelectedPermissions(next);
    },
    [selectedPermissions, updateSelectedPermissions],
  );

  const handleTogglePermission = useCallback(
    (permissionName: string, checked: boolean) => {
      const next = checked
        ? [...selectedPermissions, permissionName]
        : selectedPermissions.filter((name) => name !== permissionName);
      updateSelectedPermissions(next);
    },
    [selectedPermissions, updateSelectedPermissions],
  );

  const handleAddDefaultPermissions = useCallback(() => {
    if (defaultPermissionNames.length === 0) return;
    updateSelectedPermissions([...selectedPermissions, ...defaultPermissionNames]);
    setModuleEnableState((prev) => {
      const next = { ...prev };
      for (const group of permissionGroups) {
        const names = getPermissionNames(group);
        if (names.some((name) => defaultPermissionNames.includes(name))) {
          next[group.module] = true;
        }
      }
      return next;
    });
  }, [
    defaultPermissionNames,
    permissionGroups,
    selectedPermissions,
    setModuleEnableState,
    updateSelectedPermissions,
  ]);

  const handleToggleModuleEnabled = useCallback(
    (module: string, checked: boolean) => {
      setModuleEnableState((prev) => ({ ...prev, [module]: checked }));

      if (!checked) {
        const group = permissionGroups.find((item) => item.module === module);
        if (group) {
          const names = getPermissionNames(group);
          updateSelectedPermissions(
            selectedPermissions.filter((name) => !names.includes(name)),
          );
        }
      }
    },
    [permissionGroups, selectedPermissions, setModuleEnableState, updateSelectedPermissions],
  );

  const scrollToModule = useCallback((module: string) => {
    setModuleEnableState((prev) =>
      prev[module] === true ? prev : { ...prev, [module]: true },
    );

    requestAnimationFrame(() => {
      const section = moduleSectionRefs.current[module];
      const panel = permissionsPanelRef.current;
      if (!section || !panel) return;

      const panelTop = panel.getBoundingClientRect().top;
      const sectionTop = section.getBoundingClientRect().top;
      panel.scrollTo({
        top: panel.scrollTop + (sectionTop - panelTop) - 8,
        behavior: "smooth",
      });
    });
  }, [setModuleEnableState]);

  const visiblePermissionGroups = useMemo(
    () => permissionGroups.filter((group) => enabledModules.has(group.module)),
    [enabledModules, permissionGroups],
  );

  const sectionClass =
    className.trim().length > 0 ? `space-y-3 ${className}` : "space-y-3";

  return (
    <section className={sectionClass}>
      {hasRoleFilter && (!filterRole || String(filterRole).trim() === "") ? (
        <EmptyMessage>
          Select a role above to load the permissions available for that role.
        </EmptyMessage>
      ) : (
        <>
          {isLoadingPermissions && (
            <div className="flex items-center justify-center py-8">
              <Spinner size={2} />
            </div>
          )}

          {isPermissionsError && (
            <div className="rounded-xs border border-error-500/30 bg-error-500/5 px-4 py-3 text-sm text-error-600 dark:border-error-dark-400/35 dark:bg-error-dark-100/40 dark:text-error-dark-400">
              Failed to load permissions.
            </div>
          )}

          {!isLoadingPermissions && !isPermissionsError && (
            <div className="space-y-3">
              <MasterAccessBanner
                isAllSelected={isAllPermissionsSelected}
                onGrantAll={handleGrantAll}
                onRevokeAll={handleRevokeAll}
              />

              {showAddDefaultsButton && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="!px-2.5 !py-1.5 !text-xs"
                    disabled={defaultPermissionNames.length === 0}
                    onClick={handleAddDefaultPermissions}
                  >
                    Add default permissions
                  </Button>
                </div>
              )}

              {permissionGroups.length === 0 ? (
                <p className={`py-6 text-center text-sm ${textMuted}`}>No permissions found.</p>
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(11rem,14rem)_1fr] lg:gap-2">
                  <div className="flex flex-col gap-2 pr-2 border-r border-neutral-200 dark:border-neutral-dark-300">
                    <h3 className={`text-sm font-bold ${textBody}`}>
                      <span className="mr-1.5 text-brand-600 dark:text-brand-400">1</span>
                      Enable Modules
                    </h3>
                    <div className="flex max-h-[min(36rem,75dvh)] flex-col gap-1 overflow-y-auto lg:max-h-[min(40rem,88dvh)]">
                      {permissionGroups.map((group) => (
                        <ModuleEnableItem
                          key={group.module}
                          module={group.module}
                          displayName={formatModuleName(group.module)}
                          isEnabled={enabledModules.has(group.module)}
                          onToggleEnabled={(checked) =>
                            handleToggleModuleEnabled(group.module, checked)
                          }
                          onNavigate={() => scrollToModule(group.module)}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex min-h-0 flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className={`text-sm font-bold ${textBody}`}>
                        <span className="mr-1.5 text-brand-600 dark:text-brand-400">2</span>
                        Fine-tune Permissions
                      </h3>
                      <span className={`text-[11px] tabular-nums ${textMuted}`}>
                        {selectedPermissionsCount}/{allPermissionNames.length} selected
                      </span>
                    </div>

                    <div
                      ref={permissionsPanelRef}
                      className="max-h-[min(36rem,75dvh)] space-y-3 overflow-y-auto pr-0.5 lg:max-h-[min(40rem,88dvh)]"
                    >
                      {visiblePermissionGroups.length === 0 ? (
                        <div className="rounded-xs border border-dashed border-neutral-200 bg-neutral-50/90 px-4 py-10 text-center dark:border-neutral-dark-300 dark:bg-neutral-dark-100/70">
                          <p className={`text-sm leading-relaxed ${textSecondary}`}>
                            Enable one or more modules on the left to configure permissions.
                          </p>
                        </div>
                      ) : (
                        visiblePermissionGroups.map((group) => (
                          <PermissionModuleCard
                            key={group.module}
                            group={group}
                            selectedPermissionSet={selectedPermissionSet}
                            sectionRef={(el) => {
                              moduleSectionRefs.current[group.module] = el;
                            }}
                            onToggleModulePermissions={handleToggleModulePermissions}
                            onTogglePermission={handleTogglePermission}
                          />
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default PermissionPicker;
