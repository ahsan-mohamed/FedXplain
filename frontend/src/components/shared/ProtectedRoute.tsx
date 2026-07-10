// components/shared/ProtectedRoute.tsx
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { Role } from "@/types/api";
import { LoadingState } from "@/components/shared/States";

export function ProtectedRoute({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const { isAuthenticated, isLoading, hasRole } = useAuth();

  if (isLoading) return <LoadingState label="Checking session..." />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && !hasRole(...roles)) return <Navigate to="/portal/dashboard" replace />;

  return <>{children}</>;
}
