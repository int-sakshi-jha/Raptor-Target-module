/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../api";
import { toastError } from "@/utils/errorFormatter";
import { profileEndpoints } from "../endpoints";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ProfileSession {
    session_id: string;
    os: string;
    device: string;
    browser: string;
    version?: string;
    ip_address: string;
    device_type: "mobile" | "tablet" | "web" | "desktop" | string;
    user_agent?: string;
    created_at: string;
    expires_at: string;
    is_current?: boolean;
}

/**
 * Matches the actual GET /user/me/api-key response:
 * { data: { api_key: string, api_key_created_at: string, message: string } }
 */
export interface ApiKey {
    api_key: string;
    api_key_created_at: string;
}

/** When the profile API includes plant details, chips use these names; otherwise `plant_ids` is used. */
export type ProfilePlantSummary = {
    id: string;
    plant_name?: string | null;
    display_name?: string | null;
    name?: string | null;
};

export interface UserDetailProfile {
    id: string;
    first_name: string;
    last_name: string;
    username?: string | null;
    full_name: string;
    email: string;
    phone?: string | null;
    avatar_url?: string | null;
    role: string;
    is_active: boolean;
    tenant_id?: string | null;
    plant_ids?: string[];
    plants?: ProfilePlantSummary[];
    permissions?: string[];
    enable_api_access?: boolean;
    web_max_login_number?: number | null;
    app_max_login_number?: number | null;
    web_login_enabled?: boolean;
    app_login_enabled?: boolean;
    language?: string | null;
    timezone?: string | null;
    date_format?: string | null;
    time_format?: string | null;
    theme?: string | null;
    push_notifications?: boolean;
    notification_preferences?: Record<string, unknown> | null;
    is_password_login_enable?: boolean;
    is_otp_login_enable?: boolean;
    created_at?: string;
    updated_at?: string;
}


const normalizeNullableText = (value: unknown): string | null => {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    return text === "" ? null : text;
};

const toComparableProfilePatch = (patch: Partial<UserDetailProfile>): Partial<UserDetailProfile> => {
    const next: Partial<UserDetailProfile> = { ...patch };
    if ("first_name" in next) next.first_name = normalizeNullableText(next.first_name) ?? "";
    if ("last_name" in next) next.last_name = normalizeNullableText(next.last_name) ?? "";
    if ("username" in next) next.username = normalizeNullableText(next.username);
    if ("phone" in next) next.phone = normalizeNullableText(next.phone);
    return next;
};

function patchUserInProfileResponse(cached: unknown, patch: Partial<UserDetailProfile>): unknown {
    if (!cached || typeof cached !== "object") return cached;

    const root = cached as Record<string, any>;

    const flattenUser = (u: any) => {
        if (u && u.settings) {
            return { ...u, ...u.settings };
        }
        return u;
    };

    if (root?.data?.user) {
        const nextUser = flattenUser({ ...root.data.user, ...patch });
        if (patch.first_name !== undefined || patch.last_name !== undefined) {
            const fullName = [nextUser.first_name, nextUser.last_name].filter(Boolean).join(" ").trim();
            if (fullName) nextUser.full_name = fullName;
        }
        return {
            ...root,
            data: {
                ...root.data,
                user: nextUser,
            },
        };
    }

    if (root?.data?.data?.user) {
        const nextUser = flattenUser({ ...root.data.data.user, ...patch });
        if (patch.first_name !== undefined || patch.last_name !== undefined) {
            const fullName = [nextUser.first_name, nextUser.last_name].filter(Boolean).join(" ").trim();
            if (fullName) nextUser.full_name = fullName;
        }
        return {
            ...root,
            data: {
                ...root.data,
                data: {
                    ...root.data.data,
                    user: nextUser,
                },
            },
        };
    }

    if (root?.user) {
        const nextUser = flattenUser({ ...root.user, ...patch });
        if (patch.first_name !== undefined || patch.last_name !== undefined) {
            const fullName = [nextUser.first_name, nextUser.last_name].filter(Boolean).join(" ").trim();
            if (fullName) nextUser.full_name = fullName;
        }
        return {
            ...root,
            user: nextUser,
        };
    }

    return cached;
}

export const avatarUploadCapability = {
    enabled: true,
    acceptedFileTypes: "image/*",
    maxFileSizeMb: 5,
} as const;

/** Context — "me" or any user id string */
type Ctx = "me" | string;

// ─────────────────────────────────────────────────────────────────────────────
// Profile Queries
// ─────────────────────────────────────────────────────────────────────────────

