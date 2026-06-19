import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import type {
    TicketComment,
    CommentPayload,
    CommentPage,
} from "@/components/core/comments/TicketCommentsPanel";

/* ─────────────────────────── toggle ────────────────────────────────────── */
// Set to false once your backend endpoint is ready.
const DUMMY_MODE = true;

/* ─────────────────────────── dummy data ────────────────────────────────── */

const DUMMY_COMMENTS: TicketComment[] = [
    {
        id: "1",
        content: `<p>Investigated the inverter fault on <strong>String 4</strong>. Found a loose DC connector at the combiner box. Tightened and re-torqued to spec — monitoring for the next 30 minutes before closing.</p>`,
        created_at: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
        created_by: "u1",
        created_by_name: "Arjun Sharma",
        attachments: [
            {
                id: "a1",
                name: "inverter_log_2024.pdf",
                url: "#",
                size: 214400,
                mime_type: "application/pdf",
            },
        ],
    },
    {
        id: "2",
        content: `<p>Escalated to the O&amp;M team. This is the <em>third occurrence</em> this month on the same string — likely a deeper wiring issue. Recommend a full insulation resistance test before next monsoon season.</p>`,
        created_at: new Date(Date.now() - 1000 * 60 * 47).toISOString(),
        created_by: "u2",
        created_by_name: "Priya Nair",
    },
    {
        id: "3",
        content: `<p>Checked the SCADA dashboard — generation dropped by <strong>12%</strong> at 09:42 IST. DC voltage looks nominal but AC output is fluctuating. Could be a grid sync issue or a faulty relay on the feeder.</p>`,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
        created_by: "u3",
        created_by_name: "Rohan Mehta",
        created_by_avatar: undefined,
        attachments: [
            {
                id: "a2",
                name: "scada_screenshot.png",
                url: "#",
                size: 98304,
                mime_type: "image/png",
            },
            {
                id: "a3",
                name: "feeder_relay_spec.docx",
                url: "#",
                size: 51200,
                mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            },
        ],
    },
    {
        id: "4",
        content: `<p>Ticket auto-assigned to <strong>Arjun Sharma</strong> per plant SLA rules. Priority bumped to <em>High</em> after 2-hour SLA breach. Please acknowledge within 30 minutes.</p>`,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
        created_by: "system",
        created_by_name: "System",
    },
    {
        id: "5",
        content: `<p>Initial triage complete. Fault code <code>E-047</code> indicates an over-temperature condition on the DC bus. Ambient temp was 43°C at time of fault — within expected range but close to threshold. Suspecting partial shading from new construction on the west boundary.</p>`,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
        created_by: "u4",
        created_by_name: "Sunita Verma",
    },
    {
        id: "6",
        content: `<p>Ticket created by plant operator. Fault first observed during morning inspection at <strong>06:15 IST</strong>. Plant output is at 34% of rated capacity. String 4 completely offline.</p>`,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(),
        created_by: "u5",
        created_by_name: "Deepak Pillai",
    },
    // page 2 — only visible after "Load older"
    {
        id: "7",
        content: `<p>Previous maintenance visit on this string was 6 weeks ago — all connectors checked and passed. Suspecting thermal cycling damage given the recent heat wave.</p>`,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
        created_by: "u2",
        created_by_name: "Priya Nair",
    },
    {
        id: "8",
        content: `<p>String 4 had a similar issue 3 months ago — resolved by cleaning the junction box ventilation slots. Keeping that in mind for this inspection.</p>`,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
        created_by: "u3",
        created_by_name: "Rohan Mehta",
    },
];

const PAGE_SIZE = 6; // show 6 on first load, "Load older" reveals remaining 2

/* ─────────────────────────── dummy helpers ─────────────────────────────── */

function getDummyPage(page: number): CommentPage {
    const start = (page - 1) * PAGE_SIZE;
    const slice = DUMMY_COMMENTS.slice(start, start + PAGE_SIZE);
    return {
        data: slice,
        total: DUMMY_COMMENTS.length,
        page,
        page_size: PAGE_SIZE,
        has_more: start + PAGE_SIZE < DUMMY_COMMENTS.length,
    };
}

/* ─────────────────────────── api helpers ───────────────────────────────── */
// Swap `import api from "@/services/api"` for your actual axios instance.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let api: any;
if (!DUMMY_MODE) {
    // Dynamic require so the import doesn't break when DUMMY_MODE is true
    // and the real API module isn't wired yet.
    // Replace with: import api from "@/services/api";  at the top once ready.
    api = require("@/services/api").default;
}

