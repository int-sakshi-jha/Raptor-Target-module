import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMediaQuery } from "usehooks-ts";
import {
  ArrowLeft,
  Blocks,
  Edit,
  Info,
  LayoutTemplate,
  MonitorCog,
  Power,
  SearchCheck,
  Tags,
  TextSearch,
  Trash2,
} from "lucide-react";
import Button from "@/components/common/Button";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import Modal from "@/components/common/Modal";
import BoolBadge from "@/components/common/BoolBadge";
import TagGroupForm from "@/components/core/form/TagGroupForm";
import {
  DetailField,
  DetailFieldGrid,
  DetailHeaderActionButton,
  DetailHero,
  DetailContentArea,
  DetailPageBackground,
  DetailPageLoadingShell,
  DetailPageShell,
  DetailSectionCard,
  DetailSectionHeader,
  DetailSectionsGrid,
  DetailStatusBadge,
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
  useDeleteTagGroupMutation,
  useGetTagGroupDetailsQuery,
  useToggleTagGroupStatusMutation,
} from "@/services/operations/tagGroupAPI";
import { formateDateTime } from "@/utils/gridFormatters";

const TagGroupDetails: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [showEdit, setShowEdit] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState<
    "overview" | "configuration" | "audit"
  >("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const isLargeScreen = useMediaQuery("(min-width: 768px)");

  const deleteMutation = useDeleteTagGroupMutation();
  const toggleStatusMutation = useToggleTagGroupStatusMutation();
  const userPermissions = useAppSelector((state) => state.auth.permissions);
  const canEdit = hasPermission(userPermissions, PERMISSIONS.TAG_GROUP.UPDATE);
  const canDelete = hasPermission(userPermissions, PERMISSIONS.TAG_GROUP.DELETE);

  const { data: tagGroup, isLoading, isError } = useGetTagGroupDetailsQuery(id, {
    staleTime: 5 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });
  const activeDetailTabLabel =
    activeMainTab === "overview"
      ? "Overview"
      : activeMainTab === "configuration"
        ? "Configuration"
        : "Audit";
  useDetailBreadcrumb(tagGroup?.name, activeDetailTabLabel);

  if (isLoading) {
    return (
      <DetailPageLoadingShell
        sidebarLabel="Tag Group Details"
        tabCount={3}
      />
    );
  }

  if (isError || !tagGroup) {
    return (
      <DetailPageBackground>
        <div className="flex flex-1 items-center justify-center p-4">
          <div className="max-w-md text-center">
            <div className="mb-4 inline-block rounded-xs bg-error-500/10 p-4 dark:bg-error-500/20">
              <LayoutTemplate className="h-12 w-12 text-error-600 dark:text-error-400" />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
              Tag group not found
            </h2>
            <p className="mb-6 text-sm text-neutral-600 dark:text-neutral-400">
              The tag group you are looking for could not be loaded.
            </p>
            <Link to="/tag-groups">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to tag groups
              </Button>
            </Link>
          </div>
        </div>
      </DetailPageBackground>
    );
  }

  const plantLabel = tagGroup.plant_name ?? "-";
  const configCounts = {
    components: Array.isArray(tagGroup.tag_config) ? tagGroup.tag_config.length : 0,
    tags: Array.isArray(tagGroup.tag_config)
      ? tagGroup.tag_config.reduce((sum, item) => sum + item.tag_ids.length, 0)
      : 0,
  };

  const detailTabs: DetailSideNavItem[] = [
    { key: "overview", label: "Overview", icon: TextSearch },
    { key: "configuration", label: "Configuration", icon: MonitorCog },
    { key: "audit", label: "Audit", icon: SearchCheck },
  ];

  const heroHeader = (
    <DetailHero
      icon={LayoutTemplate}
      title={tagGroup.name}
      subtitle={tagGroup.category ?? "Tag group"}
      stats={[
        { label: "Record status", value: <DetailStatusBadge active={tagGroup.is_active} /> },
        { label: "Components", value: configCounts.components },
        { label: "Tag IDs", value: configCounts.tags },
      ]}
      className="rounded-none border-x-0 border-t-0 shadow-none"
      actions={
        <>
          {canEdit && (
            <DetailHeaderActionButton
              title={tagGroup.is_active ? "Deactivate" : "Activate"}
              icon={<Power className="h-4 w-4" />}
              onClick={() => {
                toggleStatusMutation.mutate({
                  id: tagGroup.id,
                  is_active: !tagGroup.is_active,
                });
              }}
              tone={tagGroup.is_active ? "success" : "neutral"}
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
          icon: Tags,
          title: tagGroup.name || "Tag Group",
        }}
        mobileNav={
          <DetailMobileNav
            items={detailTabs}
            mode="state"
            activeKey={activeMainTab}
            onSelect={(key) =>
              setActiveMainTab(key as "overview" | "configuration" | "audit")
            }
          />
        }
        desktopSidebar={
          <DetailDesktopSidebar
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            onBack={() => navigate(-1)}
            headerLabel="Tag Group Details"
            items={detailTabs}
            mode="state"
            activeKey={activeMainTab}
            onSelect={(key) =>
              setActiveMainTab(key as "overview" | "configuration" | "audit")
            }
          />
        }
        header={heroHeader}
      >
        <DetailContentArea>
          {activeMainTab === "overview" && (
            <DetailSectionsGrid maxColumns={1}>
              <DetailSectionCard>
            <DetailSectionHeader
              icon={Info}
              title="Basic Information"
              description="Core assignment and current lifecycle state"
            />
            <DetailFieldGrid>
              <DetailField
                label="Plant"
                value={
                  tagGroup.plant_id && tagGroup.plant_name ? (
                    <Link
                      to={`/plants/${tagGroup.plant_id}`}
                      className="font-medium text-brand-700 hover:underline dark:text-brand-400"
                    >
                      {tagGroup.plant_name}
                    </Link>
                  ) : (
                    plantLabel
                  )
                }
              />
              <DetailField label="Category" value={tagGroup.category ?? "-"} />
              <DetailField
                label="Active"
                value={<BoolBadge value={tagGroup.is_active} />}
              />
            </DetailFieldGrid>
          </DetailSectionCard>
            </DetailSectionsGrid>
          )}

          {activeMainTab === "audit" && (
            <DetailSectionsGrid maxColumns={1}>
              <DetailSectionCard>
            <DetailSectionHeader
              icon={SearchCheck}
              title="Audit Information"
              description="Authorship, timeline, and record lifecycle details"
            />
            <DetailFieldGrid>
              <DetailField
                label="Created"
                value={tagGroup.created_at ? formateDateTime(tagGroup.created_at) : "-"}
              />
              <DetailField
                label="Updated"
                value={tagGroup.updated_at ? formateDateTime(tagGroup.updated_at) : "-"}
              />
              <DetailField
                label="Created by"
                value={
                  tagGroup.created_by && tagGroup.created_by_name ? (
                    <Link
                      to={`/users/${tagGroup.created_by}/profile`}
                      className="font-medium text-brand-700 hover:underline dark:text-brand-400"
                    >
                      {tagGroup.created_by_name}
                    </Link>
                  ) : (
                    tagGroup.created_by_name ?? "-"
                  )
                }
              />
              <DetailField
                label="Updated by"
                value={
                  tagGroup.updated_by && tagGroup.updated_by_name ? (
                    <Link
                      to={`/users/${tagGroup.updated_by}/profile`}
                      className="font-medium text-brand-700 hover:underline dark:text-brand-400"
                    >
                      {tagGroup.updated_by_name}
                    </Link>
                  ) : (
                    tagGroup.updated_by_name ?? "-"
                  )
                }
              />
            </DetailFieldGrid>
          </DetailSectionCard>
            </DetailSectionsGrid>
          )}

          {activeMainTab === "configuration" && (
            <DetailSectionsGrid maxColumns={2}>
              <DetailSectionCard span="full">
                <DetailSectionHeader
                  icon={Blocks}
                  title="Configuration Summary"
                  description="Quick totals derived from tag-config"
                />
                <DetailFieldGrid>
                  <DetailField label="Components mapped" value={configCounts.components} />
                  <DetailField label="Tag IDs mapped" value={configCounts.tags} />
                </DetailFieldGrid>
              </DetailSectionCard>

              <DetailSectionCard span="full">
            <DetailSectionHeader
              icon={Tags}
              title="Component Mapping"
              description="Individual component associations and their assigned tags"
            />
            <div className="flex flex-col gap-3">
              {tagGroup.tag_config.length > 0 ? (
                tagGroup.tag_config.map((item, index) => (
                  <div
                    key={`${item.component_id}-${index}`}
                    className="rounded-xs border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-dark-300 dark:bg-neutral-dark-300/25"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex min-w-0 items-start gap-3 lg:w-72 lg:shrink-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xs bg-brand-500/[0.12] ring-1 ring-brand-500/15 dark:bg-brand-500/20 dark:ring-brand-400/20">
                          <Blocks className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-dark-950">
                            {item.component_name || "-"}
                          </div>
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-dark-500">
                          <Tags className="h-3.5 w-3.5" />
                          Tags
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {(item.tag_ids ?? []).map((tagId) => (
                            <span
                              key={tagId}
                              className="rounded-xs border border-neutral-200 bg-neutral-0 px-2.5 py-1 font-mono text-xs text-neutral-700 dark:border-neutral-dark-300 dark:bg-neutral-dark-200 dark:text-neutral-dark-900"
                            >
                              {tagId}
                            </span>
                          ))}
                          {(item.tag_ids ?? []).length === 0 ? (
                            <span className="text-xs text-neutral-500 dark:text-neutral-dark-500">
                              -
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xs border border-dashed border-neutral-300 bg-neutral-50 px-4 py-6 text-sm text-neutral-500 dark:border-neutral-dark-300 dark:bg-neutral-dark-300/20 dark:text-neutral-dark-500">
                  No component mappings are configured for this tag group yet.
                </div>
              )}
            </div>
          </DetailSectionCard>
            </DetailSectionsGrid>
          )}
        </DetailContentArea>
      </DetailPageShell>

      <Modal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        title="Edit tag group"
        subtitle={tagGroup.name}
        maxWidth="max-w-5xl"
        icon={LayoutTemplate}
      >
        {showEdit ? (
          <TagGroupForm
            mode="edit"
            initialValues={tagGroup}
            editValues={tagGroup}
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
          try {
            await deleteMutation.mutateAsync([tagGroup.id]);
            navigate("/tag-groups");
          } catch {
            // handled in mutation
          }
        }}
        title="Delete tag group"
        message="Are you sure you want to delete this tag group? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        isLoading={deleteMutation.isPending}
      />
    </DetailPageBackground>
  );
};

export default TagGroupDetails;
