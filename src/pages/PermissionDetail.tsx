import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  useDeletePermissionMutation,
  useGetPermissionDetailsQuery,
  useGetPermissionListQuery,
  useTogglePermissionStatusMutation,
  PERMISSION_PARENT_OPTIONS_LIST_PARAMS,
  type Permission,
} from "@/services/operations/permissionAPI";
import { getErrorMessage } from "@/services/api";
import Button from "@/components/common/Button";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import PermissionForm from "@/components/core/form/PermissionForm";
import {
  DetailField,
  DetailFieldGrid,
  DetailHeaderActionButton,
  DetailHero,
  DetailMain,
  DetailPageBackground,
  DetailPageLoadingShell,
  DetailSectionCard,
  DetailSectionHeader,
  DetailStatusBadge,
} from "@/components/core/detail/DetailPagePrimitives";

import { Edit, Info, Power, Trash2 } from "lucide-react";
import { useDetailBreadcrumb } from "@/context/BreadcrumbContext";
import { navIcons } from "@/components/core/navbar/navItems";
import { formateDateTime } from "@/utils/gridFormatters";
import Modal from "@/components/common/Modal";
import { useAppSelector } from "@/store/hooks";
import { hasPermission, PERMISSIONS } from "@/utils/permissions";

const PermissionDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [showEdit, setShowEdit] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const {
    data: res,
    isLoading,
    isError,
    error,
  } = useGetPermissionDetailsQuery(id);
  const userPermissions = useAppSelector((state) => state.auth.permissions);
  const permission = res?.data;
  const canEdit = hasPermission(userPermissions, PERMISSIONS.PERMISSION.UPDATE);

  const editFormModalActive = !!showEdit && !!permission && canEdit;
  const parentListForPermissionForm = useGetPermissionListQuery({
    ...PERMISSION_PARENT_OPTIONS_LIST_PARAMS,
    enabled: editFormModalActive,
  });

  const deleteMutation = useDeletePermissionMutation();
  const toggleStatusMutation = useTogglePermissionStatusMutation();

  useDetailBreadcrumb(permission?.display_name || permission?.name);

  const detailErrorMessage = error
    ? getErrorMessage(error)
    : "The permission you are trying to view does not exist or you don’t have access.";

  const canToggleStatus = hasPermission(
    userPermissions,
    PERMISSIONS.PERMISSION.UPDATE,
  );
  const canDelete = hasPermission(userPermissions, PERMISSIONS.PERMISSION.DELETE);

  const handleToggleStatus = () => {
    if (!permission?.id) return;
    toggleStatusMutation.mutate(permission.id);
  };

  const actionButtons = [
    {
      key: "toggle",
      show: canToggleStatus,
      title: permission?.is_active ? "Deactivate" : "Activate",
      className: permission?.is_active
        ? "p-2 rounded-xs text-success-600 dark:text-success-400 hover:bg-success-50 dark:hover:bg-success-900/20 transition-colors"
        : "p-2 rounded-xs text-neutral-600 dark:text-neutral-dark-500 hover:bg-neutral-100 dark:hover:bg-neutral-dark-300 transition-colors",
      icon: <Power className="h-4 w-4" />,
      onClick: () => {
        handleToggleStatus();
      },
    },
    {
      key: "edit",
      show: canEdit,
      title: "Edit",
      className:
        "p-2 rounded-xs text-brand-700 dark:text-brand-400 hover:bg-brand-600/10 dark:hover:bg-brand-600/15 transition-colors",
      icon: <Edit className="h-4 w-4" />,
      onClick: () => {
        setShowEdit(true);
      },
    },
    {
      key: "delete",
      show: canDelete,
      title: "Delete",
      className:
        "p-2 rounded-xs text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20 transition-colors",
      icon: <Trash2 className="h-4 w-4" />,
      onClick: () => {
        setConfirmOpen(true);
      },
    },
  ].filter((action) => action.show);

  if (isLoading) {
    return (
      <DetailPageLoadingShell
        sidebarLabel="Permission Details"
        tabCount={2}
      />
    );
  }

  if (isError || !permission) {
    return (
      <DetailPageBackground>
        <div className="flex flex-1 items-center justify-center p-4">
          <div className="max-w-lg rounded-xs border border-neutral-200 bg-neutral-0 p-4 dark:border-neutral-dark-200 dark:bg-neutral-dark-200">
            <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-dark-950">
              Permission not found
            </h1>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-dark-500">
              {detailErrorMessage}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate("/permissions")}
            >
              Back
            </Button>
          </div>
        </div>
      </DetailPageBackground>
    );
  }

  const heroTitle =
    permission.display_name || permission.name || "Permission";
  const heroSubtitle = [
    permission.name && permission.name !== heroTitle ? permission.name : null,
    permission.module,
  ]
    .filter(Boolean)
    .join(" · ");

  const heroStats: Array<{ label: string; value: React.ReactNode }> = [];
  if (permission.is_active != null) {
    heroStats.push({
      label: "Record status",
      value: <DetailStatusBadge active={permission.is_active} />,
    });
  }
  if (permission.module) {
    heroStats.push({
      label: "Module",
      value: (
        <span className="font-medium text-neutral-900 dark:text-neutral-dark-950">
          {permission.module}
        </span>
      ),
    });
  }
  if (permission.updated_at) {
    heroStats.push({
      label: "Last updated",
      value: formateDateTime(permission.updated_at),
    });
  }

  const rolesValue =
    (permission.roles || []).length > 0 ? (
      <div className="flex flex-wrap gap-1">
        {permission.roles.map((role) => (
          <span
            key={role}
            className="rounded-xs bg-brand-50 px-2 py-0.5 text-xs font-medium capitalize text-brand-800 dark:bg-brand-600/10 dark:text-brand-300"
          >
            {role}
          </span>
        ))}
      </div>
    ) : null;

  return (
    <DetailPageBackground>
      <DetailHero
        icon={navIcons.permissions}
        title={heroTitle}
        subtitle={heroSubtitle || null}
        stats={heroStats.length > 0 ? heroStats : undefined}
        className="rounded-none border-x-0 border-t-0 shadow-none"
        actions={
          actionButtons.length > 0 ? (
            <>
              {actionButtons.map((action) => (
                <DetailHeaderActionButton
                  key={action.key}
                  title={action.title}
                  icon={action.icon}
                  onClick={action.onClick}
                  tone={
                    action.key === "delete"
                      ? "danger"
                      : action.key === "toggle" && permission.is_active
                        ? "success"
                        : action.key === "edit"
                          ? "brand"
                          : "neutral"
                  }
                  disabled={
                    deleteMutation.isPending || toggleStatusMutation.isPending
                  }
                />
              ))}
            </>
          ) : undefined
        }
      />

      <DetailMain className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col">
          <DetailSectionCard className="flex-1">
            <DetailSectionHeader
              icon={Info}
              title="Basic information"
              description="Identifier, module, status, and audit trail"
            />
            <DetailFieldGrid>
              <DetailField
                hideWhenEmpty={false}
                label="Name"
                value={permission.name}
              />
              <DetailField
                hideWhenEmpty={false}
                label="Display Name"
                value={permission.display_name}
              />
              <DetailField
                hideWhenEmpty={false}
                label="Module"
                value={permission.module}
              />
              <DetailField
                hideWhenEmpty={false}
                label="Parent Permission"
                value={permission.parent_permission_name}
              />
              <DetailField
                hideWhenEmpty={false}
                label="Default"
                value={permission.is_default ? "Yes" : "No"}
              />
              <DetailField
                hideWhenEmpty={false}
                label="Record status"
                value={
                  permission.is_active == null ? null : (
                    <DetailStatusBadge active={permission.is_active} />
                  )
                }
              />
              <DetailField
                hideWhenEmpty={false}
                label="Created At"
                value={
                  permission.created_at
                    ? formateDateTime(permission.created_at)
                    : null
                }
              />
              <DetailField
                hideWhenEmpty={false}
                label="Updated At"
                value={
                  permission.updated_at
                    ? formateDateTime(permission.updated_at)
                    : null
                }
              />
              <DetailField
                hideWhenEmpty={false}
                label="Assigned roles"
                value={rolesValue}
              />
            </DetailFieldGrid>
          </DetailSectionCard>
        </div>

        <Modal
          open={!!showEdit}
          onClose={() => {
            setShowEdit(false);
          }}
          title="Edit Permission"
          subtitle={permission.name || "Update permission details"}
          icon={navIcons.permissions}
          maxWidth="max-w-4xl"
        >
          {showEdit && permission && canEdit && (
            <PermissionForm
              mode="edit"
              initialValues={permission as Permission}
              skipPermissionDetailsQuery
              parentPermissionListResult={{
                data: parentListForPermissionForm.data,
                isLoading: parentListForPermissionForm.isLoading,
              }}
              onSuccess={() => {
                setShowEdit(false);
              }}
            />
          )}
        </Modal>

        <ConfirmationDialog
          open={confirmOpen}
          onClose={() => {
            if (deleteMutation.isPending) return;
            setConfirmOpen(false);
          }}
          onConfirm={async () => {
            if (!permission?.id) return;
            try {
              await deleteMutation.mutateAsync([permission.id]);
              setConfirmOpen(false);
              navigate("/permissions");
            } catch {
              // handled by mutation
            }
          }}
          title="Delete Permission"
          message="Are you sure you want to delete this permission? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
          isLoading={deleteMutation.isPending}
        />
      </DetailMain>
    </DetailPageBackground>
  );
};

export default PermissionDetail;
