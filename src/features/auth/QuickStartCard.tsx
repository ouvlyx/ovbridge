import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  RefreshCw,
  Check,
  X,
  LoaderCircle,
  Sparkles,
  Edit3,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/Avatar";
import {
  getSuggestedPseudos,
  checkPseudoAvailability,
  quickSignup,
} from "@/lib/quickAuth";

interface QuickStartCardProps {
  onSuccess?: () => void;
  className?: string;
}

export const QuickStartCard: React.FC<QuickStartCardProps> = ({
  onSuccess,
  className = "",
}) => {
  const navigate = useNavigate();

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState<boolean>(true);

  const [selectedPseudo, setSelectedPseudo] = useState<string>("");
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [customPseudo, setCustomPseudo] = useState<string>("");

  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [availabilityMessage, setAvailabilityMessage] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Load initial suggestions
  const fetchSuggestions = useCallback(async () => {
    setLoadingSuggestions(true);
    try {
      const list = await getSuggestedPseudos(4);
      setSuggestions(list);
      if (list.length > 0 && !isCustomMode) {
        setSelectedPseudo(list[0]);
      }
    } catch (err) {
      console.warn("Erreur chargement suggestions:", err);
      toast.error("Impossible de charger les suggestions de pseudos.");
    } finally {
      setLoadingSuggestions(false);
    }
  }, [isCustomMode]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  // Handle custom pseudo debounced validation (300ms)
  useEffect(() => {
    if (!isCustomMode) return;

    const trimmed = customPseudo.trim();
    if (!trimmed) {
      setIsAvailable(null);
      setAvailabilityMessage("");
      setIsChecking(false);
      return;
    }

    if (trimmed.length < 3) {
      setIsAvailable(false);
      setAvailabilityMessage("3 caractères minimum");
      setIsChecking(false);
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      setIsAvailable(false);
      setAvailabilityMessage("Lettres, chiffres, '-' et '_' uniquement");
      setIsChecking(false);
      return;
    }

    setIsChecking(true);
    setAvailabilityMessage("");

    const timer = setTimeout(async () => {
      try {
        const available = await checkPseudoAvailability(trimmed);
        setIsAvailable(available);
        setAvailabilityMessage(
          available ? "Pseudo disponible !" : "Ce pseudo est déjà pris"
        );
      } catch {
        setIsAvailable(false);
        setAvailabilityMessage("Erreur de vérification");
      } finally {
        setIsChecking(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [customPseudo, isCustomMode]);

  const activePseudo = isCustomMode ? customPseudo.trim() : selectedPseudo;

  const handleSelectSuggestion = (pseudo: string) => {
    setSelectedPseudo(pseudo);
    setIsCustomMode(false);
  };

  const handleToggleCustomMode = () => {
    setIsCustomMode((prev) => {
      const next = !prev;
      if (next && !customPseudo) {
        setCustomPseudo(selectedPseudo);
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePseudo) {
      toast.error("Veuillez choisir ou saisir un pseudo.");
      return;
    }

    if (isCustomMode && isAvailable === false) {
      toast.error("Le pseudo choisi n'est pas disponible.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await quickSignup(activePseudo);
      toast.success(`Espace créé avec succès ! Bienvenue ${res.pseudo}`);
      if (onSuccess) {
        onSuccess();
      } else {
        navigate("/devices", { replace: true });
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la création de l'espace.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className={`w-full max-w-md p-6 bg-ov-surface/90 border-ov-border shadow-2xl backdrop-blur-md space-y-6 text-ov-text ${className}`}>
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="relative inline-block">
          <Avatar pseudo={activePseudo || "OvBridge"} size={72} className="mx-auto shadow-lg ring-4 ring-ov-primary/20 transition-all duration-300 transform hover:scale-105" />
          <div className="absolute -bottom-1 -right-1 bg-ov-primary text-white p-1 rounded-full shadow">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-extrabold text-ov-primary tracking-tight">
            Bienvenue sur OvBridge
          </h1>
          <p className="text-sm text-ov-muted mt-1">
            Choisis ton identité pour commencer
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {!isCustomMode ? (
          /* Suggestions Mode */
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-ov-muted uppercase tracking-wider">
              <span>Suggestions instantanées</span>
              <button
                type="button"
                onClick={fetchSuggestions}
                disabled={loadingSuggestions}
                className="inline-flex items-center gap-1.5 text-ov-accent hover:text-ov-primary transition-colors disabled:opacity-50"
                title="Générer de nouvelles suggestions"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    loadingSuggestions ? "animate-spin" : ""
                  }`}
                />
                <span>Autres suggestions</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {loadingSuggestions
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-12 bg-ov-card/50 border border-ov-border/40 rounded-xl animate-pulse"
                    />
                  ))
                : suggestions.map((p) => {
                    const isSelected = selectedPseudo === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handleSelectSuggestion(p)}
                        className={`group relative flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all duration-200 ${
                          isSelected
                            ? "bg-ov-primary/15 border-ov-primary text-ov-primary font-bold shadow-sm"
                            : "bg-ov-card/60 border-ov-border/60 hover:border-ov-primary/50 text-ov-text hover:bg-ov-card"
                        }`}
                      >
                        <Avatar pseudo={p} size={28} />
                        <span className="text-sm font-medium truncate flex-1">
                          {p}
                        </span>
                        {isSelected && (
                          <Check className="w-4 h-4 text-ov-primary shrink-0" />
                        )}
                      </button>
                    );
                  })}
            </div>

            <button
              type="button"
              onClick={handleToggleCustomMode}
              className="w-full pt-1 text-center text-xs text-ov-accent hover:text-ov-primary transition-colors font-medium flex items-center justify-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Je préfère créer mon propre pseudo</span>
            </button>
          </div>
        ) : (
          /* Custom Pseudo Mode */
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-ov-muted uppercase tracking-wider">
              <span>Pseudo personnalisé</span>
              <button
                type="button"
                onClick={handleToggleCustomMode}
                className="text-ov-accent hover:text-ov-primary transition-colors text-xs font-medium"
              >
                Retour aux suggestions
              </button>
            </div>

            <div className="relative">
              <Input
                type="text"
                placeholder="Ex: Cyber-Phoenix"
                value={customPseudo}
                onChange={(e) => setCustomPseudo(e.target.value)}
                maxLength={30}
                autoFocus
                className={`pr-10 bg-ov-card border-ov-border font-medium focus:ring-2 ${
                  isAvailable === true
                    ? "border-emerald-500/80 focus:ring-emerald-500/30"
                    : isAvailable === false
                    ? "border-rose-500/80 focus:ring-rose-500/30"
                    : "focus:ring-ov-primary/30"
                }`}
              />

              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                {isChecking && (
                  <LoaderCircle className="w-4 h-4 text-ov-muted animate-spin" />
                )}
                {!isChecking && isAvailable === true && (
                  <Check className="w-4 h-4 text-emerald-400" />
                )}
                {!isChecking && isAvailable === false && (
                  <X className="w-4 h-4 text-rose-400" />
                )}
              </div>
            </div>

            {availabilityMessage && (
              <p
                className={`text-xs font-medium flex items-center gap-1.5 ${
                  isAvailable ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {isAvailable ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <X className="w-3.5 h-3.5" />
                )}
                <span>{availabilityMessage}</span>
              </p>
            )}
          </div>
        )}

        {/* Submit Action */}
        <Button
          type="submit"
          disabled={
            isSubmitting ||
            !activePseudo ||
            (isCustomMode && (isAvailable === false || isChecking))
          }
          className="w-full h-12 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold text-base shadow-lg shadow-violet-500/20 transition-all duration-200 group border-0"
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <LoaderCircle className="w-5 h-5 animate-spin" />
              <span>Création de ton espace...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <span>Créer mon espace</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          )}
        </Button>
      </form>
    </Card>
  );
};

export default QuickStartCard;
