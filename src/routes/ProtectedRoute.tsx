import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/features/auth";

export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-ov-muted">
        Chargement…
      </div>
    );
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
