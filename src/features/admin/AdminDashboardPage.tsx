import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { ArrowLeft, Shield, Users, Flag, AlertTriangle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type AdminRole, ADMIN_ROLE_LABELS } from "@/types/admin";
import AdminSection from "./AdminSection";
import SAdminSection from "./SAdminSection";
import SsAdminSection from "./SsAdminSection";
import SssAdminSection from "./SssAdminSection";

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const ctx = useOutletContext<{ adminRole: AdminRole; adminLevel: number }>();
  const role = ctx?.adminRole ?? "none";
  const level = ctx?.adminLevel ?? 0;

  const [activeTab, setActiveTab] = useState<"users" | "moderation" | "system" | "audit">("users");

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto space-y-6 bg-ov-bg text-ov-text">
      <header className="flex items-center justify-between gap-3 border-b border-ov-border pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/devices")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-ov-primary" />
              <h1 className="text-xl font-bold">Console Administrateur</h1>
            </div>
            <p className="text-xs text-ov-muted">
              Niveau d'accès : <strong className="text-ov-primary">{ADMIN_ROLE_LABELS[role]}</strong>
            </p>
          </div>
        </div>

        <Badge className="bg-ov-primary/20 text-ov-primary border-0 text-xs px-2.5 py-1 font-mono">
          Niveau {level}/100
        </Badge>
      </header>

      {/* TABS SELECTOR */}
      <div className="flex flex-wrap gap-2 p-1 rounded-xl bg-ov-surface border border-ov-border">
        <button
          onClick={() => setActiveTab("users")}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === "users" ? "bg-ov-primary text-white" : "text-ov-muted hover:text-ov-text"
          }`}
        >
          <Users className="w-3.5 h-3.5" /> Membres (10)
        </button>

        {level >= 40 && (
          <button
            onClick={() => setActiveTab("moderation")}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === "moderation" ? "bg-ov-primary text-white" : "text-ov-muted hover:text-ov-text"
            }`}
          >
            <Flag className="w-3.5 h-3.5" /> Modération (40)
          </button>
        )}

        {level >= 70 && (
          <button
            onClick={() => setActiveTab("system")}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === "system" ? "bg-ov-primary text-white" : "text-ov-muted hover:text-ov-text"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" /> Système & Règles (70)
          </button>
        )}

        {level >= 100 && (
          <button
            onClick={() => setActiveTab("audit")}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === "audit" ? "bg-ov-primary text-white" : "text-ov-muted hover:text-ov-text"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Contrôle Total (100)
          </button>
        )}
      </div>

      {/* TAB CONTENTS */}
      <div className="pt-2">
        {activeTab === "users" && <AdminSection myRole={role} />}
        {activeTab === "moderation" && level >= 40 && <SAdminSection myRole={role} />}
        {activeTab === "system" && level >= 70 && <SsAdminSection myRole={role} />}
        {activeTab === "audit" && level >= 100 && <SssAdminSection />}
      </div>
    </div>
  );
}