async function fetchCommentPage(
    ticketId: string | number,
    page: number,
    pageSize: number,
): Promise<CommentPage> {
    if (DUMMY_MODE) {
        await new Promise((r) => setTimeout(r, 500)); // simulate network delay
        return getDummyPage(page);
    }
    const { data } = await api.get(`/tickets/${ticketId}/comments/`, {
        params: { page, page_size: pageSize, ordering: "-created_at" },
    });
    const items: TicketComment[] = data.results ?? data.data ?? [];
    const total: number          = data.count   ?? data.total ?? items.length;
    const has_more: boolean      = data.next != null || page * pageSize < total;
    return { data: items, total, page, page_size: pageSize, has_more };
}

async function postComment(
    ticketId: string | number,
    payload: CommentPayload,
): Promise<TicketComment> {
    if (DUMMY_MODE) {
        await new Promise((r) => setTimeout(r, 600)); // simulate post delay
        const created: TicketComment = {
            id: `dummy-${Date.now()}`,
            content: payload.content,
            created_at: new Date().toISOString(),
            created_by: "me",
            created_by_name: "You",
            attachments: payload.attachments?.map((f, i) => ({
                id: `new-att-${i}`,
                name: f.name,
                url: URL.createObjectURL(f),
                size: f.size,
                mime_type: f.type,
            })),
        };
        return created;
    }

    if (payload.attachments && payload.attachments.length > 0) {
        const fd = new FormData();
        fd.append("content", payload.content);
        payload.attachments.forEach((f) => fd.append("attachments", f));
        const { data } = await api.post(`/tickets/${ticketId}/comments/`, fd, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return data.data ?? data;
    }

    const { data } = await api.post(`/tickets/${ticketId}/comments/`, {
        content: payload.content,
    });
    return data.data ?? data;
}

/* ─────────────────────────── hook ──────────────────────────────────────── */

export function useTicketComments(ticketId: string | number | undefined) {
    const qc = useQueryClient();

    const [comments, setComments]               = useState<TicketComment[]>([]);
    const [total, setTotal]                     = useState(0);
    const [currentPage, setCurrentPage]         = useState(1);
    const [hasMore, setHasMore]                 = useState(false);
    const [isInitialLoading, setInitialLoading] = useState(true);
    const [isFetchingMore, setFetchingMore]     = useState(false);
    const [isCreating, setCreating]             = useState(false);

    /* ── initial fetch ── */
    const loadInitial = useCallback(async () => {
        if (!ticketId) return;
        setInitialLoading(true);
        try {
            const page = await fetchCommentPage(ticketId, 1, PAGE_SIZE);
            setComments(page.data);
            setTotal(page.total);
            setCurrentPage(1);
            setHasMore(page.has_more);
        } catch (err) {
            toast.error("Could not load comments.");
            console.error(err);
        } finally {
            setInitialLoading(false);
        }
    }, [ticketId]);

    /* ── load next page ── */
    const fetchNextPage = useCallback(async () => {
        if (!ticketId || isFetchingMore || !hasMore) return;
        setFetchingMore(true);
        try {
            const nextPage = currentPage + 1;
            const page = await fetchCommentPage(ticketId, nextPage, PAGE_SIZE);
            setComments((prev) => {
                const seen = new Set(prev.map((c) => c.id));
                return [...prev, ...page.data.filter((c) => !seen.has(c.id))];
            });
            setCurrentPage(nextPage);
            setHasMore(page.has_more);
            setTotal(page.total);
        } catch (err) {
            toast.error("Could not load older comments.");
            console.error(err);
        } finally {
            setFetchingMore(false);
        }
    }, [ticketId, currentPage, hasMore, isFetchingMore]);

    /* ── create comment ── */
    const createComment = useCallback(
        async (payload: CommentPayload): Promise<TicketComment> => {
            if (!ticketId) throw new Error("No ticketId");
            setCreating(true);
            try {
                const created = await postComment(ticketId, payload);
                setComments((prev) => {
                    const seen = new Set(prev.map((c) => c.id));
                    return seen.has(created.id) ? prev : [created, ...prev];
                });
                setTotal((t) => t + 1);
                toast.success("Comment posted.");
                if (!DUMMY_MODE) {
                    qc.invalidateQueries({ queryKey: ["ticket", String(ticketId)] });
                }
                return created;
            } catch (err) {
                toast.error("Failed to post comment. Please try again.");
                console.error(err);
                throw err;
            } finally {
                setCreating(false);
            }
        },
        [ticketId, qc],
    );

    return {
        comments,
        total,
        isInitialLoading,
        isFetchingMore,
        hasMore,
        isCreating,
        loadInitial,
        fetchNextPage,
        createComment,
    };
}