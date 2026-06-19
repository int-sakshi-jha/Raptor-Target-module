import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { api, getErrorMessage } from "../api";
import { authEndpoints } from "../endpoints";
import { useAppDispatch } from "@/store/hooks";
import { store } from "@/store";
import { runPostLoginFcmRegistration } from "@/firebase/fcmRegistration";
import { resetFcmRegistrationDedupe } from "@/services/operations/fcmAPI";
import { clearAuth, setAuth } from "@/store/authSlice";
import type { User } from "@/store/authSlice";

// --- Types ---

export interface SendOtpCheckResponse {
  success?: boolean;
  otpScreen?: boolean;
  passwordScreen?: boolean;
  message?: string;
}

export interface SendOtpSendWrapped {
  success: boolean;
  code: number;
  data: {
    otpScreen: boolean;
    passwordScreen: boolean;
    message: string;
  };
}

export type SendOtpResponse = SendOtpCheckResponse | SendOtpSendWrapped;

export interface SendOtpPayload {
  identifier: string;
  /**
   * When true: backend only returns which screens are enabled (otp/password/both),
   * without actually sending an OTP email.
   * When false/omitted: backend sends the OTP and returns wrapped response.
   */
  check?: boolean;
}

export interface ApiSession {
  os: string;
  device: string;
  browser: string;
  version: string;
  created_at: string;
  expires_at: string;
  ip_address: string;
  session_id: string;
  user_agent: string;
  device_type: "mobile" | "tablet" | "web" | "desktop";
}

/** API user shape (success response) */
export interface ApiUser {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone?: string | null;
  dob?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  role: string;
  avatar_url?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  sessions?: ApiSession[];
  epc_id?: string | null;
  plant_ids?: string[];
  announcement_ids?: string[];
  settings?: {
    language?: string;
    timezone?: string;
    date_format?: string;
    time_format?: string;
    theme?: any;
    push_notifications?: boolean;
  };
}

/** Wrapped success response: { success, code, data: { data: user, token, permissions, message } } */
export interface VerifyOtpSuccessWrapped {
  success: true;
  code: number;
  data: {
    user: ApiUser;
    token: string;
    permissions: string[];
    message: string;
  };
}

/** Max sessions response: { data: { sessions, token }, message } */
export interface VerifyOtpMaxSessionsResponse {
  data: {
    sessions: ApiSession[];
    token: string;
  };
  message: string;
}

/** Wrapped get-all-sessions success response */
export interface GetAllSessionsWrapped {
  success: true;
  code: number;
  data: {
    data: {
      sessions: ApiSession[];
    };
    message: string;
  };
}

/** Get my profile response */
export interface GetMyProfileResponse {
  success: boolean;
  code: number;
  data: {
    user: ApiUser;
    permissions: string[];
    message: string;
  };
}

export type VerifyOtpRawResponse =
  | VerifyOtpSuccessWrapped
  | VerifyOtpMaxSessionsResponse;

export function isMaxSessionsResponse(
  res: VerifyOtpRawResponse
): res is VerifyOtpMaxSessionsResponse {
  const d = (res as VerifyOtpMaxSessionsResponse).data;
  return Boolean(d && Array.isArray(d.sessions) && typeof d.token === "string");
}

function mapApiUserToUser(api: ApiUser): User {
  return {
    id: api.id,
    displayName: api.full_name || [api.first_name, api.last_name].filter(Boolean).join(" ") || api.email,
    firstName: api.first_name ?? "",
    lastName: api.last_name ?? "",
    email: api.email,
    phoneNumber: api.phone ?? "",
    address: [api.address_line1, api.address_line2, api.city, api.state, api.country, api.pincode]
      .filter(Boolean)
      .join(", ") || "",
    role: api.role,
    profilePicture: api.avatar_url ?? null,
    isEnabled: api.is_active,
    isEmailVerified: false,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
    language: api.settings?.language,
    timezone: api.settings?.timezone,
    date_format: api.settings?.date_format,
    time_format: api.settings?.time_format,
    theme: api.settings?.theme,
    push_notifications: api.settings?.push_notifications,
  };
}

/** Wrapped end-sessions success response (same shape as verify-otp success) */
export type EndSessionsSuccessWrapped = VerifyOtpSuccessWrapped;

// --- Mutations ---

export const useSendOtpMutation = () => {
  return useMutation({
    mutationFn: async (payload: SendOtpPayload) => {
      const { data } = await api.post<SendOtpResponse>(
        authEndpoints.SEND_OTP,
        payload
      );
      return data;
    },
    onSuccess: (data, variables) => {
      if (variables.check) {
        return;
      }

      // Wrapped response when actually sending an OTP
      const maybeWrapped = data as SendOtpSendWrapped;
      const message =
        (maybeWrapped.data && maybeWrapped.data.message) ||
        (data as SendOtpCheckResponse).message ||
        "OTP sent to your email";

      toast.success(message);
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || "Failed to send OTP");
    },
  });
};

