import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { createPortal } from "react-dom";
import {
    Boxes,
    ChevronsDownUp,
    ChevronsUpDown,
    Component,
    Edit,
    Network,
    Power,
    Table2,
    Trash2,
} from "lucide-react";
import Modal from "@/components/common/Modal";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import Spinner from "@/components/common/Spinner";
import TableRowActions, { type RowActionItem } from "@/components/core/table/TableRowActions";
import CommonToolbar, {
    buildAddAction,
    buildColumnsAction,
    buildExportAction,
    type ToolbarActionConfig,
} from "@/components/core/table/CommonToolbar";
import type { CommonTableHandle } from "@/components/core/table/CommonTable";
import ComponentForm from "@/components/core/form/ComponentForm";
import {
    type PlantComponentRow,
    useGetPlantComponentsQuery,
    useGetPlantDetailsQuery,
} from "@/services/operations/plantAPI";
import {
    type ComponentRow,
    isComponentDeleteChildrenConflict,
    useDeleteComponentMutation,
    useUpdateComponentMutation,
} from "@/services/operations/componentAPI";
import {
    DetailPageBackground,
} from "@/components/core/detail/DetailPagePrimitives";
import DiagramView, { DiagramViewToolbar, type DiagramViewHandle } from "./plant-components/DiagramView";
import TableView, {
    ComponentStatsHeader,
} from "./plant-components/TableView";
import {
    flatListToTreeOptions,
    flattenAll,
    formatComponentTypeTag,
    getAllExpandableIds,
    getExpandIdsForComponentIds,
    getMatchingComponentIds,
    normalizeComponentHierarchy,
    normalizeComponentType,
} from "./plant-components/shared";
import { useAppSelector } from "@/store/hooks";
import { hasPermission, PERMISSIONS } from "@/utils/permissions";

type ViewMode = "diagram" | "table";
type DiagramInteractionMode = "zoom" | "move";

const getPlantComponentsViewStorageKey = (plantId?: string) =>
    `plant-components:view:${plantId ?? "default"}`;

const HIGHLIGHT_PULSE_MS = 2100;

// const DiagramFloatingToolbar: React.FC<{ children: React.ReactNode }> = ({ children }) => {
//     if (typeof document === "undefined") return null;

//     return createPortal(
//         <div className="pointer-events-none absolute bottom-3 left-10 z-[8] px-3">
//             <div className="pointer-events-auto max-w-[calc(100vw-1.5rem)]">
//                 {children}
//             </div>
//         </div>,
//         document.body,
//     );
// };

