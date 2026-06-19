import React from "react";
import { Navigate } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";

interface OpenRouteProps {
  children: React.ReactNode;
}

const OpenRoute: React.FC<OpenRouteProps> = ({ children }) => {
  const { token } = useAppSelector((state) => state.auth);

  if (token) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

export default OpenRoute;