export const useGetAllSessionsQuery = (expireSessionToken: string) => {
  const token = expireSessionToken ? decodeURIComponent(expireSessionToken) : "";
  const tokenForPath = token ? encodeURIComponent(token) : "";

  return useQuery({
    queryKey: ["auth", "sessions", tokenForPath],
    enabled: Boolean(tokenForPath),
    queryFn: async () => {
      const { data } = await api.get<GetAllSessionsWrapped>(
        authEndpoints.GET_ALL_SESSIONS(tokenForPath),
        {
          params: { is_mobile: false },
          withCredentials: true,
        }
      );
      return data;
    },
    staleTime: 30_000,
  });
};

export const useGetMyProfileQuery = () => {
  // Get token from store to conditionally enable query
  const token = typeof window !== "undefined" ? store.getState().auth.token : null;
  
  return useQuery({
    queryKey: ["auth", "profile"],
    queryFn: async () => {
      const { data } = await api.get<GetMyProfileResponse>(
        authEndpoints.GET_MY_PROFILE
      );
      return data;
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
};

export const useVerifyOtpMutation = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async ({ identifier, otp }: { identifier: string; otp: string }) => {
      const { data } = await api.post<VerifyOtpRawResponse>(
        authEndpoints.VERIFY_OTP,
        { identifier, otp },
        { withCredentials: true }
      );
      return data;
    },
    onSuccess: (data, variables) => {
      // Max sessions: { data: { sessions, token }, message }
      if (isMaxSessionsResponse(data)) {
        toast("Maximum login limit reached. Please manage your sessions.");
        const token = encodeURIComponent(data.data.token);
        navigate(`/auth/sessions?token=${token}`, {
          state: {
            sessions: data.data.sessions,
            identifier: variables.identifier,
          },
        });
        return;
      }
      // Success: { success, code, data: { data: user, token, permissions, message } }
      const wrapped = data as VerifyOtpSuccessWrapped;
      const payload = wrapped.data;
      if (!payload?.token || !payload?.user) {
        toast.error("Invalid login response.");
        return;
      }
      const user = mapApiUserToUser(payload.user);
      dispatch(setAuth({ token: payload.token, user, permissions: payload.permissions ?? [] }));
      void runPostLoginFcmRegistration(user.id);
      toast.success(payload.message ?? "Login successful");
      navigate("/dashboard", { replace: true });
    },
    onError: (error: unknown, variables) => {
      // Backend can send "max sessions" as HTTP 429, which Axios treats as error.
      const maybeAxios = error as {
        response?: { status?: number; data?: unknown };
      };

      const status = maybeAxios.response?.status;
      const body = maybeAxios.response?.data;

      // Expected shape:
      // { data: { sessions: ApiSession[], token: string }, message: string }
      if (status === 429 && body && typeof body === "object") {
        const b = body as Partial<VerifyOtpMaxSessionsResponse>;
        const sessions = (b.data as { sessions?: unknown } | undefined)?.sessions;
        const tokenRaw = (b.data as { token?: unknown } | undefined)?.token;

        if (Array.isArray(sessions) && typeof tokenRaw === "string") {
          toast(b.message ?? "Too many active sessions. Log out elsewhere to continue.");
          const token = encodeURIComponent(tokenRaw);
          navigate(`/sessions?token=${token}`, {
            state: {
              sessions: sessions as ApiSession[],
              identifier: variables.identifier,
            },
          });
          return;
        }
      }

      toast.error(getErrorMessage(error) || "Invalid OTP");
    },
  });
};

// --- Password login (email + password) ---

export interface LoginPayload {
  identifier: string;
  password: string;
  is_mobile?: boolean;
}

export type LoginRawResponse = VerifyOtpRawResponse;

export const usePasswordLoginMutation = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const { data } = await api.post<LoginRawResponse>(
        authEndpoints.LOGIN,
        payload,
        { withCredentials: true }
      );
      return data;
    },
    onSuccess: (data, variables) => {
      // Max sessions flow (HTTP 200 with wrapped structure)
      if (isMaxSessionsResponse(data)) {
        toast("Maximum login limit reached. Please manage your sessions.");
        const token = encodeURIComponent(data.data.token);
        navigate(`/sessions?token=${token}`, {
          state: {
            sessions: data.data.sessions,
            identifier: variables.identifier,
          },
        });
        return;
      }

      const wrapped = data as VerifyOtpSuccessWrapped;
      const payload = wrapped.data;
      if (!payload?.token || !payload?.user) {
        toast.error("Invalid login response.");
        return;
      }
      const user = mapApiUserToUser(payload.user);
      dispatch(
        setAuth({
          token: payload.token,
          user,
          permissions: payload.permissions ?? [],
        })
      );
      void runPostLoginFcmRegistration(user.id);
      toast.success(payload.message ?? "Login successful");
      navigate("/dashboard", { replace: true });
    },
    onError: (error: unknown, variables) => {
      const maybeAxios = error as {
        response?: { status?: number; data?: unknown };
      };

      const status = maybeAxios.response?.status;
      const body = maybeAxios.response?.data;

      // Too many active sessions: HTTP 429 with same shape as OTP max sessions
      if (status === 429 && body && typeof body === "object") {
        const b = body as Partial<VerifyOtpMaxSessionsResponse>;
        const sessions = (b.data as { sessions?: unknown } | undefined)
          ?.sessions;
        const tokenRaw = (b.data as { token?: unknown } | undefined)?.token;

        if (Array.isArray(sessions) && typeof tokenRaw === "string") {
          toast(
            b.message ??
              "Too many active sessions. Log out elsewhere to continue."
          );
          const token = encodeURIComponent(tokenRaw);
          navigate(`/sessions?token=${token}`, {
            state: {
              sessions: sessions as ApiSession[],
              identifier: variables.identifier,
            },
          });
          return;
        }
      }

      toast.error(getErrorMessage(error) || "Invalid credentials");
    },
  });
};

