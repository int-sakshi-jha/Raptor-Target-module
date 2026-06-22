import React, { useCallback, useRef, useState } from "react";
import {
    MessageSquare,
    Paperclip,
    Send,
    X,
    Download,
    FileText,
    ChevronDown,
    Loader2,
    ImageIcon,
    Pencil,
    Check,
    XCircle,
} from "lucide-react";
import Spinner from "@/components/common/Spinner";
import RichTextEditor from "@/components/common/RichTextEditor";
import { formateDateTime } from "@/utils/gridFormatters";
import type { CommentAttachment, TicketComment, CommentPayload } from "@/services/operations/commentAPI";

// Re-export so TicketDetails can import from one place if needed
export type { TicketComment, CommentPayload };

// ─── Panel props ──────────────────────────────────────────────────────────────

export interface TicketCommentsPanelProps {
    ticket:{};
    comments: TicketComment[];
    total: number;
    isInitialLoading?: boolean;
    isFetchingMore?: boolean;
    isLoading?: boolean;
    isFetching?: boolean;
    hasMore: boolean;
    isCreating: boolean;
    isUpdating?: boolean;
    fetchNextPage?: () => void;
    loadMore?: () => void;
    createComment: (payload: CommentPayload) => Promise<TicketComment>;
    updateComment?: (commentId: string | number, payload: CommentPayload) => Promise<TicketComment>;
    /** Pass the logged-in user's id to show the Edit button only on own comments */
    currentUserId?: string | number;
}

// ─── Avatar helpers ───────────────────────────────────────────────────────────

const AVATAR_PALETTE = [
    "bg-brand-100 text-brand-700 dark:bg-brand-800/40 dark:text-brand-300",
    "bg-blue-100 text-blue-700 dark:bg-blue-800/40 dark:text-blue-300",
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-800/40 dark:text-emerald-300",
    "bg-violet-100 text-violet-700 dark:bg-violet-800/40 dark:text-violet-300",
    "bg-amber-100 text-amber-700 dark:bg-amber-800/40 dark:text-amber-300",
];

