import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Laptop, Home, ArrowLeft, ShieldAlert, KeyRound, RefreshCw } from "lucide-react";

export default function NotFoundPage() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-ov-bg text-ov-text">
      <Card className="w-full max-w-lg p-6 sm:p-8 bg-ov-surface border-ov-border text-center space-y-6 shadow-2xl relative overflow-hidden">
        {/* Cercles de fond stylisés */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-ov-primary/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-ov-accent/10 rounded-full blur-2xl pointer-events-none" />

        {/* Icone 404 OvBridge */}
        <div className="mx-auto w-20 h-20 rounded-3xl bg-ov-primary/10 border border-ov-primary/30 flex items-center justify-center text-ov-primary relative">
          <img
            src="/brandmark-transparent.png"
            alt="OvBridge"
            className="w-10 h-10 object-contain"
          />
          <span className="absolute -bottom-2 -right-2 bg-ov-danger text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow">
            404
          </span>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-ov-primary tracking-tight">
            Page Introuvable
          </h1>
          <p className="text-sm text-ov-muted max-w-md mx-auto">
            La destination demandée{" "}
            <code className="text-xs bg-ov-bg px-2 py-1 rounded text-ov-accent font-mono border border-ov-border">
              {location.pathname}
            </code>{" "}
            n'existe pas ou a été déplacée.
          </p>
        </div>

        {/* Informations complémentaires d'aide */}
        <div className="p-4 rounded-xl bg-ov-bg/70 border border-ov-border text-left text-xs space-y-2">
          <p className="font-semibold text-ov-text flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-ov-accent shrink-0" /> Raisons possibles :
          </p>
          <ul className="list-disc list-inside text-ov-muted space-y-1 pl-1">
            <li>Un lien ou un code d'authentification expiré ou déjà utilisé.</li>
            <li>Saisie directe d'une adresse URL inexistante.</li>
            <li>Redirection de sécurité vers votre espace sécurisé.</li>
          </ul>
        </div>

        {/* Actions de navigation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <Button
            onClick={() => navigate("/devices")}
            className="bg-ov-primary hover:bg-ov-primaryHover shadow-lg shadow-ov-primary/20"
          >
            <Home className="w-4 h-4 mr-2" /> Mes Appareils
          </Button>

          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="border-ov-border hover:bg-ov-bg"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Page Précédente
          </Button>
        </div>

        <div className="flex justify-center items-center gap-4 text-xs text-ov-muted pt-2 border-t border-ov-border">
          <button
            onClick={() => navigate("/pair")}
            className="hover:text-ov-primary transition-colors flex items-center gap-1"
          >
            <Laptop className="w-3.5 h-3.5" /> Appairage
          </button>
          <span>•</span>
          <button
            onClick={() => navigate("/login")}
            className="hover:text-ov-primary transition-colors flex items-center gap-1"
          >
            <KeyRound className="w-3.5 h-3.5" /> Connexion
          </button>
          <span>•</span>
          <button
            onClick={() => window.location.reload()}
            className="hover:text-ov-primary transition-colors flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Actualiser
          </button>
        </div>
      </Card>
    </div>
  );
}