// --- Forgot / Reset password ---

export interface ForgotPasswordResponse {
  success: boolean;
  code: number;
  data: {
    message: string;
  };
}

export const useForgotPasswordMutation = () => {
  return useMutation({
    mutationFn: async (identifier: string) => {
      const { data } = await api.post<ForgotPasswordResponse>(
        authEndpoints.FORGOT_PASSWORD,
        { identifier }
      );
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.data?.message ?? "Password reset OTP sent.");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || "Failed to send reset OTP");
    },
  });
};

export interface VerifyResetPasswordOtpPayload {
  identifier: string;
  otp: string;
}

export interface VerifyResetPasswordOtpResponse {
  success: boolean;
  code: number;
  data: {
    message?: string;
  };
}

export const useVerifyResetPasswordOtpMutation = () => {
  return useMutation({
    mutationFn: async (payload: VerifyResetPasswordOtpPayload) => {
      const { data } = await api.post<VerifyResetPasswordOtpResponse>(
        authEndpoints.VERIFY_RESET_PASSWORD_OTP,
        payload
      );
      return data;
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || "Invalid OTP");
    },
  });
};

export interface ResetPasswordPayload {
  identifier: string;
  otp: string;
  password: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  code: number;
  data: {
    message: string;
  };
}

export const useResetPasswordMutation = () => {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (payload: ResetPasswordPayload) => {
      const { data } = await api.post<ResetPasswordResponse>(
        authEndpoints.RESET_PASSWORD,
        payload
      );
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.data?.message ?? "Password reset successfully");
      navigate("/login", { replace: true });
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || "Failed to reset password");
    },
  });
};

export const useLogoutMutation = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async () => {
      // Auth header is auto-attached by axios interceptor via store token.
      const { data } = await api.get<{ success: boolean; code: number; data?: unknown }>(
        authEndpoints.LOGOUT,
        { withCredentials: true }
      );
      return data;
    },
    onSettled: () => {
      resetFcmRegistrationDedupe();
      dispatch(clearAuth());
      navigate("/login", { replace: true });
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || "Logout failed");
    },
  });
};

export const useLogoutSessionMutation = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async ({
      temporaryToken,
      sessionIds,
      clearAllSessions,
    }: {
      temporaryToken: string;
      sessionIds: string[];
      clearAllSessions: boolean;
    }) => {
      const { data } = await api.put<EndSessionsSuccessWrapped>(
        authEndpoints.EXPIRE_SESSIONS(temporaryToken),
        {
          clear_all_sessions: clearAllSessions,
          session_ids: sessionIds,
        },
        {
          withCredentials: true,
        }
      );
      return data;
    },
    onSuccess: (data) => {
      const payload = data.data;
      if (!payload?.token || !payload?.user) {
        toast.success("Session updated");
        return;
      }
      const user = mapApiUserToUser(payload.user);
      dispatch(setAuth({ token: payload.token, user, permissions: payload.permissions ?? [] }));
      void runPostLoginFcmRegistration(user.id);
      toast.success(payload.message ?? "Session updated");
      navigate("/dashboard", { replace: true });
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || "Failed to logout session");
    },
  });
};

export const useExpireAllSessionsMutation = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async ({
      temporaryToken
    }: {
      temporaryToken: string;
    }) => {
      const { data } = await api.put<EndSessionsSuccessWrapped>(
        authEndpoints.EXPIRE_SESSIONS(temporaryToken),
        {
          clear_all_sessions: true
        },
        {
          withCredentials: true,
        }
      );
      return data;
    },
    onSuccess: (data) => {
      const payload = data.data;
      if (!payload?.token || !payload?.user) {
        toast.success("All sessions expired.");
        navigate("/login", { replace: true });
        return;
      }
      const user = mapApiUserToUser(payload.user);
      dispatch(setAuth({ token: payload.token, user, permissions: payload.permissions ?? [] }));
      void runPostLoginFcmRegistration(user.id);
      toast.success(payload.message ?? "Sessions updated");
      navigate("/dashboard", { replace: true });
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || "Failed to expire all sessions");
    },
  });
};
