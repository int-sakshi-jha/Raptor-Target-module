/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { useParams } from "react-router-dom";
import {
    KeyRound, Plus, Trash2, RefreshCw, Copy, Check,
    Eye, EyeOff, Clock, AlertTriangle, ShieldOff,
} from "lucide-react";
import {
    useGetApiKeyQuery,
    useCreateApiKeyMutation,
    useDeleteApiKeyMutation,
    useGetMyDetailProfileQuery,
    useGetUserDetailProfileQuery,
    type ApiKey,
} from "@/services/operations/profileAPI";
import Spinner from "@/components/common/Spinner";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import Button from "@/components/common/Button";
import { formateDateTime } from "@/utils/gridFormatters";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ApiAccessTabProps {
    context: "me" | "user";
}

// ─── New Key Reveal ───────────────────────────────────────────────────────────

const NewKeyReveal = ({ apiKey, onDismiss }: { apiKey: string; onDismiss: () => void }) => {
    const [copied, setCopied] = useState(false);
    const [visible, setVisible] = useState(false);

    const copy = async () => {
    try {
        await navigator.clipboard.writeText(apiKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    } catch (err) {
        // 🔥 fallback for non-https / older browsers
        const textarea = document.createElement("textarea");
        textarea.value = apiKey;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);

        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
};

    return (
        <div className="rounded-xl border border-success-400 bg-success-50 dark:bg-success-500/10 p-4 space-y-3">
            <div className="flex items-center gap-2 text-success-700 dark:text-success-400 font-semibold text-sm">
                <Check className="w-4 h-4" /> API Key created — copy it now, it won't be shown again.
            </div>
            <div className="flex items-center gap-2">
                <code className="flex-1 bg-white dark:bg-neutral-dark-200 border border-neutral-200 dark:border-neutral-dark-300 rounded-lg px-3 py-2 text-xs font-mono text-neutral-800 dark:text-neutral-dark-950 overflow-x-auto break-all">
                    {visible ? apiKey : apiKey.replace(/./g, "•")}
                </code>
                <button
                    onClick={() => setVisible((v) => !v)}
                    className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-dark-300 hover:bg-neutral-100 dark:hover:bg-neutral-dark-200 text-neutral-500 transition-colors"
                >
                    {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                    onClick={copy}
                    className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-dark-300 hover:bg-neutral-100 dark:hover:bg-neutral-dark-200 text-neutral-500 transition-colors"
                >
                    {copied ? <Check className="w-4 h-4 text-success-600" /> : <Copy className="w-4 h-4" />}
                </button>
            </div>
            <button onClick={onDismiss} className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors">
                I've saved the key — dismiss
            </button>
        </div>
    );
};

// ─── API Key Card ─────────────────────────────────────────────────────────────
// Matches GET response: { api_key: string, api_key_created_at: string }

const ApiKeyCard = ({
    apiKey, onDelete, deleting,
}: {
    apiKey: ApiKey;
    onDelete: () => void;
    deleting: boolean;
}) => (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-dark-200 bg-white dark:bg-neutral-dark-100 p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
                <div className="p-2 rounded-lg shrink-0 bg-brand-500/10 dark:bg-brand-400/12">
                    <KeyRound className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-dark-950">
                        API Key
                    </p>
                    {/* Show masked key value */}
                    <code className="text-xs text-neutral-400 dark:text-neutral-dark-500 font-mono break-all">
                        {apiKey.api_key}
                    </code>
                </div>
            </div>

            <button
                onClick={onDelete}
                disabled={deleting}
                className="p-1.5 rounded-lg text-error-500 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-500/10 transition-colors disabled:opacity-50 shrink-0"
                aria-label="Delete key"
            >
                {deleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-400 dark:text-neutral-dark-500">
            <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Created {formateDateTime(apiKey.api_key_created_at)}
            </span>
        </div>
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const ApiAccessTab: React.FC<ApiAccessTabProps> = ({ context }) => {
    const { id } = useParams<{ id: string }>();
    const ctx = context === "me" ? "me" : (id ?? "me");

    // ── Fetch profile to check enable_api_access (cached with ProfileTab) ──────
    const myProfileQ = useGetMyDetailProfileQuery(context === "me");
    const userProfileQ = useGetUserDetailProfileQuery(context === "user" ? id : null);
    const profileQuery = context === "me" ? myProfileQ : userProfileQ;

    const rawProfile = (profileQuery.data as any)?.data;
    const profile = rawProfile?.user ?? rawProfile?.data?.user ?? rawProfile ?? null;
    const apiEnabled = profile?.enable_api_access === true;

    // ── Only fetch when access is enabled ─────────────────────────────────────
    const { data, isLoading, isError, refetch } = useGetApiKeyQuery(ctx, apiEnabled);
    const createMutation = useCreateApiKeyMutation(ctx);
    const deleteMutation = useDeleteApiKeyMutation(ctx);

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [newKeyValue, setNewKeyValue] = useState<string | null>(null);

    // Parse the actual GET response shape:
    // { data: { api_key: "...", api_key_created_at: "..." } }
    const rawKey = (data as any)?.data;
    const currentKey: ApiKey | null =
        rawKey?.api_key
            ? { api_key: rawKey.api_key, api_key_created_at: rawKey.api_key_created_at }
            : null;

    // ── Generate: plain POST, no body ─────────────────────────────────────────
    const handleGenerate = () => {
        createMutation.mutate({} as any, {
            onSuccess: (res: any) => {
                const fullKey =
                    res?.data?.api_key ??
                    res?.data?.key ??
                    res?.api_key ??
                    "";
                if (fullKey) setNewKeyValue(fullKey);
            },
        });
    };

    const handleRefresh = () => {
        // The full key is one-time reveal only; hide it on any manual refresh.
        setNewKeyValue(null);
        void refetch();
    };

    // ── Loading state ─────────────────────────────────────────────────────────
    if (profileQuery.isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Spinner size={3} />
            </div>
        );
    }

    // ── API access not enabled ────────────────────────────────────────────────
    if (!apiEnabled) {
        return (
            <div className="p-6 max-w-3xl mx-auto">
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="p-4 rounded-2xl bg-neutral-100 dark:bg-neutral-dark-200">
                        <ShieldOff className="w-10 h-10 text-neutral-400 dark:text-neutral-dark-500" />
                    </div>
                    <div className="text-center">
                        <h2 className="text-base font-semibold text-neutral-700 dark:text-neutral-dark-800">
                            API Access Not Enabled
                        </h2>
                        <p className="mt-1 text-sm text-neutral-400 dark:text-neutral-dark-500 max-w-xs">
                            {context === "me"
                                ? "API access is not enabled for your account. Contact your administrator to enable it."
                                : "API access is not enabled for this user. Enable it from the user settings to manage API keys."}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // ── Key fetch error ───────────────────────────────────────────────────────
    if (isError) {
        return (
            <div className="p-6">
                <div className="p-4 rounded-xl border border-error-500/30 bg-error-500/5 text-error-600 text-sm">
                    Failed to load API key.
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-lg font-bold text-neutral-900 dark:text-neutral-dark-950">API Key</h1>
                    <p className="text-sm text-neutral-500 dark:text-neutral-dark-600 mt-0.5">
                        {currentKey ? "Active API key for programmatic access." : "No API key generated yet."}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Refresh */}
                    <button
                        onClick={handleRefresh}
                        className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-dark-200 hover:bg-neutral-100 dark:hover:bg-neutral-dark-200 transition-colors text-neutral-500"
                        aria-label="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                    </button>

                    {/* Generate — only when no key exists */}
                    {!currentKey && (
                        <Button
                            type="button"
                            variant="primary"
                            onClick={handleGenerate}
                            loading={createMutation.isPending}
                            disabled={createMutation.isPending}
                        >
                            <Plus className="w-4 h-4 mr-1.5" />
                            Generate Key
                        </Button>
                    )}
                </div>
            </div>

            {/* New key reveal banner */}
            {newKeyValue && (
                <NewKeyReveal apiKey={newKeyValue} onDismiss={() => setNewKeyValue(null)} />
            )}

            {/* Current key / loading / empty */}
            {isLoading ? (
                <div className="flex items-center justify-center h-32">
                    <Spinner size={2} />
                </div>
            ) : currentKey ? (
                <ApiKeyCard
                    apiKey={currentKey}
                    onDelete={() => setShowDeleteConfirm(true)}
                    deleting={deleteMutation.isPending}
                />
            ) : (
                !createMutation.isPending && (
                    <div className="text-center py-12">
                        <KeyRound className="w-10 h-10 text-neutral-200 dark:text-neutral-dark-400 mx-auto mb-3" />
                        <p className="text-sm text-neutral-400 dark:text-neutral-dark-500">No API key yet.</p>
                        <p className="text-xs text-neutral-300 dark:text-neutral-dark-400 mt-1">
                            Click "Generate Key" above to create one.
                        </p>
                    </div>
                )
            )}

            {/* Security notice */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                    <p className="font-semibold">Keep your API key secret.</p>
                    <p className="mt-0.5 opacity-80">
                        Treat keys like passwords — never share them in client-side code or public repos.
                    </p>
                </div>
            </div>

            {/* Confirm delete */}
            <ConfirmationDialog
                open={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={async () => {
                    await deleteMutation.mutateAsync();
                    setNewKeyValue(null);
                    setShowDeleteConfirm(false);
                }}
                title="Delete API Key"
                message="This key will stop working immediately. Any integrations using it will break. You can generate a new one afterwards."
                confirmText="Delete Key"
                cancelText="Cancel"
                type="danger"
                isLoading={deleteMutation.isPending}
            />
        </div>
    );
};

export default ApiAccessTab;
