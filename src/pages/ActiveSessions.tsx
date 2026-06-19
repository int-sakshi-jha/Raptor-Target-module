import React, { useMemo } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import {
  LogOut,
  MapPin,
  Calendar,
  Smartphone,
  Monitor,
  Tablet,
  ChevronLeft,
  ShieldAlert,
} from "lucide-react";
import Button from "@/components/common/Button";
import Spinner from "@/components/common/Spinner";
import {
  useGetAllSessionsQuery,
  useLogoutSessionMutation,
  useExpireAllSessionsMutation,
  type ApiSession,
} from "@/services/operations/authAPI";
import { formateDateTime } from "@/utils/gridFormatters";

interface LocationState {
  sessions: ApiSession[];
}

const SessionDeviceIcon = ({ deviceType }: { deviceType: string }) => {
  const cls = "w-4 h-4 text-brand-600 dark:text-brand-400";
  if (deviceType === "mobile") return <Smartphone className={cls} />;
  if (deviceType === "tablet") return <Tablet className={cls} />;
  return <Monitor className={cls} />;
};

const AuthCardShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="w-full mx-auto flex flex-col max-w-[550px] card card-lg">{children}</div>
);

const ActiveSessions: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const state = location.state as LocationState | null;

  const token = searchParams.get("token") || "";
  const initialSessions = useMemo(() => state?.sessions ?? [], [state?.sessions]);

  const getAllSessionsQuery = useGetAllSessionsQuery(token);
  const fetchedSessions = getAllSessionsQuery.data?.data?.data?.sessions ?? [];
  const sessionsToShow: ApiSession[] =
    initialSessions.length > 0 ? initialSessions : fetchedSessions;

  const logoutSessionMutation = useLogoutSessionMutation();
  const expireAllSessionsMutation = useExpireAllSessionsMutation();

  const loggingOutSessionIds = logoutSessionMutation.variables?.sessionIds ?? [];

  const backToLogin = () => navigate("/login");

  if (!token) {
    return (
      <AuthCardShell>
        <h1 className="text-xl lg:text-2xl font-bold text-neutral-900 dark:text-neutral-dark-950 mb-2">
          No active sessions
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-dark-700 mb-6">
          You were redirected here without session data. Please log in again.
        </p>
        <Button className="w-full" onClick={backToLogin}>
          Back to Login
        </Button>
      </AuthCardShell>
    );
  }

  if (initialSessions.length === 0 && getAllSessionsQuery.isLoading) {
    return (
      <AuthCardShell>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-neutral-900 dark:text-neutral-dark-950 mb-2">
              Maximum login limit reached
            </h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-dark-700">
              Fetching your active sessions…
            </p>
          </div>
          <span className="badge-brand shrink-0">Sessions</span>
        </div>
        <div className="divider" />
        <div className="flex items-center justify-center py-10">
          <Spinner />
        </div>
      </AuthCardShell>
    );
  }

  if (!sessionsToShow.length) {
    return (
      <AuthCardShell>
        <h1 className="text-xl lg:text-2xl font-bold text-neutral-900 dark:text-neutral-dark-950 mb-2">
          No active sessions
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-dark-700 mb-6">
          We couldn&apos;t find any active sessions for this token. Please log in again.
        </p>
        <Button className="w-full" onClick={backToLogin}>
          Back to Login
        </Button>
      </AuthCardShell>
    );
  }

  const handleLogoutSession = (sessionId: string) => {
    logoutSessionMutation.mutate({
      temporaryToken: token,
      sessionIds: [sessionId],
      clearAllSessions: false,
    });
  };

  const handleExpireAll = () => {
    expireAllSessionsMutation.mutate({ temporaryToken: token });
  };

  return (
    <AuthCardShell>
      <button
        type="button"
        onClick={backToLogin}
        className="flex items-center gap-1 text-base text-brand-600 hover:text-brand-700 hover:underline font-medium self-start"
      >
        <ChevronLeft className="w-5 h-5" />
        Back to login
      </button>

      <div className="mt-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-neutral-900 dark:text-neutral-dark-950 mb-2">
            Maximum login limit reached
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-dark-700">
            Log out one session below or expire all to sign in on this device.
          </p>
        </div>
        <span className="badge-brand shrink-0">Sessions</span>
      </div>

      <div className="mt-4 flex items-start gap-2.5 rounded-xs border border-brand-200 bg-brand-50/80 px-3 py-2.5 dark:border-brand-400/30 dark:bg-brand-400/10">
        <ShieldAlert className="w-4 h-4 shrink-0 text-brand-600 dark:text-brand-400 mt-0.5" />
        <p className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-dark-700 leading-snug">
          Your account has reached the maximum number of active logins. End a session
          to continue signing in.
        </p>
      </div>

      <div className="divider" />

      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-dark-900">
          Active sessions ({sessionsToShow.length})
        </p>
        <Button
          variant="danger"
          size="sm"
          onClick={handleExpireAll}
          loading={expireAllSessionsMutation.isPending}
          disabled={logoutSessionMutation.isPending}
        >
          Expire all
        </Button>
      </div>

      <ul className="space-y-2.5 max-h-[min(42vh,300px)] sm:max-h-[min(48vh,380px)] overflow-y-auto pr-1 -mr-1">
        {sessionsToShow.map((session) => (
          <li
            key={session.session_id}
            className="rounded-xs border border-neutral-200 dark:border-neutral-dark-200 bg-white dark:bg-neutral-dark-100 p-3 sm:p-4 shadow-sm"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="p-2 rounded-xs bg-neutral-100 dark:bg-neutral-dark-200 shrink-0">
                  <SessionDeviceIcon deviceType={session.device_type} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-dark-950 truncate">
                    {session.browser} {session.version || ""} · {session.os}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-dark-600 capitalize mt-0.5">
                    {session.device_type}
                  </p>
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-neutral-500 dark:text-neutral-dark-600 flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{session.ip_address || "—"}</span>
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-dark-600 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 shrink-0" />
                      {formateDateTime(session.created_at)}
                    </p>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleLogoutSession(session.session_id)}
                loading={loggingOutSessionIds.includes(session.session_id)}
                disabled={
                  logoutSessionMutation.isPending || expireAllSessionsMutation.isPending
                }
                className="shrink-0 w-full sm:w-auto justify-center"
              >
                <LogOut className="w-3.5 h-3.5 mr-1.5" />
                Log out
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-5 pt-4 border-t border-neutral-200 dark:border-neutral-dark-200 text-center text-sm text-neutral-600 dark:text-neutral-dark-700">
        After logging out a session, return to login and try again.
      </p>
    </AuthCardShell>
  );
};

export default ActiveSessions;
