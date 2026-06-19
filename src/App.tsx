import React, { useEffect, useMemo, Suspense, lazy } from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import { routesConfig, type RouteConfig } from "@/routes/routesConfig";
import OpenRoute from "./components/core/auth/OpenRoute";
import PrivateRoute from "./components/core/auth/PrivateRoute";
import AppLoadingScreen from "./components/common/AppLoadingScreen";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import NotFound from "@/pages/NotFound";
import KeyboardShortcuts from "@/components/common/KeyboardShortcuts";
import { setAuth } from "./store/authSlice";
import { getErrorMessage } from "./services/api";
import { useGetMyProfileQuery } from "./services/operations/authAPI";
import AnnouncementPrompt from "./components/announcements/AnnouncementPrompt";

const HomeLayout = lazy(() => import("@/layout/HomeLayout"));
const DashboardLayout = lazy(() => import("@/layout/DashboardLayout"));

const App: React.FC = () => {
  const { theme, user, token } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const { data: profileData, isLoading: isProfileLoading, isError: isProfileError, error: profileError } = useGetMyProfileQuery();

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system_default") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", prefersDark);
    } else {
      root.classList.toggle("dark", theme === "dark");
    }
  }, [theme]);

  // Update user profile when profile data is fetched
  useEffect(() => {
    if (profileData?.data && token && !user) {
      const { user: apiUser, permissions } = profileData.data;
      // Map API user to User type (similar to mapApiUserToUser in authAPI.ts)
      const mappedUser = {
        id: apiUser.id,
        displayName: apiUser.full_name,
        firstName: apiUser.first_name ?? "",
        lastName: apiUser.last_name ?? "",
        email: apiUser.email,
        phoneNumber: apiUser.phone ?? "",
        address: [apiUser.address_line1, apiUser.address_line2, apiUser.city, apiUser.state, apiUser.country, apiUser.pincode]
          .filter(Boolean)
          .join(", ") || "",
        role: apiUser.role,
        profilePicture: apiUser.avatar_url ?? null,
        isEnabled: apiUser.is_active,
        isEmailVerified: false,
        createdAt: apiUser.created_at,
        updatedAt: apiUser.updated_at,
      };
      dispatch(setAuth({ token, user: mappedUser, permissions: permissions ?? [] }));
    }
  }, [profileData, token, user, dispatch]);

  const announcementIdsKey = JSON.stringify(
    profileData?.data?.user?.announcement_ids ?? [],
  );
  const assignedAnnouncementIds = useMemo(() => {
    const ids = profileData?.data?.user?.announcement_ids;
    return Array.isArray(ids) ? ids : [];
  }, [announcementIdsKey]);

  // Show loading screen when loading profile or when there's an error fetching profile
  if (token && !user) {
    if (isProfileLoading) {
      return <AppLoadingScreen />;
    }
    if (isProfileError) {
      const errorMessage = getErrorMessage(profileError);
      return <AppLoadingScreen error={errorMessage} />;
    }
  }
  // return <AppLoadingScreen/>

  const renderRoutes = (routes: RouteConfig[]) => {
    return routes.map((route) => {
      if (route.isNeutral) {
        return (
          <Route
            key={route.path}
            path={route.path}
            element={
              typeof route.element !== "string" ? <route.element /> : null
            }
          />
        );
      }

      if (route.children) {
        return (
          <Route
            key={route.path}
            path={route.path}
            element={
              route.isPublic ? (
                <OpenRoute>
                  {typeof route.element === "string" ? (
                    route.element === "HomeLayout" ? (
                      <HomeLayout />
                    ) : (
                      <DashboardLayout />
                    )
                  ) : (
                    <route.element />
                  )}
                </OpenRoute>
              ) : (
                <PrivateRoute permissionsRequired={route.permissionsRequired || []}>
                  {typeof route.element === "string" ? (
                    route.element === "HomeLayout" ? (
                      <HomeLayout />
                    ) : (
                      <DashboardLayout />
                    )
                  ) : (
                    <route.element />
                  )}
                </PrivateRoute>
              )
            }
          >
            {renderRoutes(route.children)}
          </Route>
        );
      }

      return (
        <Route
          key={route.path}
          path={route.path}
          element={
            route.isPublic ? (
              <OpenRoute>
                {typeof route.element !== "string" ? <route.element /> : null}
              </OpenRoute>
            ) : (
              <PrivateRoute permissionsRequired={route.permissionsRequired || []}>
                {typeof route.element !== "string" ? <route.element /> : null}
              </PrivateRoute>
            )
          }
        />
      );
    });
  };

  return (
    <div className="w-full h-full min-h-dvh text-sm font-geist">
      <KeyboardShortcuts />
      {token && profileData?.data?.user ? (
        <AnnouncementPrompt
          assignedIds={assignedAnnouncementIds}
          enabled={!isProfileLoading}
        />
      ) : null}
      <Suspense fallback={<AppLoadingScreen />}>
        <Routes>
          <Route
            path="/"
            element={
              <OpenRoute>
                <Navigate to="/login" replace />
              </OpenRoute>
            }
          />
          {renderRoutes(routesConfig)}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </div>
  );
};

export default App;