import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import axios from "axios"
//import { api } from "../api";
import { toastError } from "@/utils/errorFormatter";
import { commentsEndpoints } from "../endpoints";


const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMDE5ZWFiN2UtZDFhOS03NmVkLTllYjgtMjEzZTQzZDc0ZTg2Iiwic2Vzc2lvbl9pZCI6IjAxOWYwNDAxLWQxNWYtNzUwZS04Nzk2LWJmMDc5YTVlNjQzYiIsImlhdCI6MTc4MjQ3ODY1NSwiZXhwIjoyNjQ2NDc4NjU1fQ.awOa_AfYBh896mqInwLL4YRQkLTlwAwQTXaOjb-fFz4";

const api = axios.create({
    baseURL: "http://192.168.2.118:5000/api/v1",
    headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
    },
});


// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface CommentAttachment {
    id: string | number;
    name: string;
    url: string;
    size?: number;
    mime_type?: string;
}

export interface TicketComment {
    id: string | number;
    content: string;
    created_at: string;
    updated_at?: string;
    created_by: string | number;
    created_by_name: string;
    created_by_avatar?: string;
    attachments?: CommentAttachment[];
}

export interface CommentPage {
    data: TicketComment[];
    total: number;
    page: number;
    page_size: number;
    has_more: boolean;
}

export interface CommentPayload {
    content: string;
    attachments?: File[];
}

export interface CreateCommentInput {
    ticket_id: string | number;
    content: string;
    attachments?: File[];
}

export interface UpdateCommentInput {
    ticket_id: string | number;
    comment_id: string | number;
    content: string;
    attachments?: File[];
}

// ─── Query options factory (shared between useGetCommentsByTicketIdQuery and queryClient.fetchQuery) ──


// ─── Queries ──────────────────────────────────────────────────────────────────

export const useGetCommentsByTicketIdQuery = ({
    ticketId,
    page = 1,
    page_size = 6,
    enabled = true,
}: {
    ticketId?: string | number;
    page?: number;
    page_size?: number;
    enabled?: boolean;
}) => {
    return useQuery({
        queryKey: ["tickets", ticketId, "comments", page, page_size],
        enabled: enabled && !!ticketId,

        queryFn: async () => {
            const { data } = await api.get(
                commentsEndpoints.GET_COMMENTS_BY_TICKET_ID(ticketId!),
                {
                    params: {
                        page,
                        page_size,
                        ordering: "-created_at",
                    },
                }
            );

            return data;
        },
    });
};

// ─── Mutations ────────────────────────────────────────────────────────────────

export const useCreateCommentMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            ticket_id,
            content,
            attachments,
        }: CreateCommentInput) => {
            if (attachments && attachments.length > 0) {
                const fd = new FormData();
                fd.append("comment", content);
                attachments.forEach((file) =>
                    fd.append("attachments", file)
                );

                const { data } = await api.post(
                    commentsEndpoints.CREATE_COMMENT(ticket_id),
                    fd,
                    {
                        headers: {
                            "Content-Type": "multipart/form-data",
                        },
                    },
                );

                return (data?.data ?? data) as TicketComment;
            }

            const { data } = await api.post(
                commentsEndpoints.CREATE_COMMENT(ticket_id),
                {
                    comment: content,
                },
            );

            return (data?.data ?? data) as TicketComment;
        },

        onSuccess: (data, variables) => {
            toast.success(
                (data as any)?.message || "Comment posted successfully",
            );

            queryClient.invalidateQueries({
                queryKey: ["tickets", variables.ticket_id, "comments"],
            });
        },

        onError: toastError,
    });
};
export const useUpdateCommentMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            ticket_id,
            comment_id,
            content,
        }: UpdateCommentInput) => {
            const { data } = await api.patch(
                commentsEndpoints.UPDATE_COMMENT(ticket_id, comment_id),
                {
                    comment: content,
                },
            );

            return (data?.data ?? data) as TicketComment;
        },

        onSuccess: (data, variables) => {
            toast.success(
                (data as any)?.message || "Comment updated successfully",
            );

            queryClient.invalidateQueries({
                queryKey: ["tickets", variables.ticket_id, "comments"],
            });
        },

        onError: toastError,
    });
};
