import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  coerceTagTemplateTagMap,
  getTagTemplateCategoryLabel,
  getTagTemplatePlantCategoryLabel,
  useGetTagTemplateDetailsQuery,
  useDeleteTagTemplateMutation,
  useToggleTagTemplateStatusMutation,
} from "@/services/operations/tagTemplateAPI";
import TagTemplateForm from "@/components/core/form/TagTemplateForm";
import Button from "@/components/common/Button";
import ColorBadge from "@/components/common/ColorBadge";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import Modal from "@/components/common/Modal";
import {
  DetailField,
  DetailFieldFull,
  DetailFieldGrid,
  DetailHeaderActionButton,
  DetailHero,
  DetailKeyValueTable,
  DetailPageBackground,
  DetailPageLoadingShell,
  DetailSectionCard,
  DetailSectionHeader,
  DetailSectionsGrid,
  DetailStatusBadge,
  DetailPageShell,
  DetailContentArea,
} from "@/components/core/detail/DetailPagePrimitives";
import {
  DetailDesktopSidebar,
  DetailMobileNav,
  type DetailSideNavItem,
} from "@/components/core/navbar/DetailSideNav";

import { useDetailBreadcrumb } from "@/context/BreadcrumbContext";
import { useAppSelector } from "@/store/hooks";
import { hasPermission, PERMISSIONS } from "@/utils/permissions";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Power,
  Info,
  Settings,
  FileText,
  SearchCheck,
  CodeXml,
  LayoutGrid,
} from "lucide-react";
import { navIcons } from "@/components/core/navbar/navItems";
import { formateDateTime } from "@/utils/gridFormatters";
import { useMediaQuery } from "usehooks-ts";

const TagTemplateDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [showEdit, setShowEdit] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState<"overview" | "json" | "audit">("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const isLargeScreen = useMediaQuery("(min-width: 768px)");
  const navigate = useNavigate();

  const {
    data: templateResponse,
    isLoading,
    isError,
    error,
  } = useGetTagTemplateDetailsQuery(id);

  const deleteMutation = useDeleteTagTemplateMutation();
  const toggleStatusMutation = useToggleTagTemplateStatusMutation();
  const userPermissions = useAppSelector((state) => state.auth.permissions);
  const canEdit = hasPermission(userPermissions, PERMISSIONS.Tag_TEMPLATE.UPDATE);
  const canDelete = hasPermission(userPermissions, PERMISSIONS.Tag_TEMPLATE.DELETE);

  const template = templateResponse ?? null;
  const tagMapForDetails = template ? coerceTagTemplateTagMap(template.tag_map) : {};

  useDetailBreadcrumb(template?.name);

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteMutation.mutateAsync([id]);
      setConfirmOpen(false);
      navigate("/tag-templates");
    } catch {
      // handled by mutation
    }
  };

  const handleToggleStatus = () => {
    if (!id || !template) return;
    toggleStatusMutation.mutate({ id, is_active: !template.is_active });
  };

  if (isLoading) {
    return (
      <DetailPageLoadingShell
        sidebarLabel="Tag Template Details"
        tabCount={3}
      />
    );
  }

  if (isError || !template) {
    return (
      <DetailPageBackground>
        <div className="flex flex-1 items-center justify-center p-4">
          <div className="max-w-md text-center">
            <div className="mb-4 inline-block rounded-xs bg-error-500/10 p-4 dark:bg-error-500/20">
              <navIcons.tagTemplates className="h-12 w-12 text-error-600 dark:text-error-400" />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
              Tag Template Not Found
            </h2>
            <p className="mb-6 text-sm text-neutral-600 dark:text-neutral-400">
              {error
                ? "Failed to load tag template details. Please try again."
                : "The tag template you're looking for doesn't exist."}
            </p>
            <Link to="/tag-templates">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Tag Templates
              </Button>
            </Link>
          </div>
        </div>
      </DetailPageBackground>
    );
  }

  const heroBadges =
    template.category || template.version != null ? (
      <>
        {template.category ? (
          <ColorBadge variant="orange" className="tracking-wide">
            {getTagTemplateCategoryLabel(template.category)}
          </ColorBadge>
        ) : null}
        {template.version != null ? (
          <span className="rounded-xs bg-neutral-500/10 px-2 py-0.5 text-xs font-semibold text-neutral-700 dark:text-neutral-dark-900">
            v{template.version}
          </span>
        ) : null}
      </>
    ) : undefined;

  const heroStats: Array<{ label: string; value: React.ReactNode }> = [];
  if (template.is_active != null) {
    heroStats.push({
      label: "Status",
      value: <DetailStatusBadge active={template.is_active} />,
    });
  }

  const detailTabs: DetailSideNavItem[] = [
    { key: "overview", label: "Overview", icon: LayoutGrid },
    { key: "json", label: "JSON Explorer", icon: CodeXml },
    { key: "audit", label: "Audit", icon: SearchCheck },
  ];

  const heroHeader = (
    <DetailHero
      icon={navIcons.tagTemplates}
      title={template.name || "Tag template"}
      subtitle="Tag mapping profile for devices and health checks"
      badges={heroBadges}
      stats={heroStats.length > 0 ? heroStats : undefined}
      className="rounded-none border-x-0 border-t-0 shadow-none"
      mobileSummaryHandled
      actions={
        <>
          {canEdit && (
            <DetailHeaderActionButton
              title={template.is_active ? "Deactivate" : "Activate"}
              icon={<Power className="h-4 w-4" />}
              onClick={handleToggleStatus}
              tone={template.is_active ? "success" : "neutral"}
              disabled={toggleStatusMutation.isPending}
            />
          )}
          {canEdit && (
            <DetailHeaderActionButton
              title="Edit"
              icon={<Edit className="h-4 w-4" />}
              onClick={() => setShowEdit(true)}
              tone="brand"
            />
          )}
          {canDelete && (
            <DetailHeaderActionButton
              title="Delete"
              icon={<Trash2 className="h-4 w-4" />}
              onClick={() => setConfirmOpen(true)}
              tone="danger"
              disabled={deleteMutation.isPending}
            />
          )}
        </>
      }
    />
  );

  return (
    <DetailPageBackground className="min-h-0 overflow-hidden">
      <DetailPageShell
        isLargeScreen={isLargeScreen}
        sidebarOpen={sidebarOpen}
        onBack={() => navigate(-1)}
        mobileHeaderSummary={{
          icon: navIcons.tagTemplates,
          title: template.name || "Tag Template",
          subtitle: "Tag mapping profile",
        }}
        mobileNav={
          <DetailMobileNav
            items={detailTabs}
            mode="state"
            activeKey={activeMainTab}
            onSelect={(key) => setActiveMainTab(key as any)}
          />
        }
        desktopSidebar={
          <DetailDesktopSidebar
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            onBack={() => navigate(-1)}
            headerLabel="Tag Template Details"
            items={detailTabs}
            mode="state"
            activeKey={activeMainTab}
            onSelect={(key) => setActiveMainTab(key as any)}
          />
        }
        header={heroHeader}
      >
        <DetailContentArea>
          {activeMainTab === "overview" && (
            <DetailSectionsGrid>
              <DetailSectionCard>
                <DetailSectionHeader
                  icon={Info}
                  title="Basic Information"
                  description="Core identity, classification, and ownership details"
                />
                <DetailFieldGrid>
                  <DetailField hideWhenEmpty={false} label="Name" value={template.name} />
                  <DetailField
                    hideWhenEmpty={false}
                    label="Category"
                    value={
                      template.category ? (
                        <ColorBadge variant="orange" className="tracking-wide">
                          {getTagTemplateCategoryLabel(template.category)}
                        </ColorBadge>
                      ) : null
                    }
                  />
                  <DetailField
                    hideWhenEmpty={false}
                    label="Plant category"
                    value={
                      <span className="font-medium text-neutral-800 dark:text-neutral-100">
                        {getTagTemplatePlantCategoryLabel(template.plant_category)}
                      </span>
                    }
                  />
                  <DetailField
                    hideWhenEmpty={false}
                    label="Version"
                    value={
                      template.version != null ? String(template.version) : null
                    }
                  />
                  <DetailField
                    hideWhenEmpty={false}
                    label="Status"
                    value={
                      template.is_active == null ? null : (
                        <DetailStatusBadge active={template.is_active} />
                      )
                    }
                  />
                </DetailFieldGrid>
              </DetailSectionCard>

              <DetailSectionCard>
                <DetailSectionHeader
                  icon={FileText}
                  title="Description"
                  description="Summary textual details provided for this record"
                />
                <DetailFieldGrid>
                  <DetailFieldFull
                    label="Summary"
                    hideWhenEmpty={false}
                    emptyDisplay="—"
                    value={template.description}
                  />
                </DetailFieldGrid>
              </DetailSectionCard>
            </DetailSectionsGrid>
          )}

          {activeMainTab === "json" && (
            <DetailSectionCard span="full">
              <DetailSectionHeader
                icon={Settings}
                title="Tag Mapping"
                description="Normalized field names mapped to device payload keys"
              />
              <DetailKeyValueTable
                data={tagMapForDetails}
                emptyMessage="No tag mappings configured."
              />
            </DetailSectionCard>
          )}

          {activeMainTab === "audit" && (
            <DetailSectionCard>
              <DetailSectionHeader
                icon={SearchCheck}
                title="Audit Information"
                description="Authorship, timeline, and record lifecycle details"
              />
              <DetailFieldGrid>
                <DetailField
                  label="Created By"
                  hideWhenEmpty={false}
                  value={
                    template.created_by ? (
                      <Link
                        to={`/users/${template.created_by}/profile`}
                        className="font-medium text-brand-700 hover:underline dark:text-brand-400"
                      >
                        {template.created_by_name || template.created_by}
                      </Link>
                    ) : (
                      "—"
                    )
                  }
                />
                <DetailField
                  label="Updated By"
                  hideWhenEmpty={false}
                  value={
                    template.updated_by ? (
                      <Link
                        to={`/users/${template.updated_by}/profile`}
                        className="font-medium text-brand-700 hover:underline dark:text-brand-400"
                      >
                        {template.updated_by_name || template.updated_by}
                      </Link>
                    ) : (
                      "—"
                    )
                  }
                />
                <DetailField
                  label="Created At"
                  hideWhenEmpty={false}
                  value={
                    template.created_at
                      ? formateDateTime(template.created_at)
                      : null
                  }
                />
                <DetailField
                  label="Updated At"
                  hideWhenEmpty={false}
                  value={
                    template.updated_at
                      ? formateDateTime(template.updated_at)
                      : null
                  }
                />
              </DetailFieldGrid>
            </DetailSectionCard>
          )}
        </DetailContentArea>
      </DetailPageShell>

      <Modal
        open={!!showEdit}
        onClose={() => setShowEdit(false)}
        title="Edit Tag Template"
        subtitle={template?.name || "Update tag template details"}
        icon={Edit}
        maxWidth="max-w-4xl"
      >
        {template && (
          <TagTemplateForm
            key={`${template.id}-${showEdit}`}
            mode="edit"
            initialValues={template}
            editValues={template}
            onSuccess={() => setShowEdit(false)}
          />
        )}
      </Modal>

      <ConfirmationDialog
        open={confirmOpen}
        onClose={() => {
          if (deleteMutation.isPending) return;
          setConfirmOpen(false);
        }}
        onConfirm={handleDelete}
        title="Delete Tag Template"
        message="Are you sure you want to delete this tag template? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        isLoading={deleteMutation.isPending}
      />
    </DetailPageBackground>
  );
};

export default TagTemplateDetails;