const PlantComponents: React.FC = () => {
    const { id: plantId } = useParams<{ id: string }>();
    const [selectedView, setSelectedView] = useState<ViewMode>(() => {
        if (typeof window === "undefined") return "diagram";
        const savedView = window.localStorage.getItem(getPlantComponentsViewStorageKey());
        return savedView === "table" ? "table" : "diagram";
    });
    const [search, setSearch] = useState("");
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [diagramInteractionMode, setDiagramInteractionMode] = useState<DiagramInteractionMode>("zoom");
    const [isDiagramCtrlPressed, setIsDiagramCtrlPressed] = useState(false);
    const diagramViewRef = useRef<DiagramViewHandle>(null);
    const tableRef = useRef<CommonTableHandle>(null);
    const columnPanelRef = useRef<{ openPanel: () => void }>(null);
    const [expandedState, setExpandedState] = useState<{
        plantId: string | null | undefined;
        ids: Set<string> | null;
    }>({
        plantId,
        ids: new Set(),
    });
    const userPermissions = useAppSelector((state) => state.auth.permissions);
    const [showCreate, setShowCreate] = useState(false);
    const [mountCreateForm, setMountCreateForm] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [editingComponent, setEditingComponent] = useState<PlantComponentRow | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deletingComponent, setDeletingComponent] = useState<PlantComponentRow | null>(null);
    const [deleteNeedsSubtreeConfirm, setDeleteNeedsSubtreeConfirm] = useState(false);
    const [typeHighlight, setTypeHighlight] = useState<string | null>(null);
    const [isHighlightPulsing, setIsHighlightPulsing] = useState(false);
    const typeHighlightRef = useRef<string | null>(null);
    const highlightPulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    typeHighlightRef.current = typeHighlight;

    const { data: plantResponse } = useGetPlantDetailsQuery(plantId);
    const plant = plantResponse?.data?.data ?? plantResponse?.data ?? plantResponse?.plant;

    const {
        data: rows = [],
        isLoading,
        isError,
        error,
        refetch,
    } = useGetPlantComponentsQuery(plantId, { fullDetails: true });

    const normalizedRows = useMemo(() => normalizeComponentHierarchy(rows), [rows]);
    const deleteMutation = useDeleteComponentMutation();
    const updateMutation = useUpdateComponentMutation();
    const tree = useMemo(
        () => flatListToTreeOptions(normalizedRows),
        [normalizedRows],
    );
    const allExpandableIds = useMemo(() => getAllExpandableIds(tree), [tree]);

    const effectiveExpandedIds = useMemo(
        () =>
            expandedState.plantId === plantId && expandedState.ids
                ? expandedState.ids
                : new Set<string>(),
        [expandedState, plantId, tree],
    );

    const isAllExpanded = useMemo(
        () => allExpandableIds.length > 0 && allExpandableIds.every((id) => effectiveExpandedIds.has(id)),
        [allExpandableIds, effectiveExpandedIds],
    );

    const isSearchActive = search.trim().length > 0;
    const tableComponentCounts = useMemo(() => {
        const counts = new Map<string, { label: string; count: number }>();

        flattenAll(tree).forEach(({ node }) => {
            const type = normalizeComponentType(node.component_type);
            const existing = counts.get(type);

            if (existing) {
                existing.count += 1;
                return;
            }

            counts.set(type, {
                label: formatComponentTypeTag(node.component_type),
                count: 1,
            });
        });

        const typeOrder = ["P", "B", "AC", "INV", "DC", "STR", "M"];

        return Array.from(counts.entries())
            .map(([type, value]) => ({ type, ...value }))
            .sort((a, b) => {
                const aIndex = typeOrder.indexOf(a.type);
                const bIndex = typeOrder.indexOf(b.type);
                return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
            });
    }, [tree]);

    const typeHighlightExpandIds = useMemo(() => {
        if (!typeHighlight) return null;
        const targetIds = getMatchingComponentIds(tree, typeHighlight);
        return getExpandIdsForComponentIds(tree, targetIds);
    }, [tree, typeHighlight]);

    const handleTypeHighlight = useCallback(
        (type: string | null) => {
            if (highlightPulseTimerRef.current) {
                window.clearTimeout(highlightPulseTimerRef.current);
                highlightPulseTimerRef.current = null;
            }

            if (type === null) {
                setTypeHighlight(null);
                setIsHighlightPulsing(false);
                return;
            }

            const previous = typeHighlightRef.current;
            const next = previous === type ? null : type;

            if (next) {
                const targetIds = getMatchingComponentIds(tree, next);
                const expandIds = getExpandIdsForComponentIds(tree, targetIds);
                setExpandedState({ plantId, ids: expandIds });
                setTypeHighlight(next);
                setIsHighlightPulsing(true);
                highlightPulseTimerRef.current = window.setTimeout(() => {
                    setIsHighlightPulsing(false);
                    highlightPulseTimerRef.current = null;
                }, HIGHLIGHT_PULSE_MS);
                return;
            }

            setTypeHighlight(null);
            setIsHighlightPulsing(false);
        },
        [plantId, tree],
    );

    useEffect(
        () => () => {
            if (highlightPulseTimerRef.current) {
                window.clearTimeout(highlightPulseTimerRef.current);
            }
        },
        [],
    );

    const canToggleStatus = hasPermission(
        userPermissions,
        PERMISSIONS.COMPONENT.UPDATE,
    );
    const canEdit = hasPermission(userPermissions, PERMISSIONS.COMPONENT.UPDATE);
    const canDelete = hasPermission(userPermissions, PERMISSIONS.COMPONENT.DELETE);
    const canShowRowActions = canToggleStatus || canEdit || canDelete;
    const editingFormInitialValues = useMemo(
        () => (editingComponent ? (editingComponent as Partial<ComponentRow>) : undefined),
        [editingComponent],
    );

    const openEditComponent = useCallback((component: PlantComponentRow) => {
        setEditingComponent(component);
        setShowEdit(true);
    }, []);

    const requestDeleteComponent = useCallback((component: PlantComponentRow) => {
        setDeletingComponent(component);
        setDeleteNeedsSubtreeConfirm(false);
        setConfirmOpen(true);
    }, []);

    const handleToggleStatus = useCallback(
        async (component: PlantComponentRow) => {
            await updateMutation.mutateAsync({ id: component.id, is_active: !component.is_active });
            await refetch();
        },
        [refetch, updateMutation],
    );

    const renderComponentActions = useCallback(
        (component: PlantComponentRow) => {
            const items: RowActionItem[] = [
                {
                    key: "toggle",
                    label: component.is_active ? "Deactivate" : "Activate",
                    icon: <Power className="h-4 w-4" />,
                    variant: component.is_active ? "success" : "neutral",
                    show: canToggleStatus,
                    disabled: deleteMutation.isPending || updateMutation.isPending,
                    onClick: (event) => {
                        event.stopPropagation();
                        void handleToggleStatus(component);
                    },
                },
                {
                    key: "edit",
                    label: "Edit",
                    icon: <Edit className="h-4 w-4" />,
                    variant: "brand",
                    show: canEdit,
                    disabled: deleteMutation.isPending || updateMutation.isPending,
                    onClick: (event) => {
                        event.stopPropagation();
                        openEditComponent(component);
                    },
                },
                {
                    key: "delete",
                    label: "Delete",
                    icon: <Trash2 className="h-4 w-4" />,
                    variant: "danger",
                    show: canDelete,
                    disabled: deleteMutation.isPending || updateMutation.isPending,
                    onClick: (event) => {
                        event.stopPropagation();
                        requestDeleteComponent(component);
                    },
                },
            ];

            return <TableRowActions items={items} className="justify-end" />;
        },
        [
            canDelete,
            canEdit,
            canToggleStatus,
            deleteMutation.isPending,
            handleToggleStatus,
            openEditComponent,
            requestDeleteComponent,
            updateMutation.isPending,
        ],
    );

    const expandAll = useCallback(() => {
        setExpandedState({ plantId, ids: new Set(allExpandableIds) });
    }, [allExpandableIds, plantId]);

    const collapseAll = useCallback(() => {
        setExpandedState({ plantId, ids: new Set() });
    }, [plantId]);

    const toggleExpand = useCallback((entryId: string) => {
        setExpandedState((prev) => {
            const currentIds =
                prev.plantId === plantId && prev.ids ? prev.ids : new Set<string>();
            const next = new Set(currentIds);
            if (next.has(entryId)) {
                next.delete(entryId);
            } else {
                next.add(entryId);
            }
            return { plantId, ids: next };
        });
    }, [plantId, tree]);

    const zoomBy = useCallback((delta: number) => {
        setScale((previous) => Math.max(0.25, Math.min(3, parseFloat((previous + delta).toFixed(2)))));
    }, []);

    const handleResetDiagramViewport = useCallback(() => {
        diagramViewRef.current?.fitToViewport();
    }, []);

    const isComponentModalOpen = showCreate || showEdit;

    const openCreateModal = useCallback(() => {
        setShowCreate(true);
    }, []);

    const toolbarActions = useMemo<ToolbarActionConfig[]>(
        () => [
            buildAddAction(
                openCreateModal,
                hasPermission(userPermissions, PERMISSIONS.COMPONENT.CREATE),
            ),
            {
                key: "expand-all",
                label: isAllExpanded ? "Collapse All" : "Expand All",
                icon: isAllExpanded ? (
                    <ChevronsDownUp className="h-4 w-4" />
                ) : (
                    <ChevronsUpDown className="h-4 w-4" />
                ),
                onClick: isAllExpanded ? collapseAll : expandAll,
                variant: "outline",
                disabled: isSearchActive,
                show: selectedView === "table",
            },
            buildColumnsAction({ show: selectedView === "table" }),
            buildExportAction({
                show: selectedView === "table",
                fileName: "plant-components",
            }),
        ],
        [
            collapseAll,
            expandAll,
            isAllExpanded,
            isSearchActive,
            selectedView,
            userPermissions,
            openCreateModal,
        ],
    );

    const createPlantName = useMemo(
        () =>
            plant?.plant_name ??
            rows.find((row) => row.plant_name)?.plant_name ??
            "Current Plant",
        [plant?.plant_name, rows],
    );

    const createInitialValues = useMemo(
        () =>
            plantId
                ? {
                      plant_id: plantId,
                      plant_name: createPlantName,
                  }
                : undefined,
        [createPlantName, plantId],
    );

    useEffect(() => {
        if (!showCreate) {
            setMountCreateForm(false);
            return;
        }

        const frameId = window.requestAnimationFrame(() => {
            setMountCreateForm(true);
        });

        return () => window.cancelAnimationFrame(frameId);
    }, [showCreate]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const savedView = window.localStorage.getItem(
            getPlantComponentsViewStorageKey(plantId),
        );
        if (savedView === "diagram" || savedView === "table") {
            setSelectedView(savedView);
            return;
        }
        setSelectedView("diagram");
    }, [plantId]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem(
            getPlantComponentsViewStorageKey(plantId),
            selectedView,
        );
        window.localStorage.setItem(
            getPlantComponentsViewStorageKey(),
            selectedView,
        );
    }, [plantId, selectedView]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Control") {
                setIsDiagramCtrlPressed(true);
            }
        };

        const handleKeyUp = (event: KeyboardEvent) => {
            if (event.key === "Control") {
                setIsDiagramCtrlPressed(false);
            }
        };

        const handleWindowBlur = () => {
            setIsDiagramCtrlPressed(false);
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        window.addEventListener("blur", handleWindowBlur);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
            window.removeEventListener("blur", handleWindowBlur);
        };
    }, []);

    const effectiveDiagramInteractionMode: DiagramInteractionMode =
    isDiagramCtrlPressed
        ? diagramInteractionMode === "move" ? "zoom" : "move"
        : diagramInteractionMode;

    return (
        <DetailPageBackground className="min-h-0 overflow-hidden">
                <div
                    className={[
                        "flex min-h-0 flex-1 flex-col overflow-hidden p-2",
                    ].join(" ")}
                >
                    {tree.length > 0 && (
                        <div className="shrink-0">
                            <ComponentStatsHeader
                                totalCount={rows.length}
                                componentCounts={tableComponentCounts}
                                selectedType={typeHighlight}
                                onTypeSelect={handleTypeHighlight}
                            />
                        </div>
                    )}

                    <CommonToolbar
                        search={search}
                        onSearchChange={setSearch}
                        actions={toolbarActions}
                        placeholder="Search by name, code, or type"
                        tabs={[
                            { key: "diagram", label: "", icon: <Network className="h-4 w-4" /> },
                            { key: "table", label: "", icon: <Table2 className="h-4 w-4" /> },
                        ]}
                        selectedTab={selectedView}
                        onTabChange={(key) => setSelectedView(key as ViewMode)}
                        columnPanelRef={columnPanelRef}
                        tableRef={tableRef}
                    />

                    {isLoading ? (
                        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20">
                            <Spinner size={2} />
                            <p className="text-sm text-neutral-600 dark:text-neutral-dark-500">
                                Loading components…
                            </p>
                        </div>
                    ) : isError ? (
                        <div className="flex flex-1 flex-col justify-center px-6 py-10">
                            <div className="mx-auto max-w-lg rounded-xs border border-error-300/70 bg-error-500/10 px-4 py-4 text-center text-sm text-error-800 dark:border-error-500/30 dark:text-error-300">
                                Could not load components.
                                <button
                                    type="button"
                                    className="mt-3 block w-full rounded-xs font-semibold text-brand-700 underline dark:text-brand-400"
                                    onClick={() => void refetch()}
                                >
                                    Try again
                                </button>
                                {error instanceof Error && (
                                    <p className="mt-2 font-mono text-xs opacity-90">
                                        {error.message}
                                    </p>
                                )}
                            </div>
                        </div>
                    ) : tree.length === 0 ? (
                        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
                            <div className="rounded-xs border border-brand-200 bg-brand-50 p-4 dark:border-brand-800 dark:bg-brand-950/15">
                                <Boxes className="h-11 w-11 text-brand-600 dark:text-brand-400" />
                            </div>
                            <div>
                                <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                                    No components
                                </p>
                                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-dark-600">
                                    This plant has no component hierarchy yet.
                                </p>
                            </div>
                        </div>
                    ) : selectedView === "diagram" ? (
                        <div className="w-full h-full relative flex min-h-0 flex-1 overflow-hidden">
                            {/* <DiagramFloatingToolbar> */}
                                    <DiagramViewToolbar
                                        interactionMode={effectiveDiagramInteractionMode}
                                        onSetInteractionMode={setDiagramInteractionMode}
                                        scale={scale}
                                        onZoomIn={() => zoomBy(0.1)}
                                        onZoomOut={() => zoomBy(-0.1)}
                                        onResetZoom={handleResetDiagramViewport}
                                    />
                            {/* </DiagramFloatingToolbar> */}
                            <DiagramView
                                ref={diagramViewRef}
                                key={plantId ?? "plant-components-diagram"}
                                tree={tree}
                                isLoading={isLoading}
                                scale={scale}
                                position={position}
                                setScale={setScale}
                                setPosition={setPosition}
                                interactionMode={effectiveDiagramInteractionMode}
                                highlightedType={typeHighlight}
                                isHighlightPulsing={isHighlightPulsing}
                                highlightExpandIds={typeHighlightExpandIds}
                                renderActions={canShowRowActions ? renderComponentActions : undefined}
                            />
                        </div>
                    ) : !isComponentModalOpen ? (
                        <TableView
                            tree={tree}
                            search={search}
                            isSearchActive={isSearchActive}
                            effectiveExpandedIds={effectiveExpandedIds}
                            onToggleExpand={toggleExpand}
                            highlightedType={typeHighlight}
                            isHighlightPulsing={isHighlightPulsing}
                            renderActions={canShowRowActions ? renderComponentActions : undefined}
                            showActions={canShowRowActions}
                            onClearSearch={() => setSearch("")}
                            tableRef={tableRef}
                            columnPanelRef={columnPanelRef}
                        />
                    ) : (
                        <div className="relative min-h-0 w-full flex-1" aria-hidden="true" />
                    )}
                </div>

            <Modal
                open={showCreate}
                onClose={() => setShowCreate(false)}
                title="Create Component"
                subtitle={plant?.plant_name ? `Add a component to ${plant.plant_name}` : "Add a new component to this plant"}
                icon={Component}
                maxWidth="max-w-4xl"
            >
                {mountCreateForm ? (
                    <ComponentForm
                        key={`create-component-${plantId ?? "none"}`}
                        mode="create"
                        initialValues={createInitialValues}
                        lockPlantSelection
                        onSuccess={() => {
                            setShowCreate(false);
                            void refetch();
                        }}
                    />
                ) : (
                    <div className="flex items-center justify-center py-16">
                        <Spinner size={3} />
                    </div>
                )}
            </Modal>

            <Modal
                open={!!(showEdit && editingComponent)}
                onClose={() => {
                    setShowEdit(false);
                    setEditingComponent(null);
                }}
                title="Edit Component"
                subtitle={editingComponent?.component_name ?? "Update component details"}
                icon={Component}
                maxWidth="max-w-4xl"
            >
                {editingComponent ? (
                    <ComponentForm
                        mode="edit"
                        initialValues={editingFormInitialValues}
                        onSuccess={() => {
                            setShowEdit(false);
                            setEditingComponent(null);
                            void refetch();
                        }}
                    />
                ) : null}
            </Modal>

            <ConfirmationDialog
                open={confirmOpen}
                onClose={() => {
                    if (deleteMutation.isPending) return;
                    setConfirmOpen(false);
                    setDeletingComponent(null);
                    setDeleteNeedsSubtreeConfirm(false);
                }}
                onConfirm={async () => {
                    if (!deletingComponent) return;
                    try {
                        await deleteMutation.mutateAsync({
                            id: deletingComponent.id,
                            is_delete_child: deleteNeedsSubtreeConfirm,
                        });
                        await refetch();
                        setConfirmOpen(false);
                        setDeletingComponent(null);
                        setDeleteNeedsSubtreeConfirm(false);
                    } catch (error) {
                        if (
                            !deleteNeedsSubtreeConfirm &&
                            isComponentDeleteChildrenConflict(error)
                        ) {
                            setDeleteNeedsSubtreeConfirm(true);
                        }
                    }
                }}
                title={deleteNeedsSubtreeConfirm ? "Delete entire subtree?" : "Delete component"}
                message={
                    deleteNeedsSubtreeConfirm
                        ? "This component has child components. Proceeding will permanently delete this component and all nested child components. This cannot be undone."
                        : "Are you sure you want to delete this component? This action cannot be undone."
                }
                confirmText={deleteNeedsSubtreeConfirm ? "Delete subtree" : "Delete"}
                cancelText="Cancel"
                type={deleteNeedsSubtreeConfirm ? "warning" : "danger"}
                isLoading={deleteMutation.isPending}
            />
        </DetailPageBackground>
    );
};

export default PlantComponents;
