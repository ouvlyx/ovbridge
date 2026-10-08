import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Laptop,
  MessageSquare,
  HardDrive,
  Clipboard,
  User,
  Shield,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/features/auth";
import { fetchUserAdminRole } from "@/lib/admin";
import type { AdminRole } from "@/types/admin";
import { cn } from "@/lib/utils";

export default function DesktopSidebar() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [role, setRole] = useState<AdminRole>("none");

  useEffect(() => {
    if (user) {
      fetchUserAdminRole(user.id).then(setRole);
    }
  }, [user]);

  const navItems = [
    { label: "Appareils", path: "/devices", icon: Laptop },
    { label: "Messages & Transferts", path: "/messages", icon: MessageSquare },
    { label: "Mon espace", path: "/workspace", icon: HardDrive },
    { label: "Presse-papiers", path: "/clipboard", icon: Clipboard },
    { label: "Mon profil", path: "/profile", icon: User },
  ];

  if (role !== "none") {
    navItems.push({ label: "Console Admin", path: "/admin", icon: Shield });
  }

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-ov-border bg-ov-surface shrink-0 h-screen sticky top-0 p-4 space-y-6">
      <div className="flex items-center gap-3 px-2">
        <img src="/brandmark-transparent.png" alt="" className="h-8 w-auto shrink-0" />
        <div>
          <h1 className="text-xl font-bold text-ov-primary">OvBridge</h1>
          <p className="text-[10px] text-ov-muted">Pont Chiffré Multi-Appareils</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                active
                  ? "bg-ov-primary text-white shadow-md shadow-ov-primary/20"
                  : "text-ov-muted hover:text-ov-text hover:bg-ov-bg"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {user && (
        <div className="border-t border-ov-border pt-4 space-y-3">
          <div className="px-2">
            <p className="text-xs font-semibold truncate text-ov-text">{user.email}</p>
            <p className="text-[10px] text-ov-muted">
              {role !== "none" ? `Role: ${role.toUpperCase()}` : "Compte vérifié"}
            </p>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-ov-danger hover:bg-ov-danger/10 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" /> Déconnexion
          </button>
        </div>
      )}
    </aside>
  );
}
