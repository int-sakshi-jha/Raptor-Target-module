import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useGetUserProfileQuery, useDeleteUserMutation, useToggleUserStatusMutation } from "@/services/operations/userAPI";
import Spinner from "@/components/common/Spinner";
import Button from "@/components/common/Button";
import Breadcrumb from "@/components/common/Breadcrumb";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import { Edit, Power, Trash2 } from "lucide-react";
import { PERMISSIONS, hasPermission } from "@/utils/permissions";
import { useAppSelector } from "@/store/hooks";

const UserProfile: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const userPermissions = useAppSelector((s) => s.auth.permissions);

  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const { data: res, isLoading, isError } = useGetUserProfileQuery(id);
  const user = res?.data?.user;

  const deleteMutation = useDeleteUserMutation();
  const toggleStatusMutation = useToggleUserStatusMutation();

  const isAllowedDelete = hasPermission(userPermissions, PERMISSIONS.USER.DELETE);
  const isAllowedEdit = hasPermission(userPermissions, PERMISSIONS.USER.UPDATE);

  if (isLoading) {
    return (
      <div className="w-full p-4">
        <div className="card p-6 flex items-center justify-center min-h-64">
          <div className="flex flex-col items-center gap-3">
            <Spinner size={2} />
            <p className="text-sm text-neutral-600 dark:text-neutral-dark-500">
              Loading user...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="w-full p-4">
        <div className="card p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-dark-950">
                User not found
              </h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-dark-500 mt-1">
                The user you are trying to view does not exist or you don’t have access.
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate(-1)}>
              Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-4 space-y-2">
      <div className="card px-4 py-2 my-2 sm:mt-1">
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0">
            <Breadcrumb
              items={[
                { label: "Users", path: "/users" },
                { label: user.full_name || user.email || "-", path: `/users/${user.id}` },
              ]}
            />
            <h2 className="mt-2 text-xl font-semibold text-neutral-900 dark:text-neutral-950 truncate">
              {user.full_name || "-"}
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                if (!user.id) return;
                toggleStatusMutation.mutate(user.id);
              }}
              className={
                user.is_active
                  ? "p-2 rounded-xs text-success-600 dark:text-success-400 hover:bg-success-50 dark:hover:bg-success-900/20 transition-colors"
                  : "p-2 rounded-xs text-neutral-600 dark:text-neutral-dark-500 hover:bg-neutral-100 dark:hover:bg-neutral-300 transition-colors"
              }
              title={user.is_active ? "Deactivate" : "Activate"}
              disabled={!hasPermission(userPermissions, PERMISSIONS.USER.UPDATE)}
            >
              <Power className="w-4 h-4" />
            </button>

            {isAllowedEdit && (
              <button
                type="button"
                className="p-2 rounded-xs text-brand-700 dark:text-brand-400 hover:bg-brand-600/10 dark:hover:bg-brand-600/15 transition-colors"
                title="Edit"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}

            {isAllowedDelete && (
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="p-2 rounded-xs text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-dark-500">
              Email
            </p>
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-dark-950 mt-1 break-all">
              {user.email || "-"}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-dark-500">
              Phone
            </p>
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-dark-950 mt-1 break-all">
              {user.phone || "-"}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-dark-500">
              Role
            </p>
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-dark-950 mt-1 capitalize">
              {user.role || "-"}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-dark-500">
              Tenant ID
            </p>
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-dark-950 mt-1 break-all">
              {user.tenant_id || "-"}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-dark-500">
              Status
            </p>
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-dark-950 mt-1">
              {user.is_active === undefined ? "-" : user.is_active ? "Active" : "Inactive"}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-dark-500">
              API Access
            </p>
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-dark-950 mt-1">
              {user.enable_api_access === undefined ? "-" : user.enable_api_access ? "Enabled" : "Disabled"}
            </p>
          </div>

          <div className="md:col-span-2">
            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-dark-500">
              Plants
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(user.plant_ids || []).length > 0 ? (
                (user.plant_ids || []).map((pid: string) => (
                  <span
                    key={pid}
                    className="px-2 py-0.5 text-xs font-medium rounded-xs bg-brand-50 dark:bg-brand-600/10 text-brand-800 dark:text-brand-300"
                  >
                    {pid}
                  </span>
                ))
              ) : (
                <span className="text-sm font-medium text-neutral-900 dark:text-neutral-dark-950">
                  -
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmationDialog
        open={confirmOpen}
        onClose={() => {
          if (deleteMutation.isPending) return;
          setConfirmOpen(false);
        }}
        onConfirm={async () => {
          if (!user.id) return;
          try {
            await deleteMutation.mutateAsync([user.id]);
            setConfirmOpen(false);
            navigate("/users");
          } catch {
            // handled by mutation
          }
        }}
        title="Delete User"
        message="Are you sure you want to delete this user? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};

export default UserProfile;
