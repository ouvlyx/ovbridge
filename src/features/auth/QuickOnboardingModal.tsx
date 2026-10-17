import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Zap,
  Laptop,
  Smartphone,
  ShieldCheck,
  QrCode,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "./useAuth";

export const QuickOnboardingModal: React.FC = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    if (!user) return;

    const pendingKey = `ovbridge_quick_onboarding_pending:${user.id}`;
    const seenKey = `ovbridge_quick_onboarding_seen:${user.id}`;

    const isPending = localStorage.getItem(pendingKey) === "true";
    const isSeen = localStorage.getItem(seenKey) === "true";

    if (isPending && !isSeen) {
      setOpen(true);
    }
  }, [user]);

  const handleFinish = () => {
    if (user) {
      localStorage.setItem(`ovbridge_quick_onboarding_seen:${user.id}`, "true");
      localStorage.removeItem(`ovbridge_quick_onboarding_pending:${user.id}`);
    }
    setOpen(false);
  };

  if (!open || !user) return null;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && handleFinish()}>
      <DialogContent className="bg-ov-surface/95 border-ov-border max-w-lg p-0 overflow-hidden shadow-2xl backdrop-blur-xl rounded-2xl">
        {/* Modal Top Progress Bar */}
        <div className="w-full bg-ov-bg h-1.5 flex">
          <div
            className="bg-gradient-to-r from-violet-600 to-cyan-400 h-full transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        <div className="p-6 sm:p-8 space-y-6 text-ov-text">
          {/* STEP 1: How it works */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-ov-primary/15 text-ov-primary mb-1 ring-8 ring-ov-primary/5">
                  <Sparkles className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-extrabold text-ov-primary">
                  Voilà comment ça marche
                </h2>
                <p className="text-xs sm:text-sm text-ov-muted">
                  OvBridge est ton pont instantané et chiffré entre tous tes appareils.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-ov-card/60 border border-ov-border/60">
                  <div className="p-2 rounded-lg bg-violet-500/15 text-violet-400 shrink-0 mt-0.5">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Transferts Ultra-Rapides</h3>
                    <p className="text-xs text-ov-muted mt-0.5">
                      Envoie fichiers, photos et textes d'un simple clic sans câble ni e-mail.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-ov-card/60 border border-ov-border/60">
                  <div className="p-2 rounded-lg bg-cyan-500/15 text-cyan-400 shrink-0 mt-0.5">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Presse-papier Partagé</h3>
                    <p className="text-xs text-ov-muted mt-0.5">
                      Copie sur ton téléphone, colle immédiatement sur ton ordinateur.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-ov-card/60 border border-ov-border/60">
                  <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400 shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Chiffrement de Bout en Bout</h3>
                    <p className="text-xs text-ov-muted mt-0.5">
                      Tes données sont chiffrées sur ton appareil avec libsodium avant envoi.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Link 2nd device */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-ov-primary/15 text-ov-primary mb-1 ring-8 ring-ov-primary/5">
                  <Laptop className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-extrabold text-ov-primary">
                  Lier ton 2ème appareil
                </h2>
                <p className="text-xs sm:text-sm text-ov-muted">
                  Scanne le QR Code ou ouvre OvBridge sur ton second appareil pour commencer à synchroniser.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-ov-card/80 border border-ov-border text-center space-y-4">
                <div className="mx-auto w-32 h-32 bg-white p-2 rounded-xl shadow-lg flex items-center justify-center border border-ov-border">
                  <QrCode className="w-24 h-24 text-slate-900" />
                </div>
                <div className="text-xs text-ov-muted space-y-1">
                  <p className="font-semibold text-white">Ouvre <span className="text-ov-accent font-mono">ovbridge.vercel.app</span></p>
                  <p>sur ton mobile ou second navigateur, puis vas dans "Appareils" &gt; "Scanner".</p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Ready! */}
          {step === 3 && (
            <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-300">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-400 mb-1 ring-8 ring-emerald-500/10">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-extrabold text-white">
                  Tout est prêt !
                </h2>
                <p className="text-xs sm:text-sm text-ov-muted max-w-sm mx-auto">
                  Ton identité est créée et tes identifiants sont sauvegardés sur cet appareil.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-ov-card/70 border border-ov-border/60 text-xs text-left text-ov-muted space-y-2">
                <p className="font-bold text-ov-primary">💡 Astuce OvBridge :</p>
                <p>
                  Retrouve tes identifiants à tout moment dans la page <span className="text-white font-medium">Profil</span> si tu as besoin de te connecter sur un nouvel appareil.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-2 border-t border-ov-border/50">
            {step > 1 ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
                className="text-xs text-ov-muted hover:text-white"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Précédent
              </Button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <Button
                type="button"
                onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
                className="bg-ov-primary hover:bg-ov-primaryHover text-white text-xs font-semibold px-5 rounded-xl h-10"
              >
                <span>Suivant</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleFinish}
                className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold px-6 rounded-xl h-10 shadow-lg shadow-violet-500/20"
              >
                Découvrir mon espace
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickOnboardingModal;
