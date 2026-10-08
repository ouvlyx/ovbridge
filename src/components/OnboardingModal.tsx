import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Laptop, Lock, Users, ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";

export function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const seen = localStorage.getItem("ovbridge_onboarding_seen");
    if (!seen) {
      setOpen(true);
    }
  }, []);

  const handleFinish = () => {
    localStorage.setItem("ovbridge_onboarding_seen", "true");
    setOpen(false);
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="bg-ov-surface border-ov-border text-ov-text max-w-sm p-6 text-center space-y-5">
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

        <p className="text-xs text-ov-muted leading-relaxed">{current.description}</p>

        <div className="flex justify-center gap-1.5 py-1">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-6 bg-ov-primary" : "w-1.5 bg-ov-border"
              }`}
            />
          ))}
        </div>

        {step < steps.length - 1 ? (
          <Button
            onClick={() => setStep((s) => s + 1)}
            className="w-full bg-ov-primary hover:bg-ov-primaryHover text-xs"
          >
            Suivant <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        ) : (
          <Button
            onClick={handleFinish}
            className="w-full bg-ov-success hover:bg-ov-success/90 text-white text-xs font-bold"
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Commencer l'expérience
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
