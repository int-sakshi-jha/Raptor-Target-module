import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";

import {
    useGetTicketByIdQuery,
    useDeleteTicketMutation,
} from "@/services/operations/TicketAPI.ts";
import Badge, { type BadgeVariant } from "@/components/common/ColorBadge";
import { useDetailBreadcrumb } from "@/context/BreadcrumbContext";
import TicketForm from "@/components/core/form/TicketForm.tsx";
import Button from "@/components/common/Button";
import Spinner from "@/components/common/Spinner";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import Modal from "@/components/common/Modal";
import {
    DetailField,
    DetailFieldGrid,
    DetailPageBackground,
    DetailMain,
    DetailSectionsGrid,
    DetailSectionCard,
    DetailSectionHeader,
} from "@/components/core/detail/DetailPagePrimitives";
import {
    ArrowLeft,
    Edit,
    Ticket,
    Info,
    RefreshCw,
    User,
    MapPin,
    Cpu,
} from "lucide-react";
import { formateDateTime } from "@/utils/gridFormatters";
import TicketCommentsPanel from "@/components/core/comments/TicketCommentsPanel";
import { useTicketComments } from "@/hooks/useTicketComments";

/* ─────────────────────────── status badge ───────────────────────────────── */

export const TicketStatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const map: Record<string, { variant: BadgeVariant; label: string }> = {
        open: { variant: "orange", label: "Open" },
        in_progress: { variant: "blue", label: "In Progress" },
        on_hold: { variant: "gray", label: "On Hold" },
        resolved: { variant: "green", label: "Resolved" },
        closed: { variant: "gray", label: "Closed" },
        re_open: { variant: "orange", label: "Re-Opened" },
        cancelled: { variant: "no", label: "Cancelled" },
    };
    const entry = map[status] ?? { variant: "gray" as BadgeVariant, label: status };
    return <Badge variant={entry.variant}>{entry.label}</Badge>;
};

/* ─────────────────────────── priority badge ─────────────────────────────── */

export const TicketPriorityBadge: React.FC<{ priority: string }> = ({ priority }) => {
    const map: Record<string, { variant: BadgeVariant; label: string }> = {
        low: { variant: "green", label: "Low" },
        medium: { variant: "blue", label: "Medium" },
        high: { variant: "orange", label: "High" },
        urgent: { variant: "no", label: "Urgent" },
    };
    const entry = map[priority] ?? { variant: "gray" as BadgeVariant, label: priority };
    return <Badge variant={entry.variant}>{entry.label}</Badge>;
};

/* ─────────────────────────── AccordionCard ──────────────────────────────── */


/* ─────────────────────────── main component ─────────────────────────────── */

const TicketDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [showEdit, setShowEdit] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const navigate = useNavigate();

    const {
        data: ticketResponse,
        isLoading,
        isError,
        error,
    } = useGetTicketByIdQuery(id);

    const deleteMutation = useDeleteTicketMutation();

    const ticketResponseData = ticketResponse as any;
    const ticket =
        ticketResponseData?.data?.data ??
        ticketResponseData?.data ??
        ticketResponseData ??
        null;

    useDetailBreadcrumb(ticket?.title);

    /* ── comments ── */
    const commentsHook = useTicketComments(id);

    useEffect(() => {
        if (id) commentsHook.loadInitial();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    /* ── delete ── */
    const handleDelete = async () => {
        if (!id) return;
        try {
            await deleteMutation.mutateAsync([id]);
            setConfirmOpen(false);
            navigate("/tickets");
        } catch {
            /* handled by mutation */
        }
    };

    /* ── loading ── */
    if (isLoading) {
        return (
            <DetailPageBackground>
                <div className="flex flex-1 items-center justify-center p-4">
                    <div className="rounded-xs border border-neutral-200 bg-neutral-0 px-6 py-8 text-center dark:border-neutral-dark-200 dark:bg-neutral-dark-200">
                        <Spinner size={3} />
                        <p className="mt-3 text-sm font-medium text-neutral-600 dark:text-neutral-400">
                            Loading ticket details...
                        </p>
                    </div>
                </div>
            </DetailPageBackground>
        );
    }

    /* ── error ── */
    if (isError || !ticket) {
        return (
            <DetailPageBackground>
                <div className="flex flex-1 items-center justify-center p-4">
                    <div className="max-w-md text-center">
                        <div className="mb-4 inline-block rounded-xs bg-error-500/10 p-4 dark:bg-error-500/20">
                            <Ticket className="h-12 w-12 text-error-600 dark:text-error-400" />
                        </div>
                        <h2 className="mb-2 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                            Ticket Not Found
                        </h2>
                        <p className="mb-6 text-sm text-neutral-600 dark:text-neutral-400">
                            {error
                                ? "Failed to load ticket details. Please try again."
                                : "The ticket you're looking for doesn't exist."}
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

    return (
        /*
         * DetailPageBackground must be a full-height flex column so that
         * the two-column body below can use flex-1 + height:0 to fill
         * exactly the remaining space without causing page-level overflow.
         */
        <DetailPageBackground className="flex h-[calc(100dvh-40px)] flex-col overflow-hidden">
            <style>{`
                .ticket-detail-scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .ticket-detail-scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .ticket-detail-comments-scope [class*="overflow-y-auto"],
                .ticket-detail-comments-scope [class*="overflow-auto"] {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .ticket-detail-comments-scope [class*="overflow-y-auto"]::-webkit-scrollbar,
                .ticket-detail-comments-scope [class*="overflow-auto"]::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
            {/* ── hero (fixed height, never scrolls) ── */}
            {/* <DetailHero
                icon={Ticket}
                title={ticket.title || "Ticket"}
                subtitle={`#${ticket.ticket_number} · ${ticket.plant_name ?? "No plant"}`}
                badges={heroBadges}
                stats={heroStats.length > 0 ? heroStats : undefined}
                className="shrink-0 rounded-none border-x-0 border-t-0 shadow-none"
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
            /> */}

            {/*
             * ── two-column body ──────────────────────────────────────────────
             *
             * KEY TRICK: `height: 0` + `flex-1` forces this div to occupy
             * exactly the remaining viewport height after the hero, instead
             * of growing to fit its content (which would push past the viewport
             * and make the *page* scroll rather than the columns).
             *
             * Both columns are then independently scrollable inside this
             * fixed-height container.
             */}
            <div className="flex flex-1 min-h-0 overflow-hidden">

                {/* ── left:  cards (independently scrollable) ── */}
                <DetailMain className="w-2/3 ticket-detail-scrollbar-hide flex-1 min-h-0 overflow-y-auto">
                    <DetailSectionsGrid maxColumns={2}>

                        {/* OVERVIEW */}
                        <DetailSectionCard>
                            <DetailSectionHeader
                                icon={Ticket}
                                title="Ticket information"
                                description="Title, status, priority, and description"
                            />
                            <DetailFieldGrid>
                                <DetailField hideWhenEmpty={false} label="Title" value={ticket.title} />
                                <DetailField hideWhenEmpty={false} label="Status" value={<TicketStatusBadge status={ticket.status} />} />
                                <DetailField hideWhenEmpty={false} label="Priority" value={<TicketPriorityBadge priority={ticket.priority} />} />
                                <DetailField hideWhenEmpty={false} label="Due Date" value={ticket.due_date ? formateDateTime(ticket.due_date) : null} />
                                <DetailField hideWhenEmpty={false} label="Resolved At" value={ticket.resolved_at ? formateDateTime(ticket.resolved_at) : null} />
                                <DetailField hideWhenEmpty={false} label="Description" value={ticket.description} />
                            </DetailFieldGrid>
                        </DetailSectionCard>

                        {/* REPORTER */}
                        <DetailSectionCard>
                            <DetailSectionHeader
                                icon={User}
                                title="Reporter"
                                description="Who raised this ticket"
                            />
                            <DetailFieldGrid>
                                <DetailField hideWhenEmpty={false} label="Name" value={ticket.name} />
                                <DetailField hideWhenEmpty={false} label="Email" value={ticket.email} />
                                <DetailField hideWhenEmpty={false} label="Phone Number" value={ticket.phone_number} />
                            </DetailFieldGrid>
                        </DetailSectionCard>

                        {/* CONTEXT */}
                        <DetailSectionCard>
                            <DetailSectionHeader
                                icon={MapPin}
                                title="Context"
                                description="Plant and component linked to this ticket"
                            />
                            <DetailFieldGrid>
                                <DetailField
                                    hideWhenEmpty={false}
                                    label="Plant"
                                    value={
                                        ticket.plant_name ? (
                                            <Link
                                                to={`/plants/${ticket.plant_id}`}
                                                className="font-medium text-brand-700 hover:underline dark:text-brand-400"
                                            >
                                                {ticket.plant_name}
                                            </Link>
                                        ) : null
                                    }
                                />
                                <DetailField hideWhenEmpty={false} label="Component Type" value={ticket.component_type} />
                                <DetailField hideWhenEmpty={false} label="Component" value={ticket.component_name} />
                            </DetailFieldGrid>
                        </DetailSectionCard>

                        {/* ASSIGNMENT */}
                        <DetailSectionCard>
                            <DetailSectionHeader
                                icon={Cpu}
                                title="Assignment"
                                description="Who this ticket is assigned to"
                            />
                            <DetailFieldGrid>
                                <DetailField hideWhenEmpty={false} label="Assigned To" value={ticket.assignee_name} />
                                <DetailField hideWhenEmpty={false} label="Assigned By" value={ticket.assigned_by_name} />
                            </DetailFieldGrid>
                        </DetailSectionCard>

                        {/* STATUS HISTORY */}
                        {Array.isArray(ticket.status_history) && ticket.status_history.length > 0 && (
                            <DetailSectionCard className="min-h-0 max-h-[clamp(18rem,38vh,24rem)]">
                                <DetailSectionHeader
                                    icon={RefreshCw}
                                    title="Status history"
                                    description="All status changes recorded for this ticket"
                                />
                                <div className="flex min-h-0 flex-1 flex-col gap-2">
                                    <div className="ticket-detail-scrollbar-hide min-h-0 flex-1 overflow-y-auto pr-1">
                                    {ticket.status_history.map((entry: any, idx: number) => {
                                        const stayed = entry.stayed_in_status_seconds
                                            ? `${Math.round(entry.stayed_in_status_seconds / 60)}m`
                                            : null;
                                        return (
                                            <div
                                                key={idx}
                                                className="flex flex-col gap-2 rounded-sm border border-neutral-200 dark:border-neutral-dark-200 bg-neutral-50 dark:bg-neutral-dark-50 px-4 py-3"
                                            >
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {entry.from_status && (
                                                        <>
                                                            <TicketStatusBadge status={entry.from_status} />
                                                            <span className="text-neutral-400 text-sm">→</span>
                                                        </>
                                                    )}
                                                    <TicketStatusBadge status={entry.to_status} />
                                                    <span className="ml-auto text-xs text-neutral-500 dark:text-neutral-dark-400 shrink-0">
                                                        {entry.changed_at ? formateDateTime(entry.changed_at) : "—"}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs text-neutral-500 dark:text-neutral-dark-400">
                                                        Changed by{" "}
                                                        <Link
                                                            to={`/users/${entry.changed_by}/profile`}
                                                            className="font-medium text-brand-700 hover:underline dark:text-brand-400"
                                                        >
                                                            {entry.changed_by_name || entry.changed_by}
                                                        </Link>
                                                    </p>
                                                    {stayed && (
                                                        <span className="text-xs text-neutral-400 dark:text-neutral-dark-400">
                                                            Stayed {stayed}
                                                        </span>
                                                    )}
                                                </div>
                                                {entry.reason && (
                                                    <p className="text-xs text-neutral-600 dark:text-neutral-dark-500">
                                                        <span className="font-medium">Reason:</span>{" "}
                                                        {entry.reason}
                                                    </p>
                                                )}
                                            </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </DetailSectionCard>
                        )}

                        {/* AUDIT */}
                        <DetailSectionCard>
                            <DetailSectionHeader icon={Info} title="Audit information" />
                            <DetailFieldGrid>
                                <DetailField
                                    label="Created By"
                                    hideWhenEmpty={false}
                                    value={
                                        ticket.created_by ? (
                                            <Link
                                                to={`/users/${ticket.created_by}/profile`}
                                                className="font-medium text-brand-700 hover:underline dark:text-brand-400"
                                            >
                                                {ticket.created_by_name || ticket.created_by}
                                            </Link>
                                        ) : "—"
                                    }
                                />
                                <DetailField
                                    label="Updated By"
                                    hideWhenEmpty={false}
                                    value={
                                        ticket.updated_by ? (
                                            <Link
                                                to={`/users/${ticket.updated_by}/profile`}
                                                className="font-medium text-brand-700 hover:underline dark:text-brand-400"
                                            >
                                                {ticket.updated_by_name || ticket.updated_by}
                                            </Link>
                                        ) : "—"
                                    }
                                />
                                <DetailField
                                    label="Created At"
                                    hideWhenEmpty={false}
                                    value={ticket.created_at ? formateDateTime(ticket.created_at) : null}
                                />
                                <DetailField
                                    label="Updated At"
                                    hideWhenEmpty={false}
                                    value={ticket.updated_at ? formateDateTime(ticket.updated_at) : null}
                                />
                            </DetailFieldGrid>
                        </DetailSectionCard>

                    </DetailSectionsGrid>
                </DetailMain>

                {/*
                 * ── right: comments panel ────────────────────────────────────
                 *
                 * `overflow-hidden` here clips the panel to the column height.
                 * The actual scrolling happens *inside* TicketCommentsPanel —
                 * its comment list should be `flex-1 overflow-y-auto` and its
                 * composer input should be `shrink-0` at the bottom.
                 *
                 * Required structure inside TicketCommentsPanel:
                 *
                 *   <div className="flex h-full flex-col">
                 *     <div className="shrink-0 ...">Header</div>
                 *     <div className="flex-1 overflow-y-auto ...">Comments list</div>
                 *     <div className="shrink-0 ...">Composer input</div>
                 *   </div>
                 */}
                <div className="ticket-detail-comments-scope hidden w-1/3 shrink-0 border-l border-neutral-200 dark:border-neutral-dark-200 md:flex md:flex-col h-full min-h-0 overflow-hidden">
                    <TicketCommentsPanel
                        comments={commentsHook.comments}
                        total={commentsHook.total}
                        isInitialLoading={commentsHook.isInitialLoading}
                        isFetchingMore={commentsHook.isFetchingMore}
                        hasMore={commentsHook.hasMore}
                        isCreating={commentsHook.isCreating}
                        fetchNextPage={commentsHook.fetchNextPage}
                        createComment={commentsHook.createComment}
                    />
                </div>

            </div>

            {/* ── mobile: comments below accordions ── */}
            <div className="border-t border-neutral-200 dark:border-neutral-dark-200 md:hidden">
                <TicketCommentsPanel
                    comments={commentsHook.comments}
                    total={commentsHook.total}
                    isInitialLoading={commentsHook.isInitialLoading}
                    isFetchingMore={commentsHook.isFetchingMore}
                    hasMore={commentsHook.hasMore}
                    isCreating={commentsHook.isCreating}
                    fetchNextPage={commentsHook.fetchNextPage}
                    createComment={commentsHook.createComment}
                />
            </div>

            {/* edit modal */}
            <Modal
                open={!!showEdit}
                onClose={() => setShowEdit(false)}
                title="Edit Ticket"
                subtitle={ticket?.title || "Update ticket details"}
                icon={Edit}
                maxWidth="max-w-3xl"
            >
                {ticket && showEdit && (
                    <TicketForm
                        mode="edit"
                        initialValues={ticket}
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
                title="Delete Ticket"
                message="Are you sure you want to delete this ticket? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                type="danger"
                isLoading={deleteMutation.isPending}
            />
        </DetailPageBackground>
    );
};

export default TicketDetails;
