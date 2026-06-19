import React, { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  useDeletePlantFeatureMutation,
  useGetPlantFeatureDetailsQuery,
  useTogglePlantFeatureStatusMutation,
  pickPlantFeatureDetail,
} from "@/services/operations/plantFeaturesAPI";
import Button from "@/components/common/Button";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import Modal from "@/components/common/Modal";
import PlantFeatureForm from "@/components/core/form/PlantFeatureForm";
import { useAppSelector } from "@/store/hooks";
import { hasPermission, PERMISSIONS } from "@/utils/permissions";
import {
  DetailField,
  DetailFieldGrid,
  DetailHeaderActionButton,
  DetailHero,
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
import { formatArrayAsCommaSeparated } from "@/utils/agGridCellRenderers";
import BoolBadge from "@/components/common/BoolBadge";
import { formateDateTime } from "@/utils/gridFormatters";
import { ArrowLeft, Edit, Info, Power, SearchCheck, Settings, Trash2, LayoutGrid } from "lucide-react";
import { navIcons } from "@/components/core/navbar/navItems";
import { useMediaQuery } from "usehooks-ts";

import { useDetailBreadcrumb } from "@/context/BreadcrumbContext";

const PlantFeatureDetails: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [showEdit, setShowEdit] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState<"overview" | "json" | "audit">("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const isLargeScreen = useMediaQuery("(min-width: 768px)");

  const userPermissions = useAppSelector((state) => state.auth.permissions);
  const deleteMutation = useDeletePlantFeatureMutation();
  const toggleStatusMutation = useTogglePlantFeatureStatusMutation();

  const { data: rawResponse, isLoading, isError, error } =
    useGetPlantFeatureDetailsQuery(id);

  const feature = useMemo(
    () => pickPlantFeatureDetail(rawResponse),
    [rawResponse],
  );

  useDetailBreadcrumb(feature?.display_name || feature?.name);

  if (isLoading) {
    return (
      <DetailPageLoadingShell
        sidebarLabel="Plant Feature Details"
        tabCount={3}
      />
    );
  }

  if (isError || !feature) {
    return (
      <DetailPageBackground>
        <div className="flex flex-1 items-center justify-center p-4">
          <div className="max-w-md text-center">
            <div className="mb-4 inline-block rounded-xs bg-error-500/10 p-4 dark:bg-error-500/20">
              <navIcons.plantFeature className="h-12 w-12 text-error-600 dark:text-error-400" />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
              Plant feature not found
            </h2>
            <p className="mb-6 text-sm text-neutral-600 dark:text-neutral-400">
              {error
                ? "Failed to load this plant feature. Please try again."
                : "The plant feature you are looking for does not exist."}
            </p>
            <Link to="/plant-feature">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to plant features
              </Button>
            </Link>
          </div>
        </div>
      </DetailPageBackground>
    );
  }

  const plantCategoriesLabel = formatArrayAsCommaSeparated(feature.plant_category);

  const canToggleStatus = hasPermission(
    userPermissions,
    PERMISSIONS.PLANT_FEATURE.UPDATE,
  );
  const canEdit = hasPermission(
    userPermissions,
    PERMISSIONS.PLANT_FEATURE.UPDATE,
  );
  const canDelete = hasPermission(
    userPermissions,
    PERMISSIONS.PLANT_FEATURE.DELETE,
  );

  const detailTabs: DetailSideNavItem[] = [
    { key: "overview", label: "Overview", icon: LayoutGrid },
    { key: "audit", label: "Audit", icon: SearchCheck },
  ];

  const heroStats: Array<{ label: string; value: React.ReactNode }> = [];
  if (feature.is_active != null) {
    heroStats.push({
      label: "Status",
      value: <DetailStatusBadge active={feature.is_active} />,
    });
  }
  if (feature.module) {
    heroStats.push({
      label: "Module",
      value: feature.module,
    });
  }
  if (feature.is_default) {
    heroStats.push({
      label: "Preset",
      value: "Default",
    });
  }

  const heroHeader = (
    <DetailHero
      icon={navIcons.plantFeature}
      title={feature.display_name}
      subtitle={feature.name}
      badges={
        <>
          {feature.is_default ? (
            <span className="rounded-xs bg-brand-500/15 px-2 py-0.5 text-xs font-semibold text-brand-800 dark:text-brand-200">
              Default
            </span>
          ) : null}
        </>
      }
      stats={heroStats.length > 0 ? heroStats : undefined}
      className="rounded-none border-x-0 border-t-0 shadow-none"
      mobileSummaryHandled
      actions={
        <>
          {canToggleStatus && (
            <DetailHeaderActionButton
              title={feature.is_active ? "Deactivate" : "Activate"}
              icon={<Power className="h-4 w-4" />}
              onClick={() => {
                if (!feature.id) return;
                toggleStatusMutation.mutate({
                  id: feature.id,
                  is_active: !feature.is_active,
                });
              }}
              tone={feature.is_active ? "success" : "neutral"}
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
          icon: navIcons.plantFeature,
          title: feature.display_name || "Plant Feature",
          subtitle: feature.name,
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
            headerLabel="Plant Feature Details"
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
            <DetailSectionsGrid maxColumns={2}>
              <DetailSectionCard>
                <DetailSectionHeader
                  icon={Info}
                  title="Basic Information"
                  description="Core identity, display properties, and module classification"
                />
                <DetailFieldGrid>
                  <DetailField label="Name" value={feature.name} />
                  <DetailField label="Display Name" value={feature.display_name} />
                  <DetailField label="Module" value={feature.module ?? "-"} />
                  <DetailField
                    label="Plant categories"
                    value={plantCategoriesLabel ?? "-"}
                  />
                  <DetailField
                    label="Price"
                    value={
                      feature.price == null || feature.price === ""
                        ? "-"
                        : String(feature.price)
                    }
                  />
                  <DetailField
                    label="Parent feature"
                    value={feature.parent_feature_id ?? "-"}
                  />
                </DetailFieldGrid>
              </DetailSectionCard>

              <DetailSectionCard>
                <DetailSectionHeader
                  icon={Settings}
                  title="Functional Flags"
                  description="System behavior toggles and preset status"
                />
                <DetailFieldGrid>
                  <DetailField
                    label="Active"
                    value={feature.is_active != null ? <DetailStatusBadge active={feature.is_active} /> : "-"}
                  />
                  <DetailField
                    label="Default"
                    value={feature.is_default != null ? <BoolBadge value={feature.is_default} /> : "-"}
                  />
                </DetailFieldGrid>
              </DetailSectionCard>
            </DetailSectionsGrid>
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
                  label="Created"
                  value={feature.created_at ? formateDateTime(feature.created_at) : "-"}
                />
                <DetailField
                  label="Updated"
                  value={feature.updated_at ? formateDateTime(feature.updated_at) : "-"}
                />
              </DetailFieldGrid>
            </DetailSectionCard>
          )}
        </DetailContentArea>
      </DetailPageShell>

      <Modal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        title="Edit plant feature"
        subtitle={feature.display_name || feature.name}
        maxWidth="max-w-3xl"
        icon={navIcons.plantFeature}
      >
        {showEdit && canEdit && (
          <PlantFeatureForm
            mode="edit"
            initialValues={feature}
            editValues={feature}
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
        onConfirm={async () => {
          if (!feature?.id) return;
          try {
            await deleteMutation.mutateAsync([feature.id]);
            setConfirmOpen(false);
            navigate("/plant-feature");
          } catch {
            // handled by mutation
          }
        }}
        title="Delete plant feature"
        message="Are you sure you want to delete this plant feature? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        isLoading={deleteMutation.isPending}
      />
    </DetailPageBackground>
  );
};

export default PlantFeatureDetails;
