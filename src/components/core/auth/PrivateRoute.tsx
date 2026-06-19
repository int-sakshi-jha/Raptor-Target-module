import React from "react";
import { Navigate } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";

interface PrivateRouteProps {
  children: React.ReactNode;
  permissionsRequired?: string[];
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({
  children,
  permissionsRequired = [],
}) => {
  const { token, permissions } = useAppSelector((state) => state.auth);

  if (!token) {
    return <Navigate to="/login" replace />;
  }
  if (permissions && permissions.includes("super-admin")) {
    return <>{children}</>;
  }

  if (permissionsRequired.length > 0 && permissions) {
    const hasRequiredPermissions = permissionsRequired.every((perm) =>
      permissions.includes(perm)
    );
    if (!hasRequiredPermissions) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};

export default PrivateRoute;