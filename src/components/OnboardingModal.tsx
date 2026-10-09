import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Laptop,
  Lock,
  Users,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  X,
} from "lucide-react";
import { useAuth } from "@/features/auth";

const STORAGE_PREFIX = "ovbridge_onboarding_seen_v2";

export function OnboardingModal() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  const storageKey = user ? `${STORAGE_PREFIX}:${user.id}` : null;

  /* ---------- ouverture unique par utilisateur ---------- */
  useEffect(() => {
    if (loading || dismissed) return;
    if (!storageKey) return;

    const seen = localStorage.getItem(storageKey);
    if (!seen) setOpen(true);
  }, [storageKey, loading, dismissed]);

  /* ---------- fermeture : marque comme vu ---------- */
  const markSeen = () => {
    if (storageKey) {
      localStorage.setItem(storageKey, new Date().toISOString());
    }
    setOpen(false);
    setDismissed(true);
  };

  const handleFinish = () => {
    setStep(0);
    markSeen();
  };

  const handleSkip = () => {
    setStep(0);
    markSeen();
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      // Fermer (X, ESC, clic extérieur) = considéré comme vu
      markSeen();
    }
    setOpen(isOpen);
  };

  const steps = [
    {
      title: "Bienvenue sur OvBridge",
      subtitle: "Votre pont chiffré multi-appareils",
      icon: <ShieldCheck className="w-10 h-10 text-ov-primary" />,
      description:
        "OvBridge relie tous vos appareils (smartphones, ordinateurs, tablettes) autour d'un espace sécurisé et chiffré de bout en bout.",
    },
    {
      title: "Chiffrement Zero-Knowledge",
      subtitle: "Confidentialité absolue",
      icon: <Lock className="w-10 h-10 text-ov-success" />,
      description:
        "Vos clés cryptographiques sont générées localement. Vos textes, fichiers et presse-papiers sont chiffrés avant même d'être envoyés.",
    },
    {
      title: "Appairage en un clin d'œil",
      subtitle: "Code à 6 chiffres ou QR Code",
      icon: <Laptop className="w-10 h-10 text-ov-accent" />,
      description:
        "Liez vos appareils en quelques secondes pour transférer des fichiers, partager votre presse-papiers ou passer des appels chiffrés.",
    },
    {
      title: "Espaces Collaboratifs",
      subtitle: "Partagez en équipe",
      icon: <Users className="w-10 h-10 text-ov-primary" />,
      description:
        "Créez des espaces de groupe avec vos collaborateurs pour échanger messages, documents et fichiers en toute simplicité.",
    },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-ov-surface border-ov-border text-ov-text max-w-sm p-6 text-center space-y-5 relative">
        {/* Bouton fermer en haut à droite */}
        <button
          onClick={handleSkip}
          aria-label="Passer l'introduction"
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-ov-muted hover:text-ov-text hover:bg-ov-bg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mx-auto w-16 h-16 rounded-2xl bg-ov-primary/10 border border-ov-primary/20 flex items-center justify-center">
          {current.icon}
        </div>

        <div className="space-y-1">
          <p className="text-[10px] uppercase font-bold text-ov-primary tracking-widest">
            Étape {step + 1} sur {steps.length}
          </p>
          <h2 className="text-xl font-bold text-ov-text">{current.title}</h2>
          <p className="text-xs text-ov-accent font-medium">{current.subtitle}</p>
        </div>

        <p className="text-xs text-ov-muted leading-relaxed">
          {current.description}
        </p>

        {/* Indicateurs d'étape cliquables */}
        <div className="flex justify-center gap-1.5 py-1">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              aria-label={`Aller à l'étape ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-6 bg-ov-primary" : "w-1.5 bg-ov-border hover:bg-ov-muted"
              }`}
            />
          ))}
        </div>

        <div className="space-y-2">
          {!isLast ? (
            <>
              <Button
                onClick={() => setStep((s) => s + 1)}
                className="w-full bg-ov-primary hover:bg-ov-primaryHover text-xs"
              >
                Suivant <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
              <button
                onClick={handleSkip}
                className="w-full text-[11px] text-ov-muted hover:text-ov-text transition-colors py-1"
              >
                Passer l'introduction
              </button>
            </>
          ) : (
            <>
              <Button
                onClick={handleFinish}
                className="w-full bg-ov-success hover:bg-ov-success/90 text-white text-xs font-bold"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Commencer l'expérience
              </Button>
              <div className="flex justify-center gap-3 text-[11px]">
                <button
                  onClick={() => setStep(step - 1)}
                  className="text-ov-muted hover:text-ov-text transition-colors"
                >
                  ← Précédent
                </button>
                <span className="text-ov-border">·</span>
                <button
                  onClick={handleSkip}
                  className="text-ov-muted hover:text-ov-text transition-colors"
                >
                  Passer
                </button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}