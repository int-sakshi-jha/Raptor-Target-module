import { useState } from "react";
import {
  Check,
  Copy,
  LayoutDashboard,
  Pencil,
  Trash2,
} from "lucide-react";
import Modal from "@/components/common/Modal";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import type { DashboardSummary } from "../types/document";
import { SaveTemplateDialog } from "./SaveTemplateDialog";
import {
  DASHBOARD_TOOLBAR_PRIMARY_ACTION,
  dashboardToolbarButtonClass,
} from "./dashboardToolbarStyles";

const NESTED_DIALOG_BACKDROP = "z-[70]";
const NESTED_DIALOG_CONTAINER = "z-[71]";

interface DashboardTemplateManagerModalProps {
  open: boolean;
  plantId: string;
  templates: DashboardSummary[];
  activeTemplateId: string | null;
  onClose: () => void;
  onApply: (template: DashboardSummary) => void | Promise<void>;
  onEdit: (dashboardId: string) => void;
  onDuplicate: (dashboardId: string, newName: string) => void | Promise<void>;
  onRename: (dashboardId: string, newName: string) => void | Promise<void>;
  onDelete: (dashboardId: string) => void | Promise<void>;
  onCreateNew: () => void;
}

function statusLabel(status: DashboardSummary["status"]): string {
  if (status === "published") return "Published";
  return "Draft";
}

function statusClass(status: DashboardSummary["status"]): string {
  if (status === "published") {
    return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  }
  return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
}

export function DashboardTemplateManagerModal({
  open,
  templates,
  activeTemplateId,
  onClose,
  onApply,
  onEdit,
  onDuplicate,
  onRename,
  onDelete,
  onCreateNew,
}: DashboardTemplateManagerModalProps) {
  const [duplicateSource, setDuplicateSource] = useState<DashboardSummary | null>(null);
  const [renameTarget, setRenameTarget] = useState<DashboardSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DashboardSummary | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const sortedTemplates = [...templates].sort((a, b) => {
    if (a.isActive && !b.isActive) return -1;
    if (!a.isActive && b.isActive) return 1;
    const aTime = a.updatedAt ?? a.createdAt ?? "";
    const bTime = b.updatedAt ?? b.createdAt ?? "";
    return bTime.localeCompare(aTime);
  });

  const runAction = async (id: string, action: () => void | Promise<void>) => {
    setBusyId(id);
    try {
      await action();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Dashboard templates"
        subtitle="Saved templates are stored in the database. Default dashboard is built-in and selected when no template is active."
        icon={LayoutDashboard}
        centerModal
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              title="Create a new template from the current layout"
              onClick={() => {
                onClose();
                onCreateNew();
              }}
              className={`${DASHBOARD_TOOLBAR_PRIMARY_ACTION} px-3 py-1.5`}
            >
              + New template
            </button>
          </div>

          {sortedTemplates.length === 0 ? (
            <div className="rounded-sm border border-dashed border-neutral-200 px-4 py-8 text-center text-sm text-neutral-500 dark:border-neutral-dark-300 dark:text-neutral-dark-600">
              No saved templates yet. Customize the dashboard and save a draft or published layout.
            </div>
          ) : (
            <ul className="divide-y divide-neutral-200 rounded-sm border border-neutral-200 dark:divide-neutral-dark-300 dark:border-neutral-dark-300">
              {sortedTemplates.map((template) => (
                <li
                  key={template.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 sm:px-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {template.name}
                      </p>
                      <span
                        className={`rounded-xs px-1.5 py-0.5 text-[10px] font-medium ${statusClass(template.status)}`}
                      >
                        {statusLabel(template.status)}
                      </span>
                      {template.isActive ? (
                        <span className="rounded-xs bg-brand-500/15 px-1.5 py-0.5 text-[10px] font-medium text-brand-700 dark:text-brand-400">
                          Active
                        </span>
                      ) : null}
                    </div>
                    {template.updatedAt ? (
                      <p className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-dark-600">
                        Updated {new Date(template.updatedAt).toLocaleString()}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-1">
                    {template.id !== activeTemplateId ? (
                      <button
                        type="button"
                        title={
                          template.status === "draft"
                            ? "Publish this draft and set it as the active layout"
                            : "Set this template as the active layout"
                        }
                        disabled={busyId === template.id}
                        onClick={() => void runAction(template.id, () => onApply(template))}
                        className={dashboardToolbarButtonClass()}
                      >
                        <Check className="h-3.5 w-3.5" />
                        {template.status === "draft" ? "Publish & apply" : "Apply"}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      title="Open this template in the editor"
                      onClick={() => {
                        onClose();
                        onEdit(template.id);
                      }}
                      className={dashboardToolbarButtonClass()}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      title="Create a copy with a new name"
                      onClick={() => setDuplicateSource(template)}
                      className={dashboardToolbarButtonClass()}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Duplicate
                    </button>
                    <button
                      type="button"
                      title="Rename this template"
                      onClick={() => setRenameTarget(template)}
                      className={dashboardToolbarButtonClass()}
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      title="Permanently delete this template"
                      onClick={() => setDeleteTarget(template)}
                      className={dashboardToolbarButtonClass("danger")}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>

      <SaveTemplateDialog
        open={Boolean(duplicateSource)}
        title="Duplicate template"
        subtitle="Create a copy with a new name"
        initialName={duplicateSource ? `${duplicateSource.name} (Copy)` : ""}
        confirmLabel="Duplicate"
        backdropClassName={NESTED_DIALOG_BACKDROP}
        containerClassName={NESTED_DIALOG_CONTAINER}
        onClose={() => setDuplicateSource(null)}
        onConfirm={async (name) => {
          if (!duplicateSource) return;
          await onDuplicate(duplicateSource.id, name);
          setDuplicateSource(null);
        }}
      />

      <SaveTemplateDialog
        open={Boolean(renameTarget)}
        title="Rename template"
        initialName={renameTarget?.name ?? ""}
        confirmLabel="Rename"
        backdropClassName={NESTED_DIALOG_BACKDROP}
        containerClassName={NESTED_DIALOG_CONTAINER}
        onClose={() => setRenameTarget(null)}
        onConfirm={async (name) => {
          if (!renameTarget) return;
          await onRename(renameTarget.id, name);
          setRenameTarget(null);
        }}
      />

      <ConfirmationDialog
        open={Boolean(deleteTarget)}
        overlayClassName={NESTED_DIALOG_BACKDROP}
        isLoading={deleteLoading}
        onClose={() => {
          if (deleteLoading) return;
          setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (!deleteTarget || deleteLoading) return;
          void (async () => {
            setDeleteLoading(true);
            try {
              await onDelete(deleteTarget.id);
              setDeleteTarget(null);
            } catch {
              // Backend message shown via mutation onError
            } finally {
              setDeleteLoading(false);
            }
          })();
        }}
        title="Delete template?"
        message={
          deleteTarget?.isActive
            ? `"${deleteTarget.name}" is currently active. Deleting it will switch back to the default layout.`
            : `Delete "${deleteTarget?.name ?? "this template"}"? This cannot be undone.`
        }
        confirmText="Delete"
        type="danger"
      />
    </>
  );
}
