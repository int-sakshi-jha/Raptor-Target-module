import React from "react";
import { Navigate } from "react-router-dom";
import UserDetailLayout from "@/layout/UserDetailLayout";
import ProfileTab from "./userDetail/ProfileTab";
import SessionsTab from "./userDetail/SessionsTab";
import ApiAccessTab from "./userDetail/ApiAccessTab";
import SettingsTab from "./userDetail/SettingsTab";
import NotificationsTab from "./userDetail/NotificationsTab";

// ─── /me/* ────────────────────────────────────────────────────────────────────

export const MeLayout: React.FC = () => <UserDetailLayout context="me" />;

export const MeProfilePage: React.FC = () => <ProfileTab context="me" />;
export const MeSessionsPage: React.FC = () => <SessionsTab context="me" />;
export const MeApiAccessPage: React.FC = () => <ApiAccessTab context="me" />;
export const MeSettingsPage: React.FC = () => <SettingsTab context="me" />;
export const MeNotificationsPage: React.FC = () => <NotificationsTab context="me" />;

export const MeRedirect: React.FC = () => <Navigate to="/me/profile" replace />;

// ─── /users/:id/* ─────────────────────────────────────────────────────────────

export const UserDetailLayoutWrapper: React.FC = () => <UserDetailLayout context="user" />;

export const UserProfileTabPage: React.FC = () => <ProfileTab context="user" />;
export const UserSessionsTabPage: React.FC = () => <SessionsTab context="user" />;
export const UserApiAccessTabPage: React.FC = () => <ApiAccessTab context="user" />;
export const UserSettingsTabPage: React.FC = () => <SettingsTab context="user" />;
export const UserNotificationsTabPage: React.FC = () => <NotificationsTab context="user" />;