/** Fetch the logged-in user's own profile. Pass enabled=false to skip. */
export const useGetMyDetailProfileQuery = (enabled = true) =>
    useQuery({
        queryKey: ["profile", "me"],
        enabled,
        staleTime: 60_000,
        queryFn: async () => {
            const { data } = await api.get<any>(profileEndpoints.GET_MY_PROFILE);
            if (data?.data?.user?.settings) {
                data.data.user = { ...data.data.user, ...data.data.user.settings };
            }
            return data as any;
        },
    });

/** Fetch another user's profile by ID. Disabled when id is null/undefined. */
export const useGetUserDetailProfileQuery = (id: string | null | undefined) =>
    useQuery({
        queryKey: ["profile", "user", id],
        enabled: !!id,
        staleTime: 60_000,
        queryFn: async () => {
            const { data } = await api.get<any>(profileEndpoints.GET_USER_PROFILE(id!));
            if (data?.data?.user?.settings) {
                data.data.user = { ...data.data.user, ...data.data.user.settings };
            }
            return data as any;
        },
    });

// ─────────────────────────────────────────────────────────────────────────────
// Profile Update Mutations
// ─────────────────────────────────────────────────────────────────────────────

export const useUpdateMyProfileMutation = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (payload: Partial<UserDetailProfile>) => {
            const { data } = await api.put<any>(profileEndpoints.UPDATE_MY_PROFILE, payload);
            return data;
        },
        onSuccess: (data, variables) => {
            toast.success((data as any)?.message ?? "Profile updated");
            const normalizedPatch = toComparableProfilePatch(variables);
            qc.setQueryData(["profile", "me"], (cached: unknown) =>
                patchUserInProfileResponse(cached, normalizedPatch),
            );
            qc.setQueryData(["auth", "profile"], (cached: unknown) =>
                patchUserInProfileResponse(cached, normalizedPatch),
            );
            // Refetch active queries after optimistic patch so UI always reflects backend truth.
            void qc.invalidateQueries({ queryKey: ["profile", "me"] });
            void qc.invalidateQueries({ queryKey: ["auth", "profile"] });
        },
        onError: toastError,
    });
};

export const useChangeMyEmailMutation = () => {
    return useMutation({
        mutationFn: async (payload: { email: string }) => {
            const { data } = await api.post<any>(profileEndpoints.CHANGE_MY_EMAIL, payload);
            return data;
        },
        onSuccess: (data) => {
            toast.success((data as any)?.message ?? (data as any)?.data?.message ?? "OTP sent successfully");
        },
        onError: toastError,
    });
};

export const useChangeMyPasswordMutation = () => {
    return useMutation({
        mutationFn: async (payload: { currentPassword: string; newPassword: string }) => {
            const { data } = await api.put<any>(profileEndpoints.CHANGE_MY_PASSWORD, payload);
            return data;
        },
        onSuccess: (data) => {
            toast.success((data as any)?.message ?? (data as any)?.data?.message ?? "Password changed successfully");
        },
        onError: toastError,
    });
};

export const useVerifyMyNewEmailMutation = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (payload: { email: string; otp: string }) => {
            const { data } = await api.post<any>(profileEndpoints.VERIFY_MY_NEW_EMAIL, payload);
            return data;
        },
        onSuccess: (data) => {
            toast.success((data as any)?.message ?? (data as any)?.data?.message ?? "Email changed successfully");
            void qc.invalidateQueries({ queryKey: ["profile", "me"] });
            void qc.invalidateQueries({ queryKey: ["auth", "profile"] });
        },
        onError: toastError,
    });
};

export const useChangeMyPhoneMutation = () => {
    return useMutation({
        mutationFn: async (payload: { phone: string }) => {
            const { data } = await api.post<any>(profileEndpoints.CHANGE_MY_PHONE, payload);
            return data;
        },
        onSuccess: (data) => {
            toast.success((data as any)?.message ?? (data as any)?.data?.message ?? "OTP sent successfully");
        },
        onError: toastError,
    });
};

export const useVerifyMyNewPhoneMutation = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (payload: { phone: string; otp: string }) => {
            const { data } = await api.post<any>(profileEndpoints.VERIFY_MY_NEW_PHONE, payload);
            return data;
        },
        onSuccess: (data) => {
            toast.success((data as any)?.message ?? (data as any)?.data?.message ?? "Phone changed successfully");
            void qc.invalidateQueries({ queryKey: ["profile", "me"] });
            void qc.invalidateQueries({ queryKey: ["auth", "profile"] });
        },
        onError: toastError,
    });
};

export const useUpdateUserProfileMutation = (id: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (payload: Partial<UserDetailProfile>) => {
            const { data } = await api.put<any>(profileEndpoints.UPDATE_USER_PROFILE(id), payload);
            return data;
        },
        onSuccess: (data) => {
            toast.success((data as any)?.message ?? "Profile updated");
            void qc.invalidateQueries({ queryKey: ["profile", "user", id] });
            void qc.invalidateQueries({ queryKey: ["users", "list"] });
        },
        onError: toastError,
    });
};