function avatarColor(name: string): string {
    let hash = 0;
    console.log("name",name.length)
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function initials(name: string): string {
    return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

function formatBytes(bytes?: number): string | null {
    if (!bytes) return null;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── CommentAvatar ────────────────────────────────────────────────────────────

const CommentAvatar: React.FC<{ name: string; avatarUrl?: string }> = ({ name, avatarUrl }) => {
    if (avatarUrl) {
        return <img src={avatarUrl} alt={name} className="h-8 w-8 flex-shrink-0 rounded-full object-cover" />;
    }
    return (
        <span className={`inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold tracking-wide ${avatarColor(name)}`}>
            {initials(name)}
        </span>
    );
};

// ─── AttachmentChip ───────────────────────────────────────────────────────────

const AttachmentChip: React.FC<{ attachment: CommentAttachment }> = ({ attachment }) => {
    const size = formatBytes(attachment.size);
    const isImage = attachment.mime_type?.startsWith("image/");
    const Icon = isImage ? ImageIcon : FileText;
    return (
        <a
            href={attachment.url}
            target="_blank"
            rel="noopener noreferrer"
            download={attachment.name}
            className="group inline-flex items-center gap-1.5 rounded-xs border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs text-neutral-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-neutral-dark-300 dark:bg-neutral-dark-100 dark:text-neutral-dark-600 dark:hover:border-brand-600 dark:hover:bg-brand-900/20 dark:hover:text-brand-300"
        >
            <Icon className="h-3 w-3 flex-shrink-0 text-neutral-400 group-hover:text-brand-500" />
            <span className="max-w-[140px] truncate">{attachment.name}</span>
            {size && <span className="text-neutral-400">{size}</span>}
            <Download className="h-3 w-3 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
        </a>
    );
};

// ─── PendingFileChip ──────────────────────────────────────────────────────────

const PendingFileChip: React.FC<{ file: File; onRemove: () => void }> = ({ file, onRemove }) => {
    const size = formatBytes(file.size);
    return (
        <span className="inline-flex items-center gap-1.5 rounded-xs border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs text-neutral-600 dark:border-neutral-dark-300 dark:bg-neutral-dark-100 dark:text-neutral-dark-600">
            <FileText className="h-3 w-3 flex-shrink-0 text-neutral-400" />
            <span className="max-w-[120px] truncate">{file.name}</span>
            {size && <span className="text-neutral-400">{size}</span>}
            <button type="button" onClick={onRemove} className="ml-0.5 rounded-full text-neutral-400 transition-colors hover:text-error-500" aria-label={`Remove ${file.name}`}>
                <X className="h-3 w-3" />
            </button>
        </span>
    );
};

// ─── InlineEditor ─────────────────────────────────────────────────────────────

const InlineEditor: React.FC<{
    initialContent: string;
    isSaving: boolean;
    onSave: (content: string) => Promise<void>;
    onCancel: () => void;
}> = ({ initialContent, isSaving, onSave, onCancel }) => {
    const [content, setContent] = useState(initialContent);
    const isEmpty = !content || content === "<p></p>" || content.replace(/<[^>]*>/g, "").trim().length === 0;

    return (
        <div className="mt-1 overflow-hidden rounded-xs border border-brand-300 bg-neutral-0 dark:border-brand-600 dark:bg-neutral-dark-50">
            <RichTextEditor value={content} onChange={setContent} placeholder="Edit comment…" minHeight="72px" disabled={isSaving} />
            <div className="flex items-center justify-end gap-2 border-t border-neutral-100 bg-neutral-50 px-2 py-1.5 dark:border-neutral-dark-200 dark:bg-neutral-dark-100">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isSaving}
                    className="inline-flex items-center gap-1 rounded-xs px-2 py-1 text-xs text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-50 dark:text-neutral-dark-500 dark:hover:bg-neutral-dark-200"
                >
                    <XCircle className="h-3.5 w-3.5" />Cancel
                </button>
                <button
                    type="button"
                    onClick={() => onSave(content)}
                    disabled={isEmpty || isSaving}
                    className="inline-flex items-center gap-1 rounded-xs bg-brand-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-brand-500 dark:hover:bg-brand-400"
                >
                    {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}Save
                </button>
            </div>
        </div>
    );
};

// ─── CommentBubble ────────────────────────────────────────────────────────────

const CommentBubble: React.FC<{
    comment: TicketComment;
    canEdit?: boolean;
    isUpdating: boolean;
    onEdit: (commentId: string | number, content: string) => Promise<void>;
}> = ({ comment, canEdit = false, isUpdating, onEdit }) => {
    const [editing, setEditing] = useState(false);

    return (
        <div className="flex gap-3">
            <div className="flex flex-col items-center">
                <CommentAvatar name={comment.created_by_name} avatarUrl={comment.created_by_avatar} />
            </div>

            <div className="min-w-0 flex-1 pb-1">
                <div className="mb-1.5 flex items-baseline gap-2">
                    <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-dark-950">
                        {comment.created_by_name}
                    </span>
                    <time className="text-xs text-neutral-400 dark:text-neutral-dark-400">
                        {formateDateTime(comment.created_at)}
                    </time>
                    {comment.updated_at && comment.updated_at !== comment.created_at && (
                        <span className="text-xs italic text-neutral-400 dark:text-neutral-dark-400">(edited)</span>
                    )}
                    {canEdit && !editing && (
                        <button
                            type="button"
                            onClick={() => setEditing(true)}
                            className="ml-auto inline-flex items-center gap-1 rounded-xs px-1.5 py-0.5 text-xs text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:text-neutral-dark-400 dark:hover:bg-neutral-dark-200 dark:hover:text-neutral-dark-600"
                            aria-label="Edit comment"
                        >
                            <Pencil className="h-3 w-3" />Edit
                        </button>
                    )}
                </div>

                {editing ? (
                    <InlineEditor
                        initialContent={comment.content}
                        isSaving={isUpdating}
                        onSave={async (content) => { await onEdit(comment.id, content); setEditing(false); }}
                        onCancel={() => setEditing(false)}
                    />
                ) : (
                    <div className="rounded-xs rounded-tl-none border border-neutral-200 bg-neutral-50 px-3 py-2.5 dark:border-neutral-dark-200 dark:bg-neutral-dark-100">
                        <div
                            className="tiptap-editor text-xs leading-relaxed text-neutral-700 dark:text-neutral-dark-700 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_code]:rounded [&_code]:bg-neutral-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_code]:dark:bg-neutral-dark-200"
                            dangerouslySetInnerHTML={{ __html: comment.content }}
                        />
                        {comment.attachments && comment.attachments.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5 border-t border-neutral-200 pt-2 dark:border-neutral-dark-200">
                                {comment.attachments.map((att) => <AttachmentChip key={att.id} attachment={att} />)}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── LoadMore ─────────────────────────────────────────────────────────────────

const LoadMore: React.FC<{ hasMore: boolean; isFetching: boolean; loadMore: () => void }> = ({
    hasMore, isFetching, loadMore,
}) => {
    if (!hasMore) return null;
    return (
        <div className="flex justify-center py-3">
            <button
                type="button"
                onClick={loadMore}
                disabled={isFetching}
                className="inline-flex items-center gap-1.5 rounded-xs border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:border-neutral-300 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-dark-300 dark:bg-neutral-dark-100 dark:text-neutral-dark-600 dark:hover:bg-neutral-dark-200"
            >
                {isFetching
                    ? <><Loader2 className="h-3 w-3 animate-spin" />Loading…</>
                    : <><ChevronDown className="h-3 w-3" />Load older comments</>
                }
            </button>
        </div>
    );
};

// ─── ActivityFeed ─────────────────────────────────────────────────────────────

const ActivityFeed: React.FC<{
    comments: TicketComment[];
    isLoading: boolean;
    currentUserId?: string | number;
    isUpdating?: boolean;
    onEditComment?: (commentId: string | number, content: string) => Promise<void>;
}> = ({ comments, isLoading, currentUserId, isUpdating, onEditComment }) => {
    console.log("comments",comments)
    if (isLoading) {
        return (
            <div className="flex flex-1 items-center justify-center py-16">
                <div className="flex flex-col items-center gap-3">
                    <Spinner size={3} />
                    <p className="text-xs text-neutral-400 dark:text-neutral-dark-400">Loading activity…</p>
                </div>
            </div>
        );
    }

    if (comments.length === 0) {
        return (
            <div className="flex flex-1 items-center justify-center py-16">
                <div className="flex flex-col items-center gap-2 text-center">
                    <div className="rounded-full bg-neutral-100 p-3 dark:bg-neutral-dark-100">
                        <MessageSquare className="h-5 w-5 text-neutral-300 dark:text-neutral-dark-400" />
                    </div>
                    <p className="text-xs font-medium text-neutral-500 dark:text-neutral-dark-500">No activity yet</p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-dark-400">Be the first to comment.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-0">
            {comments.map((c, idx) => (
                <div
                    key={c.id}
                    className={`relative ${idx < comments.length - 1 ? "before:absolute before:left-[15px] before:top-8 before:h-[calc(100%-8px)] before:w-px before:bg-neutral-200 dark:before:bg-neutral-dark-200" : ""} pb-4`}
                >
                    <CommentBubble
                        comment={c}
                        canEdit={!!onEditComment && currentUserId != null && c.created_by === currentUserId}
                        isUpdating={!!isUpdating}
                        onEdit={onEditComment ?? (async () => undefined)}
                    />
                </div>
            ))}
        </div>
    );
};

// ─── CommentComposer ──────────────────────────────────────────────────────────

const CommentComposer: React.FC<{
    onSubmit: (payload: CommentPayload) => Promise<void>;
    isSubmitting: boolean;
}> = ({ onSubmit, isSubmitting }) => {
    const [content, setContent] = useState("");
    const [files, setFiles]     = useState<File[]>([]);
    const fileInputRef          = useRef<HTMLInputElement>(null);

    const isEmpty = !content || content === "<p></p>" || content.replace(/<[^>]*>/g, "").trim().length === 0;

    const handleSubmit = async () => {
        if (isEmpty || isSubmitting) return;
        await onSubmit({ content, attachments: files.length ? files : undefined });
        setContent("");
        setFiles([]);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const chosen = Array.from(e.target.files ?? []);
        if (!chosen.length) return;
        setFiles((prev) => {
            const existing = new Set(prev.map((f) => `${f.name}|${f.size}`));
            return [...prev, ...chosen.filter((f) => !existing.has(`${f.name}|${f.size}`))];
        });
        e.target.value = "";
    };

    return (
        <div className="flex gap-3">
            <div className="flex flex-col items-center pt-0.5">
                <span className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700 dark:bg-brand-800/40 dark:text-brand-300">
                    You
                </span>
            </div>

            <div className="min-w-0 flex-1">
                <div className="overflow-hidden rounded-xs border border-neutral-200 bg-neutral-0 transition-colors focus-within:border-brand-400 dark:border-neutral-dark-300 dark:bg-neutral-dark-50 dark:focus-within:border-brand-600">
                    <RichTextEditor value={content} onChange={setContent} placeholder="Leave a comment…" minHeight="80px" disabled={isSubmitting} />
                    <div className="flex items-center justify-between border-t border-neutral-100 bg-neutral-50 px-2 py-1.5 dark:border-neutral-dark-200 dark:bg-neutral-dark-100">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isSubmitting}
                            title="Attach file"
                            aria-label="Attach file"
                            className="inline-flex items-center gap-1.5 rounded-xs px-2 py-1 text-xs text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-neutral-dark-500 dark:hover:bg-neutral-dark-200 dark:hover:text-neutral-dark-700"
                        >
                            <Paperclip className="h-3.5 w-3.5" /><span>Attach</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isEmpty || isSubmitting}
                            title="Send comment"
                            aria-label="Send comment"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-xs bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-brand-500 dark:hover:bg-brand-400"
                        >
                            {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        </button>
                    </div>
                </div>

                {files.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {files.map((f, i) => (
                            <PendingFileChip key={`${f.name}|${f.size}`} file={f} onRemove={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))} />
                        ))}
                    </div>
                )}
            </div>

            <input ref={fileInputRef} type="file" multiple className="hidden" tabIndex={-1} aria-hidden onChange={handleFileChange} />
        </div>
    );
};

// ─── TicketCommentsPanel ──────────────────────────────────────────────────────

const TicketCommentsPanel: React.FC<TicketCommentsPanelProps> = ({
    ticket,
    comments,
    total,
    isInitialLoading,
    isFetchingMore,
    isLoading,
    isFetching,
    hasMore,
    isCreating,
    isUpdating,
    fetchNextPage,
    loadMore,
    createComment,
    updateComment,
    currentUserId,
}) => {
    const loading = isLoading ?? isInitialLoading ?? false;
    const fetching = isFetching ?? isFetchingMore ?? false;
    const onLoadMore = loadMore ?? fetchNextPage ?? (() => undefined);

    const handleCreate = useCallback(
        async (payload: CommentPayload) => {
            await createComment(payload);
        },
        [createComment],
    );

    const handleEdit = useCallback(
        async (commentId: string | number, content: string) => {
            await updateComment?.(commentId, { content });
        },
        [updateComment],
    );

    return (
        <div className="flex flex-col overflow-y-auto">

            <div className="flex flex-shrink-0 items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-dark-200">
                <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-neutral-400 dark:text-neutral-dark-400" />
                    <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-dark-950">Activity</span>
                    {!loading && total > 0 && (
                        <span className="text-xs text-neutral-400 dark:text-neutral-dark-400">
                            {total} comment{total !== 1 ? "s" : ""}
                        </span>
                    )}
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                <LoadMore hasMore={hasMore} isFetching={fetching} loadMore={onLoadMore} />
                <ActivityFeed
                    comments={comments}
                    isLoading={loading}
                    currentUserId={currentUserId}
                    isUpdating={isUpdating}
                    onEditComment={updateComment ? handleEdit : undefined}
                />
            </div>

            <div className="flex-shrink-0 border-t border-neutral-200 px-4 py-4 dark:border-neutral-dark-200">
                <CommentComposer onSubmit={handleCreate} isSubmitting={isCreating} />
            </div>

        </div>
    );
};

export default TicketCommentsPanel;
