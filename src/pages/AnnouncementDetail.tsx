import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  useDeleteAnnouncementsMutation,
  useGetAnnouncementDetailsQuery,
  useToggleSingleAnnouncementStatusMutation,
  type Announcement,
} from "@/services/operations/announcementAPI";
import { getErrorMessage } from "@/services/api";
import Button from "@/components/common/Button";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import AnnouncementForm from "@/components/core/form/AnnouncementForm";
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
import ColorBadge from "@/components/common/ColorBadge";
import { AUDIENCE_TYPE_OPTIONS } from "@/utils/selectOptions";

function formatAudience(announcement: Announcement): string {
  const typeLabel =
    AUDIENCE_TYPE_OPTIONS.find((o) => o.value === announcement.audience_type)?.label ??
    announcement.audience_type;
  const audience = announcement.audience;
  if (announcement.audience_type === "all") return typeLabel;
  if (announcement.audience_type === "role" && audience?.roles?.length) {
    return `${typeLabel}: ${audience.roles.join(", ")}`;
  }
  if (announcement.audience_type === "tenant" && audience?.tenant_ids?.length) {
    return `${typeLabel}: ${audience.tenant_ids.length} tenant(s)`;
  }
  if (announcement.audience_type === "users" && audience?.user_ids?.length) {
    return `${typeLabel}: ${audience.user_ids.length} user(s)`;
  }
  return typeLabel;
}

const AnnouncementDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [showEdit, setShowEdit] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const { data: res, isLoading, isError, error } = useGetAnnouncementDetailsQuery(id);
  const userPermissions = useAppSelector((state) => state.auth.permissions);
  const announcement = res?.data;
  const canEdit = hasPermission(userPermissions, PERMISSIONS.ANNOUNCEMENT.UPDATE);
  const canDelete = hasPermission(userPermissions, PERMISSIONS.ANNOUNCEMENT.DELETE);
  const canToggle = canEdit;

  const deleteMutation = useDeleteAnnouncementsMutation();
  const toggleStatusMutation = useToggleSingleAnnouncementStatusMutation();

  useDetailBreadcrumb(announcement?.title);

  const detailErrorMessage = error
    ? getErrorMessage(error)
    : "The announcement you are trying to view does not exist or you don't have access.";

  if (isLoading) {
    return <DetailPageLoadingShell sidebarLabel="Announcement details" tabCount={1} />;
  }

  if (isError || !announcement) {
    return (
      <DetailPageBackground>
        <div className="flex flex-1 items-center justify-center p-4">
          <div className="max-w-lg rounded-xs border border-neutral-200 bg-neutral-0 p-4 dark:border-neutral-dark-200 dark:bg-neutral-dark-200">
            <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-dark-950">
              Announcement not found
            </h1>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-dark-500">
              {detailErrorMessage}
            </p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/announcements")}>
              Back
            </Button>
          </div>
        </div>
      </DetailPageBackground>
    );
  }

  const heroStats: Array<{ label: string; value: React.ReactNode }> = [
    {
      label: "Status",
      value: <DetailStatusBadge active={announcement.is_active} />,
    },
    {
      label: "Type",
      value: (
        <ColorBadge variant="brand" className="capitalize">
          {announcement.type}
        </ColorBadge>
      ),
    },
  ];

  const actionButtons = [
    {
      key: "toggle",
      show: canToggle,
      title: announcement.is_active ? "Deactivate" : "Activate",
      icon: <Power className="h-4 w-4" />,
      onClick: () => toggleStatusMutation.mutate(announcement),
      tone: announcement.is_active ? ("success" as const) : ("neutral" as const),
    },
    {
      key: "edit",
      show: canEdit,
      title: "Edit",
      icon: <Edit className="h-4 w-4" />,
      onClick: () => setShowEdit(true),
      tone: "brand" as const,
    },
    {
      key: "delete",
      show: canDelete,
      title: "Delete",
      icon: <Trash2 className="h-4 w-4" />,
      onClick: () => setConfirmOpen(true),
      tone: "danger" as const,
    },
  ].filter((a) => a.show);

  return (
    <DetailPageBackground>
      <DetailHero
        icon={navIcons.announcements}
        title={announcement.title}
        subtitle={formatAudience(announcement)}
        stats={heroStats}
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
                  tone={action.tone}
                  disabled={deleteMutation.isPending || toggleStatusMutation.isPending}
                />
              ))}
            </>
          ) : undefined
        }
      />

      <DetailMain className="flex flex-1 flex-col gap-4">
        <DetailSectionCard>
          <DetailSectionHeader
            icon={Info}
            title="Content"
            description="Announcement message shown to users"
          />
          <div
            className="announcement-html rounded-xs border border-neutral-200 bg-neutral-50 p-4 text-sm leading-relaxed dark:border-neutral-dark-200 dark:bg-neutral-dark-300"
            dangerouslySetInnerHTML={{ __html: announcement.content }}
          />
        </DetailSectionCard>

        <DetailSectionCard>
          <DetailSectionHeader icon={Info} title="Details" />
          <DetailFieldGrid>
            <DetailField label="Audience" value={formatAudience(announcement)} />
            <DetailField
              label="Dismissible"
              value={announcement.dismissible ? "Yes" : "No"}
            />
            <DetailField
              label="Start date"
              value={announcement.start_date ? formateDateTime(announcement.start_date) : null}
            />
            <DetailField
              label="End date"
              value={announcement.end_date ? formateDateTime(announcement.end_date) : null}
            />
            <DetailField
              label="Created at"
              value={
                announcement.created_at ? formateDateTime(announcement.created_at) : null
              }
            />
            <DetailField
              label="Updated at"
              value={
                announcement.updated_at ? formateDateTime(announcement.updated_at) : null
              }
            />
            <DetailField label="Created by" value={announcement.created_by_name} />
            <DetailField label="Updated by" value={announcement.updated_by_name} />
          </DetailFieldGrid>
        </DetailSectionCard>
      </DetailMain>

      <Modal
        open={showEdit && canEdit}
        onClose={() => setShowEdit(false)}
        title="Edit announcement"
        subtitle={announcement.title}
        icon={navIcons.announcements}
        maxWidth="max-w-4xl"
      >
        {showEdit && canEdit ? (
          <AnnouncementForm
            mode="edit"
            initialValues={announcement}
            skipAnnouncementDetailsQuery
            onSuccess={() => setShowEdit(false)}
          />
        ) : null}
      </Modal>

      <ConfirmationDialog
        open={confirmOpen}
        onClose={() => {
          if (deleteMutation.isPending) return;
          setConfirmOpen(false);
        }}
        onConfirm={async () => {
          if (!announcement.id) return;
          try {
            await deleteMutation.mutateAsync([announcement.id]);
            setConfirmOpen(false);
            navigate("/announcements");
          } catch {
            // handled by mutation
          }
        }}
        title="Delete announcement"
        message="Are you sure you want to delete this announcement? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        isLoading={deleteMutation.isPending}
      />
    </DetailPageBackground>
  );
};

export default AnnouncementDetail;