/** Upload avatar image (multipart/form-data) */
export const useUploadAvatarMutation = (ctx: Ctx) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (file: File) => {
            const form = new FormData();
            form.append("avatar", file);
            const target = ctx === "me" ? "your profile" : "this user";
            throw new Error(`Avatar updates are not available for ${target} yet.`);
        },
        onSuccess: (data) => {
            toast.success((data as any)?.message ?? "Avatar updated");
            if (ctx === "me") {
                void qc.invalidateQueries({ queryKey: ["profile", "me"] });
            } else {
                void qc.invalidateQueries({ queryKey: ["profile", "user", ctx] });
            }
        },
        onError: toastError,
    });
};

// ─────────────────────────────────────────────────────────────────────────────
// Sessions Queries & Mutations
// ─────────────────────────────────────────────────────────────────────────────

export const useGetSessionsQuery = (ctx: Ctx) =>
    useQuery({
        queryKey: ["profile", "sessions", ctx],
        staleTime: 30_000,
        queryFn: async () => {
            const url = ctx === "me" ? profileEndpoints.MY_SESSIONS : profileEndpoints.USER_SESSIONS(ctx);
            const { data } = await api.get<any>(url);
            return data as any;
        },
    });

/**
 * Terminate one specific session.
 * Body: { session_ids: [session_id] }  (always an array, even for a single ID)
 */
export const useTerminateSessionMutation = (ctx: Ctx) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (session_id: string) => {
            const url = ctx === "me" ? profileEndpoints.TERMINATE_MY_SESSION : profileEndpoints.TERMINATE_USER_SESSION(ctx);
            const { data } = await api.put<any>(url, { session_ids: [session_id] });
            return data;
        },
        onSuccess: (data) => {
            toast.success((data as any)?.message ?? "Session terminated");
            void qc.invalidateQueries({ queryKey: ["profile", "sessions", ctx] });
        },
        onError: toastError,
    });
};

/**
 * Terminate ALL sessions.
 * Body: { clear_all_sessions: true }
 * - me context  → backend keeps the current session, removes all others
 * - user context → backend removes ALL sessions for that user
 */
export const useTerminateAllSessionsMutation = (ctx: Ctx) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            const url = ctx === "me" ? profileEndpoints.TERMINATE_MY_SESSION : profileEndpoints.TERMINATE_USER_SESSION(ctx);
            const { data } = await api.put<any>(url, { clear_all_sessions: true });
            return data;
        },
        onSuccess: (data) => {
            toast.success((data as any)?.message ?? "All sessions terminated");
            void qc.invalidateQueries({ queryKey: ["profile", "sessions", ctx] });
        },
        onError: toastError,
    });
};

// ─────────────────────────────────────────────────────────────────────────────
// API Key Queries & Mutations (one key per user)
// ─────────────────────────────────────────────────────────────────────────────

/** Fetch the single API key for this context. Pass enabled=false to skip. */
export const useGetApiKeyQuery = (ctx: Ctx, enabled = true) =>
    useQuery({
        queryKey: ["profile", "api-key", ctx],
        enabled,
        staleTime: 30_000,
        queryFn: async () => {
            const url = ctx === "me" ? profileEndpoints.MY_API_KEY : profileEndpoints.USER_API_KEY(ctx);
            const { data } = await api.get<any>(url);
            return data as any;
        },
    });

export const useCreateApiKeyMutation = (ctx: Ctx) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (payload: { name: string; expires_in_days?: number | null }) => {
            const url = ctx === "me" ? profileEndpoints.MY_API_KEY : profileEndpoints.USER_API_KEY(ctx);
            const { data } = await api.post<any>(url, payload);
            return data;
        },
        onSuccess: (data) => {
            toast.success((data as any)?.message ?? "API key created");
            void qc.invalidateQueries({ queryKey: ["profile", "api-key", ctx] });
        },
        onError: toastError,
    });
};

export const useDeleteApiKeyMutation = (ctx: Ctx) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            // Single key per user — no key ID needed
            const url = ctx === "me"
                ? profileEndpoints.DELETE_MY_API_KEY
                : profileEndpoints.DELETE_USER_API_KEY(ctx);
            const { data } = await api.delete<any>(url);
            return data;
        },
        onSuccess: (data) => {
            toast.success((data as any)?.message ?? "API key deleted");
            void qc.invalidateQueries({ queryKey: ["profile", "api-key", ctx] });
        },
        onError: toastError,
    });
};
