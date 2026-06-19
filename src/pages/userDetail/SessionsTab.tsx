/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { useParams } from "react-router-dom";
import {
    Monitor, Smartphone, Tablet, Globe, Trash2,
    LogOut, RefreshCw, Clock, MapPin, ShieldAlert,
} from "lucide-react";
import {
    useGetSessionsQuery,
    useTerminateSessionMutation,
    useTerminateAllSessionsMutation,
    type ProfileSession,
} from "@/services/operations/profileAPI";
import Spinner from "@/components/common/Spinner";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";

// ─── Props ────────────────────────────────────────────────────────────────────

interface SessionsTabProps {
    context: "me" | "user";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DeviceIcon = ({ type }: { type: string }) => {
    const cls = "w-5 h-5 shrink-0";
    if (type === "mobile") return <Smartphone className={cls} />;
    if (type === "tablet") return <Tablet className={cls} />;
    return <Monitor className={cls} />;
};

function fmtDate(d: string) {
    return new Date(d).toLocaleString(undefined, {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

function timeSince(d: string) {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60_000);
    if (m < 1) return "Just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

// ─── Session Card ─────────────────────────────────────────────────────────────

const SessionCard = ({
    session, onTerminate, terminating,
}: {
    session: ProfileSession;
    onTerminate: (id: string) => void;
    terminating: boolean;
}) => (
    <div className={`relative rounded-xs border p-4 transition-all ${session.is_current
        ? "border-brand-400 bg-brand-500/5 dark:bg-brand-400/8"
        : "border-neutral-200 dark:border-neutral-dark-200 bg-white dark:bg-neutral-dark-100"
        } shadow-sm`}
    >
        {session.is_current && (
            <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-500 text-white">
                Current
            </span>
        )}

        <div className="flex items-start gap-3">
            <div className="p-2 rounded-xs bg-neutral-100 dark:bg-neutral-dark-200 text-neutral-600 dark:text-neutral-dark-700 shrink-0">
                <DeviceIcon type={session.device_type} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-dark-950">
                        {session.browser} · {session.os}
                    </p>
                    <span className="text-xs text-neutral-400 dark:text-neutral-dark-500 capitalize">
                        {session.device_type}
                    </span>
                </div>
                <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-dark-600">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span>{session.ip_address || "—"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-dark-600">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span>Started {timeSince(session.created_at)} · expires {fmtDate(session.expires_at)}</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Terminate — not shown for current session */}
        {!session.is_current && (
            <button
                onClick={() => onTerminate(session.session_id)}
                disabled={terminating}
                className="mt-3 flex items-center gap-1.5 text-xs font-medium text-error-600 dark:text-error-400
            hover:text-error-700 dark:hover:text-error-300 disabled:opacity-50 transition-colors"
            >
                {terminating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                Terminate session
            </button>
        )}
    </div>
);

// ─── Component ────────────────────────────────────────────────────────────────

const SessionsTab: React.FC<SessionsTabProps> = ({ context }) => {
    const { id } = useParams<{ id: string }>();
    const ctx = context === "me" ? "me" : (id ?? "me");

    const { data, isLoading, isError, refetch } = useGetSessionsQuery(ctx);
    const terminateOne = useTerminateSessionMutation(ctx);
    const terminateAll = useTerminateAllSessionsMutation(ctx);

    const [confirmTerminateId, setConfirmTerminateId] = useState<string | null>(null);
    const [confirmTerminateAll, setConfirmTerminateAll] = useState(false);

    const raw = (data as any)?.data;
    const sessions: ProfileSession[] = raw?.sessions ?? raw?.data?.sessions ?? [];

    const otherSessions = sessions.filter((s) => !s.is_current);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Spinner size={3} />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="p-6">
                <div className="p-4 rounded-xs border border-error-500/30 bg-error-500/5 text-error-600 text-sm">
                    Failed to load sessions.
                </div>
            </div>
        );
    }

    // ── Context-aware "terminate all" copy ──────────────────────────────────
    const terminateAllTitle = context === "me"
        ? "Sign Out All Other Devices"
        : "Terminate All Sessions";

    const terminateAllMessage = context === "me"
        ? "This will sign you out from all other devices. Your current session will remain active."
        : "This will immediately terminate ALL sessions for this user, including any currently active ones.";

    return (
        <div className="p-6 max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-lg font-bold text-neutral-900 dark:text-neutral-dark-950">
                        Active Sessions
                    </h1>
                    <p className="text-sm text-neutral-500 dark:text-neutral-dark-600 mt-0.5">
                        {sessions.length} active session{sessions.length !== 1 ? "s" : ""}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => void refetch()}
                        className="p-2.5 rounded-xs border border-neutral-200 dark:border-neutral-dark-200 hover:bg-neutral-100 dark:hover:bg-neutral-dark-200 transition-colors text-neutral-500 dark:text-neutral-dark-600"
                        aria-label="Refresh"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>

                    {otherSessions.length > 0 && (
                        <button
                            onClick={() => setConfirmTerminateAll(true)}
                            className="flex items-center gap-2 px-3 py-2 rounded-xs text-sm font-medium
                border border-error-300 dark:border-error-700 text-error-600 dark:text-error-400
                hover:bg-error-50 dark:hover:bg-error-500/10 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            {context === "me" ? "Sign out others" : "Terminate all"}
                        </button>
                    )}
                </div>
            </div>

            {/* Sessions list */}
            {sessions.length === 0 ? (
                <div className="text-center py-16">
                    <Globe className="w-10 h-10 text-neutral-200 dark:text-neutral-dark-400 mx-auto mb-3" />
                    <p className="text-sm text-neutral-400 dark:text-neutral-dark-500">No active sessions found.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {sessions.map((s) => (
                        <SessionCard
                            key={s.session_id}
                            session={s}
                            onTerminate={(sid) => setConfirmTerminateId(sid)}
                            terminating={terminateOne.isPending}
                        />
                    ))}
                </div>
            )}

            {/* Security note */}
            <div className="flex items-start gap-2 p-3 rounded-xs bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <p>If you see a session you don't recognise, terminate it immediately and change your password.</p>
            </div>

            {/* Confirm — terminate single */}
            <ConfirmationDialog
                open={!!confirmTerminateId}
                onClose={() => setConfirmTerminateId(null)}
                onConfirm={async () => {
                    if (confirmTerminateId) {
                        await terminateOne.mutateAsync(confirmTerminateId);
                        setConfirmTerminateId(null);
                    }
                }}
                title="Terminate Session"
                message="This will immediately log out the device associated with this session."
                confirmText="Terminate"
                cancelText="Cancel"
                type="danger"
                isLoading={terminateOne.isPending}
            />

            {/* Confirm — terminate all */}
            <ConfirmationDialog
                open={confirmTerminateAll}
                onClose={() => setConfirmTerminateAll(false)}
                onConfirm={async () => {
                    await terminateAll.mutateAsync();
                    setConfirmTerminateAll(false);
                }}
                title={terminateAllTitle}
                message={terminateAllMessage}
                confirmText={context === "me" ? "Sign Out Others" : "Terminate All"}
                cancelText="Cancel"
                type="danger"
                isLoading={terminateAll.isPending}
            />
        </div>
    );
};

export default SessionsTab;
