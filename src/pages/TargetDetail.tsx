import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate, useOutletContext } from "react-router-dom";
import type { BreadcrumbItem } from "@/components/common/Breadcrumb";
import {
  useGetTargetDetailsQuery,
  useDeleteTargetMutation,
} from "@/services/operations/targetAPI";
import TargetForm from "@/components/core/form/TargetForm.tsx";
import { useDetailBreadcrumb } from "@/context/BreadcrumbContext";
import Button from "@/components/common/Button";
import Spinner from "@/components/common/Spinner";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import Modal from "@/components/common/Modal";
import {
  DetailField,
  DetailFieldGrid,
  DetailHeaderActionButton,
  DetailHero,
  DetailMain,
  DetailPageBackground,
  DetailSectionCard,
  DetailSectionHeader,
  DetailSectionsGrid,
} from "@/components/core/detail/DetailPagePrimitives";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Target,
  Info,
  Cpu,
  BarChart2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Zap,
} from "lucide-react";
import { formateDateTime } from "@/utils/gridFormatters";



/* ─────────────────────────── status badge ───────────────────────────────── */

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<
    string,
    { bg: string; text: string; dot: string; icon: React.ElementType; label: string }
  > = {
    draft: {
      bg: "bg-neutral-100 dark:bg-neutral-dark-200",
      text: "text-neutral-500 dark:text-neutral-dark-500",
      dot: "bg-neutral-400",
      icon: Clock,
      label: "Draft",
    },
    active: {
      bg: "bg-brand-50 dark:bg-brand-900/30",
      text: "text-brand-700 dark:text-brand-400",
      dot: "bg-brand-500",
      icon: Zap,
      label: "Active",
    },
    achieved: {
      bg: "bg-success-100 dark:bg-success-900/30",
      text: "text-success-700 dark:text-success-400",
      dot: "bg-success-500",
      icon: CheckCircle2,
      label: "Achieved",
    },
    failed: {
      bg: "bg-error-100 dark:bg-error-900/30",
      text: "text-error-700 dark:text-error-400",
      dot: "bg-error-500",
      icon: XCircle,
      label: "Failed",
    },
    expired: {
      bg: "bg-warning-100 dark:bg-warning-900/30",
      text: "text-warning-700 dark:text-warning-400",
      dot: "bg-warning-500",
      icon: AlertCircle,
      label: "Expired",
    },
  };

  const style = map[status] ?? {
    bg: "bg-neutral-100 dark:bg-neutral-dark-200",
    text: "text-neutral-500 dark:text-neutral-dark-500",
    dot: "bg-neutral-400",
    icon: AlertCircle,
    label: status,
  };

  const Icon = style.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${style.bg} ${style.text}`}
    >
      <Icon className="h-3 w-3" />
      {style.label}
    </span>
  );
};

/* ─────────────────────────── main component ─────────────────────────────── */

const TargetDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [showEdit, setShowEdit] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const navigate = useNavigate();

  const {
    data: targetResponse,
    isLoading,
    isError,
    error,
  } = useGetTargetDetailsQuery(id);
  console.log(targetResponse)

  
  

  const deleteMutation = useDeleteTargetMutation();

  const target =targetResponse?.data?.data ?? targetResponse?.data ?? targetResponse?.target;
  useDetailBreadcrumb(target?.target_name);

  

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteMutation.mutateAsync([id]);
      setConfirmOpen(false);
      navigate("/targets");
    } catch {
      /* handled by mutation */
    }
  };

  /* loading */
  if (isLoading) {
    return (
      <DetailPageBackground>
        <div className="flex flex-1 items-center justify-center p-4">
          <div className="rounded-sm border border-neutral-200 bg-neutral-0 px-6 py-8 text-center dark:border-neutral-dark-200 dark:bg-neutral-dark-200">
            <Spinner size={3} />
            <p className="mt-3 text-sm font-medium text-neutral-600 dark:text-neutral-400">
              Loading target details...
            </p>
          </div>
        </div>
      </DetailPageBackground>
    );
  }

  /* error */
  if (isError || !target) {
    return (
      <DetailPageBackground>
        <div className="flex flex-1 items-center justify-center p-4">
          <div className="max-w-md text-center">
            <div className="mb-4 inline-block rounded-sm bg-error-500/10 p-4 dark:bg-error-500/20">
              <Target className="h-12 w-12 text-error-600 dark:text-error-400" />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
              Target Not Found
            </h2>
            <p className="mb-6 text-sm text-neutral-600 dark:text-neutral-400">
              {error
                ? "Failed to load target details. Please try again."
                : "The target you're looking for doesn't exist."}
            </p>
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </div>
        </div>
      </DetailPageBackground>
    );
  }

  /* hero badges */
  const heroBadges = target.status ? (
    <StatusBadge status={target.status} />
  ) : undefined;

  /* hero stats */
  const heroStats: Array<{ label: string; value: React.ReactNode }> = [];
  if (target.component_id) {
    heroStats.push({
      label: "Component",
      value: target.component_name || target.component_id,
    });
  }
  const parameterEntries = Object.entries(target.parameter ?? {});
  if (parameterEntries.length > 0) {
    heroStats.push({
      label: "Parameters",
      value: parameterEntries.length,
    });
  }

  return (
    <DetailPageBackground>
      <DetailHero
        icon={Target}
        title={target.target_name || "Target"}
        subtitle="Performance target linked to components and parameters"
        badges={heroBadges}
        stats={heroStats.length > 0 ? heroStats : undefined}
        className="rounded-none border-x-0 border-t-0 shadow-none"
        actions={
          <>
            <DetailHeaderActionButton
              title="Edit"
              icon={<Edit className="h-4 w-4" />}
              onClick={() => setShowEdit(true)}
              tone="brand"
            />
            <DetailHeaderActionButton
              title="Delete"
              icon={<Trash2 className="h-4 w-4" />}
              onClick={() => setConfirmOpen(true)}
              tone="danger"
              disabled={deleteMutation.isPending}
            />
          </>
        }
      />

      <DetailMain>
        <DetailSectionsGrid>

          {/* OVERVIEW */}
          <DetailSectionCard>
              <DetailSectionHeader
                icon={Target}
                title="Basic information"
                description="Name, status, and target period"
              />
              <DetailFieldGrid>
                <DetailField hideWhenEmpty={false} label="Name" value={target.target_name} />
              <DetailField
                hideWhenEmpty={false}
                label="Status"
                value={
                  target.status ? (
                    <StatusBadge status={target.status} />
                  ) : null
                }
              />
              <DetailField
                hideWhenEmpty={false}
                label="Period"
                value={target.target_period}
              />
              <DetailField
                hideWhenEmpty={false}
                label="Plant"
                value={
                  target.plant_name ? (
                    <Link
                      to={`/plants/${target.plant_name}`}
                      className="font-medium text-brand-700 hover:underline dark:text-brand-400"
                    >
                      {target.plant_name}
                    </Link>
                  ) : null
                }
              />
            </DetailFieldGrid>
          </DetailSectionCard>

          {/* AUDIT */}
          <DetailSectionCard>
            <DetailSectionHeader
              icon={Info}
              title="Audit information"
            />
            <DetailFieldGrid>
              <DetailField
                label="Created By"
                hideWhenEmpty={false}
                value={
                  target.created_by ? (
                    <Link
                      to={`/users/${target.created_by}/profile`}
                      className="font-medium text-brand-700 hover:underline dark:text-brand-400"
                    >
                      {target.created_by_name || target.created_by}
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
                  target.updated_by ? (
                    <Link
                      to={`/users/${target.updated_by}/profile`}
                      className="font-medium text-brand-700 hover:underline dark:text-brand-400"
                    >
                      {target.updated_by_name || target.updated_by}
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
                  target.created_at ? formateDateTime(target.created_at) : null
                }
              />
              <DetailField
                label="Updated At"
                hideWhenEmpty={false}
                value={
                  target.updated_at ? formateDateTime(target.updated_at) : null
                }
              />
            </DetailFieldGrid>
          </DetailSectionCard>

          {/* COMPONENT
          {target.component_id && (
              <DetailSectionCard>
                <DetailSectionHeader
                  icon={Cpu}
                  title="Linked component"
                  description="Component associated with this target"
                />
                <div className="p-2 space-y-1">
                  <div className="flex items-center gap-4 rounded-sm border border-neutral-200 dark:border-neutral-dark-200 bg-neutral-50 dark:bg-neutral-dark-50 px-4 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-warning-50 dark:bg-warning-900/20 border border-neutral-300 dark:border-neutral-dark-300">
                      <Cpu className="h-4 w-4 text-warning-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-800 dark:text-neutral-dark-900">
                        {target.component_name || "Component"}
                      </p>
                      
                    </div>
                  </div>
                </div>
              </DetailSectionCard>
            )} */}

          {/* PARAMETERS */}
          {parameterEntries.length > 0 && (
              <DetailSectionCard>
                <DetailSectionHeader
                  icon={BarChart2}
                  title="Parameters"
                  description="Parameter values configured for this target"
                />
                <div className="p-2 space-y-1">
                  {parameterEntries.map(([parameter, config]) => (
                    <div
                      key={parameter}
                      className="flex items-center gap-4 rounded-sm border border-neutral-200 dark:border-neutral-dark-200 bg-neutral-50 dark:bg-neutral-dark-50 px-4 py-3"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-brand-50 dark:bg-brand-900/20 border border-neutral-300 dark:border-neutral-dark-300">
                        <BarChart2 className="h-4 w-4 text-brand-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-dark-900">
                          {parameter}
                        </p>
                        <p className="font-mono text-xs text-neutral-400 dark:text-neutral-dark-400 mt-0.5 truncate">
                          {Number(config.value).toLocaleString("en-IN")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </DetailSectionCard>
            )}

        </DetailSectionsGrid>
      </DetailMain>

      {/* edit modal */}
      <Modal
        open={!!showEdit}
        onClose={() => setShowEdit(false)}
        title="Edit Target"
        subtitle={target?.target_name || "Update target details"}
        icon={Edit}
        maxWidth="max-w-3xl"
      >
        {target && showEdit && (
          <TargetForm
            mode="edit"
            initialValues={target}
            onSuccess={() => setShowEdit(false)}
            close={() => setShowEdit(false)}
            isOpen={showEdit}
          />
        )}
      </Modal>

      {/* delete confirm */}
      <ConfirmationDialog
        open={confirmOpen}
        onClose={() => {
          if (deleteMutation.isPending) return;
          setConfirmOpen(false);
        }}
        onConfirm={handleDelete}
        title="Delete Target"
        message="Are you sure you want to delete this target? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        isLoading={deleteMutation.isPending}
      />
    </DetailPageBackground>
  );
};

export default TargetDetails;
