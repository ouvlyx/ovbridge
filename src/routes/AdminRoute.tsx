import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/features/auth";
import { fetchUserAdminRole } from "@/lib/admin";
import { ADMIN_ROLE_LEVELS, type AdminRole } from "@/types/admin";
import { ShieldAlert } from "lucide-react";

export default function AdminRoute({ minLevel = 10 }: { minLevel?: number }) {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<AdminRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading((prev) => (prev ? false : prev));
      return;
    }
    let active = true;
    fetchUserAdminRole(user.id).then((r) => {
      if (active) {
        setRole(r);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-ov-muted text-sm bg-ov-bg">
        Vérification des accès administrateur…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const level = role ? ADMIN_ROLE_LEVELS[role] : 0;

  if (level < minLevel) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-ov-bg text-center">
        <div className="max-w-md space-y-4 p-6 rounded-2xl bg-ov-surface border border-ov-border">
          <ShieldAlert className="w-12 h-12 text-ov-danger mx-auto" />
          <h2 className="text-xl font-bold text-ov-text">Accès Administrateur Refusé</h2>
          <p className="text-sm text-ov-muted">
            Vous ne possédez pas les autorisations requises pour accéder à cette section (Niveau requis : {minLevel}/100, Votre niveau : {level}/100).
          </p>
          <a
            href="/devices"
            className="inline-block px-4 py-2 text-sm font-medium bg-ov-primary text-white rounded-xl hover:bg-ov-primaryHover"
          >
            Retour à mes appareils
          </a>
        </div>
      </div>
    );
  }

  return <Outlet context={{ adminRole: role, adminLevel: level }} />;
}
