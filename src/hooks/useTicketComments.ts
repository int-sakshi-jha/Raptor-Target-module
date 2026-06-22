import { useState, useEffect, useCallback } from "react";
import {
    useGetCommentsByTicketIdQuery,
    useCreateCommentMutation,
    useUpdateCommentMutation,
} from "@/services/operations/commentAPI";
import type { TicketComment, CommentPayload } from "@/services/operations/commentAPI";

export type { TicketComment, CommentPayload };

const PAGE_SIZE = 6;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTicketComments(ticketId: string | number | undefined) {
    const [page, setPage]           = useState(1);
    const [comments, setComments]   = useState<TicketComment[]>([]);

    const createMutation = useCreateCommentMutation();
    const updateMutation = useUpdateCommentMutation();

    const query = useGetCommentsByTicketIdQuery({
        ticketId,
        page,
        page_size: PAGE_SIZE,
    });
    console.log("query",query)

    // Actual response shape:
    // query.data.data.data.comments      -> TicketComment[]
    // query.data.data.data.pagination     -> { page, limit, total_count, total_pages, has_next, ... }
    const responseComments = query.data?.data?.comments ?? [];
    const pagination = query.data?.data?.pagination;
    console.log("response",responseComments)

    // Accumulate pages — page 1 resets the list, subsequent pages append
    useEffect(() => {
        if (!query.data) return;
        setComments((prev) =>
            page === 1
                ? responseComments
                : [
                      ...prev,
                      ...responseComments.filter(
                          (c: TicketComment) => !prev.some((p) => p.id === c.id),
                      ),
                  ],
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query.data, page]);

    // After create, prepend locally and reset to page 1 so cache stays consistent
    const createComment = useCallback(
        async (payload: CommentPayload) => {
            if (!ticketId) throw new Error("No ticketId");
            const created = await createMutation.mutateAsync({
                ticket_id: ticketId,
                content: payload.content,
                attachments: payload.attachments,
            });
            setComments((prev) => [created, ...prev]);
            setPage(1);
            return created;
        },
        [ticketId, createMutation],
    );

    // After update, patch the comment in the local list
    const updateComment = useCallback(
        async (commentId: string | number, payload: CommentPayload) => {
            if (!ticketId) throw new Error("No ticketId");
            const updated = await updateMutation.mutateAsync({
                ticket_id: ticketId,
                comment_id: commentId,
                content: payload.content,
                attachments: payload.attachments,
            });
            setComments((prev) =>
                prev.map((c) => (c.id === commentId ? { ...c, ...updated } : c)),
            );
            return updated;
        },
        [ticketId, updateMutation],
    );

    const loadMore = useCallback(() => {
        setPage((p) => p + 1);
    }, []);

    const loadInitial = useCallback(async () => {
        setPage(1);
        await query.refetch();
    }, [query]);
    console.log("sakshiiiiiiiii",comments)
    return {
        comments,
        total:      pagination?.total_count ?? 0,
        hasMore:    pagination?.has_next    ?? false,
        isLoading:  query.isLoading,
        isFetching: query.isFetching,
        isInitialLoading: query.isLoading,
        isFetchingMore: query.isFetching,
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending,
        loadMore,
        loadInitial,
        fetchNextPage: loadMore,
        createComment,
        updateComment,
    };
}