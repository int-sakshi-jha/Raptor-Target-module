import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useDetailBreadcrumb } from "@/context/BreadcrumbContext";
import {
    useGetAssetDetailsQuery,
    useDeleteAssetMutation,
} from "@/services/operations/assetsAPI";
import Badge, { type BadgeVariant } from "@/components/common/ColorBadge";
import AssetForm from "@/components/core/form/AssetForm";
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
    HardDrive,
    Info,
    Settings,
    Calendar,
    ShieldCheck,
    Wrench,
    RefreshCw,
} from "lucide-react";
import { formateDateTime } from "@/utils/gridFormatters";

/* ─────────────────────────── status badge ───────────────────────────────── */

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const map: Record<string, { variant: BadgeVariant; label: string }> = {
        in_stock: { variant: "gray", label: "In Stock" },
        inStock: { variant: "gray", label: "In Stock" },
        active: { variant: "green", label: "Active" },
        inactive: { variant: "gray", label: "Inactive" },
        faulty: { variant: "no", label: "Faulty" },
        under_maintenance: { variant: "orange", label: "Under Maintenance" },
        dead: { variant: "gray", label: "Dead" },
        replaced: { variant: "blue", label: "Replaced" },
    };

    const entry = map[status] ?? { variant: "gray" as BadgeVariant, label: status };

    return <Badge variant={entry.variant}>{entry.label}</Badge>;
};

/* ─────────────────────────── main component ─────────────────────────────── */

const AssetDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [showEdit, setShowEdit] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const navigate = useNavigate();

    const {
        data: assetResponse,
        isLoading,
        isError,
        error,
    } = useGetAssetDetailsQuery(id);

    const deleteMutation = useDeleteAssetMutation();

    const asset =
        assetResponse?.data?.data ?? assetResponse?.data ?? assetResponse?.asset;

    useDetailBreadcrumb(asset?.name);

    const handleDelete = async () => {
        if (!id) return;
        try {
            await deleteMutation.mutateAsync([id]);
            setConfirmOpen(false);
            navigate("/assets");
        } catch {
            /* handled by mutation */
        }
    };

    const formatDate = (dateStr: string) =>
        new Date(dateStr).toLocaleDateString("en-GB").replace(/\//g, "/");

    /* loading */
    if (isLoading) {
        return (
            <DetailPageBackground>
                <div className="flex flex-1 items-center justify-center p-4">
                    <div className="rounded-sm border border-neutral-200 bg-neutral-0 px-6 py-8 text-center dark:border-neutral-dark-200 dark:bg-neutral-dark-200">
                        <Spinner size={3} />
                        <p className="mt-3 text-sm font-medium text-neutral-600 dark:text-neutral-400">
                            Loading asset details...
                        </p>
                    </div>
                </div>
            </DetailPageBackground>
        );
    }

    /* error */
    if (isError || !asset) {
        return (
            <DetailPageBackground>
                <div className="flex flex-1 items-center justify-center p-4">
                    <div className="max-w-md text-center">
                        <div className="mb-4 inline-block rounded-sm bg-error-500/10 p-4 dark:bg-error-500/20">
                            <HardDrive className="h-12 w-12 text-error-600 dark:text-error-400" />
                        </div>
                        <h2 className="mb-2 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                            Asset Not Found
                        </h2>
                        <p className="mb-6 text-sm text-neutral-600 dark:text-neutral-400">
                            {error
                                ? "Failed to load asset details. Please try again."
                                : "The asset you're looking for doesn't exist."}
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
    const heroBadges = asset.status ? (
        <StatusBadge status={asset.status} />
    ) : undefined;

    /* hero stats */
    const heroStats: Array<{ label: string; value: React.ReactNode }> = [];
    if (asset.category_name) {
        heroStats.push({ label: "Category", value: asset.category_name });
    }
    if (asset.component_type) {
        heroStats.push({ label: "Type", value: asset.component_type });
    }
    if (asset.manufacturer_name) {
        heroStats.push({ label: "Manufacturer", value: asset.manufacturer_name });
    }

    return (
        <DetailPageBackground>
            <DetailHero
                icon={HardDrive}
                title={asset.name || "Asset"}
                subtitle="Plant asset linked to a component and plant"
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
                            icon={HardDrive}
                            title="Basic information"
                            description="Name, status, category, and plant"
                        />
                        <DetailFieldGrid>
                            <DetailField hideWhenEmpty={false} label="Name" value={asset.name} />
                            <DetailField
                                hideWhenEmpty={false}
                                label="Status"
                                value={
                                    asset.status ? (
                                        <StatusBadge status={asset.status} />
                                    ) : null
                                }
                            />
                            <DetailField
                                hideWhenEmpty={false}
                                label="Category"
                                value={asset.category_name}
                            />
                            <DetailField
                                hideWhenEmpty={false}
                                label="Component Type"
                                value={asset.component_type}
                            />
                            <DetailField
                                hideWhenEmpty={false}
                                label="Plant"
                                value={
                                    asset.plant_name ? (
                                        <Link
                                            to={`/plants/${asset.plant_id}`}
                                            className="font-medium text-brand-700 hover:underline dark:text-brand-400"
                                        >
                                            {asset.plant_name}
                                        </Link>
                                    ) : null
                                }
                            />
                            <DetailField
                                hideWhenEmpty={false}
                                label="Tenant"
                                value={asset.tenant_name}
                            />
                        </DetailFieldGrid>
                    </DetailSectionCard>

                    {/* IDENTIFICATION */}
                    <DetailSectionCard>
                        <DetailSectionHeader
                            icon={Settings}
                            title="Identification"
                            description="Model, serial number, and manufacturer details"
                        />
                        <DetailFieldGrid>
                            <DetailField
                                hideWhenEmpty={false}
                                label="Model Number"
                                value={asset.model_number}
                            />
                            <DetailField
                                hideWhenEmpty={false}
                                label="Serial Number"
                                value={asset.serial_number}
                            />
                            <DetailField
                                hideWhenEmpty={false}
                                label="Manufacturer"
                                value={asset.manufacturer_name}
                            />
                        </DetailFieldGrid>
                    </DetailSectionCard>

                    {/* DATES */}
                    <DetailSectionCard>
                        <DetailSectionHeader
                            icon={Calendar}
                            title="Key dates"
                            description="Manufacture, installation, and commissioning dates"
                        />
                        <DetailFieldGrid>
                            <DetailField
                                hideWhenEmpty={false}
                                label="Manufacture Date"
                                value={
                                    asset.manufacture_date
                                        ? formateDateTime(asset.manufacture_date)
                                        : null
                                }
                            />
                            <DetailField
                                hideWhenEmpty={false}
                                label="Purchase Date"
                                value={
                                    asset.purchase_date
                                        ? formateDateTime(asset.purchase_date)
                                        : null
                                }
                            />
                            <DetailField
                                hideWhenEmpty={false}
                                label="Installation Date"
                                value={
                                    asset.installation_date
                                        ? formateDateTime(asset.installation_date)
                                        : null
                                }
                            />
                            <DetailField
                                hideWhenEmpty={false}
                                label="Commissioning Date"
                                value={
                                    asset.commissioning_date
                                        ? formateDateTime(asset.commissioning_date)
                                        : null
                                }
                            />
                            {asset.retired_at && (
                                <DetailField
                                    hideWhenEmpty={false}
                                    label="Retired At"
                                    value={formateDateTime(asset.retired_at)}
                                />
                            )}
                        </DetailFieldGrid>
                    </DetailSectionCard>

                    {/* WARRANTY */}
                    <DetailSectionCard>
                        <DetailSectionHeader
                            icon={ShieldCheck}
                            title="Warranty"
                            description="Warranty start and end dates"
                        />
                        <DetailFieldGrid>
                            <DetailField
                                hideWhenEmpty={false}
                                label="Warranty Start"
                                value={
                                    asset.warranty_start_date
                                        ? formateDateTime(asset.warranty_start_date)
                                        : null
                                }
                            />
                            <DetailField
                                hideWhenEmpty={false}
                                label="Warranty End"
                                value={
                                    asset.warranty_end_date
                                        ? formateDateTime(asset.warranty_end_date)
                                        : null
                                }
                            />
                        </DetailFieldGrid>
                    </DetailSectionCard>

                    {/* SPECIFICATIONS */}
                    {asset.specifications &&
                        typeof asset.specifications === "object" &&
                        Object.keys(asset.specifications).length > 0 && (
                            <DetailSectionCard>
                                <DetailSectionHeader
                                    icon={Settings}
                                    title="Specifications"
                                    description="Technical specifications for this asset"
                                />
                                <div
                                    className="p-2 max-h-64 overflow-y-auto space-y-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                                >
                                    {Object.entries(asset.specifications).map(([key, value]) => (
                                        <div
                                            key={key}
                                            className="flex items-center justify-between gap-4 rounded-sm border border-neutral-200 dark:border-neutral-dark-200 bg-neutral-50 dark:bg-neutral-dark-50 px-4 py-3"
                                        >
                                            <p className="text-[10px] font-medium text-neutral-500 dark:text-neutral-dark-400 uppercase tracking-wide">
                                                {key}
                                            </p>
                                            <p className="text-xs font-medium text-neutral-800 dark:text-neutral-dark-900 text-right">
                                                {String(value)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </DetailSectionCard>
                        )}

                    {/* STATUS HISTORY */}
                    {Array.isArray(asset.status_history) && asset.status_history.length > 0 && (
                        <DetailSectionCard>
                            <DetailSectionHeader
                                icon={RefreshCw}
                                title="Status history"
                                description="All status changes recorded for this asset"
                            />
                            <div
                                className="p-2 max-h-64 overflow-y-auto space-y-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                            >
                                {asset.status_history.map((entry: any, idx: number, arr: any[]) => {
                                    const prev = arr[idx - 1];
                                    const fromStatus: string | null = prev?.status ?? null;
                                    const toStatus: string = entry.status;
                                    const changedAt = entry.changed_at
                                        ? formatDate(entry.changed_at)
                                        : "—";

                                    return (
                                        <div
                                            key={idx}
                                            className="flex flex-col gap-2 rounded-sm border border-neutral-200 dark:border-neutral-dark-200 bg-neutral-50 dark:bg-neutral-dark-50 px-4 py-3"
                                        >
                                            {/* status transition row */}
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {fromStatus ? (
                                                    <>
                                                        <StatusBadge status={fromStatus} />
                                                        <span className="text-neutral-400 text-sm">→</span>
                                                        <StatusBadge status={toStatus} />
                                                    </>
                                                ) : (
                                                    <StatusBadge status={toStatus} />
                                                )}
                                                <span className="ml-auto text-xs text-neutral-500 dark:text-neutral-dark-400 shrink-0">
                                                    {changedAt}
                                                </span>
                                            </div>

                                            {/* changed by */}
                                            <p className="text-xs text-neutral-500 dark:text-neutral-dark-400">
                                                Changed by{" "}
                                                <Link
                                                    to={`/users/${entry.changed_by}/profile`}
                                                    className="font-medium text-brand-700 hover:underline dark:text-brand-400"
                                                >
                                                    {entry.changed_by_name || entry.changed_by}
                                                </Link>
                                            </p>

                                            {/* reason & remarks */}
                                            {entry.reason && (
                                                <p className="text-xs text-neutral-600 dark:text-neutral-dark-500">
                                                    <span className="font-medium">Reason:</span>{" "}
                                                    {entry.reason}
                                                </p>
                                            )}
                                            {entry.remarks && (
                                                <p className="text-xs text-neutral-600 dark:text-neutral-dark-500">
                                                    <span className="font-medium">Remarks:</span>{" "}
                                                    {entry.remarks}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </DetailSectionCard>
                    )}

                    {/* REPLACEMENT HISTORY */}
                    {Array.isArray(asset.replacement_history) && asset.replacement_history.length > 0 && (
                        <DetailSectionCard>
                            <DetailSectionHeader
                                icon={Wrench}
                                title="Replacement history"
                                description="Assets replaced in relation to this asset"
                            />
                            <div className="p-2 space-y-2">
                                {asset.replacement_history.map((entry: any, idx: number) => {
                                    const replacedAt = entry.replacement_date
                                        ? formatDate(entry.replacement_date)
                                        : "—";

                                    return (
                                        <div
                                            key={idx}
                                            className="flex flex-col gap-2 rounded-sm border border-neutral-200 dark:border-neutral-dark-200 bg-neutral-50 dark:bg-neutral-dark-50 px-4 py-3"
                                        >
                                            {/* date row */}
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-medium text-neutral-500 dark:text-neutral-dark-400 uppercase tracking-wide">
                                                    Replacement
                                                </span>
                                                <span className="text-xs text-neutral-500 dark:text-neutral-dark-400">
                                                    {replacedAt}
                                                </span>
                                            </div>

                                            {/* old → new asset */}
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-xs text-neutral-400 dark:text-neutral-dark-400 uppercase tracking-wide">
                                                        Old Asset
                                                    </span>
                                                    <Link
                                                        to={`/plants/${asset.plant_id}/asset/${entry.old_asset_id}`}
                                                        className="text-xs font-medium text-brand-700 hover:underline dark:text-brand-400 font-mono"
                                                    >
                                                        {entry.old_asset_name}
                                                    </Link>
                                                </div>
                                                <span className="text-neutral-400 text-sm mx-1 self-end mb-0.5">→</span>
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-xs text-neutral-400 dark:text-neutral-dark-400 uppercase tracking-wide">
                                                        New Asset
                                                    </span>
                                                    <Link
                                                        to={`/plants/${asset.plant_id}/asset/${entry.new_asset_id}`}
                                                        className="text-xs font-medium text-brand-700 hover:underline dark:text-brand-400 font-mono"
                                                    >
                                                        {entry.new_asset_name}
                                                    </Link>
                                                </div>
                                            </div>

                                            {/* replaced by */}
                                            <p className="text-xs text-neutral-500 dark:text-neutral-dark-400">
                                                Replaced by{" "}
                                                <Link
                                                    to={`/users/${entry.replaced_by}/profile`}
                                                    className="font-medium text-brand-700 hover:underline dark:text-brand-400"
                                                >
                                                    {entry.replaced_by_name || entry.replaced_by}
                                                </Link>
                                            </p>

                                            {/* reason & remarks */}
                                            {entry.reason && (
                                                <p className="text-xs text-neutral-600 dark:text-neutral-dark-500">
                                                    <span className="font-medium">Reason:</span>{" "}
                                                    {entry.reason}
                                                </p>
                                            )}
                                            {entry.remarks && (
                                                <p className="text-xs text-neutral-600 dark:text-neutral-dark-500">
                                                    <span className="font-medium">Remarks:</span>{" "}
                                                    {entry.remarks}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </DetailSectionCard>
                    )}

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
                                    asset.created_by ? (
                                        <Link
                                            to={`/users/${asset.created_by}/profile`}
                                            className="font-medium text-brand-700 hover:underline dark:text-brand-400"
                                        >
                                            {asset.created_by_name || asset.created_by}
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
                                    asset.updated_by ? (
                                        <Link
                                            to={`/users/${asset.updated_by}/profile`}
                                            className="font-medium text-brand-700 hover:underline dark:text-brand-400"
                                        >
                                            {asset.updated_by_name || asset.updated_by}
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
                                    asset.created_at ? formateDateTime(asset.created_at) : null
                                }
                            />
                            <DetailField
                                label="Updated At"
                                hideWhenEmpty={false}
                                value={
                                    asset.updated_at ? formateDateTime(asset.updated_at) : null
                                }
                            />
                        </DetailFieldGrid>
                    </DetailSectionCard>

                </DetailSectionsGrid>
            </DetailMain>

            {/* edit modal */}
            <Modal
                open={!!showEdit}
                onClose={() => setShowEdit(false)}
                title="Edit Asset"
                subtitle={asset?.name || "Update asset details"}
                icon={Edit}
                maxWidth="max-w-3xl"
            >
                {asset && showEdit && (
                    <AssetForm
                        mode="edit"
                        initialValues={asset}
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
                title="Delete Asset"
                message="Are you sure you want to delete this asset? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                type="danger"
                isLoading={deleteMutation.isPending}
            />
        </DetailPageBackground>
    );
};

export default AssetDetails;