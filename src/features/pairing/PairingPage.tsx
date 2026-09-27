import { useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/AuthProvider";
import { usePairing } from "./usePairing";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Copy, Check, RefreshCw, Camera } from "lucide-react";

export default function PairingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { code, expiresAt, loading, paired, start } = usePairing(user?.id);

  useEffect(() => {
    if (!code && !loading) start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const joinUrl = code
    ? `${window.location.origin}/join?token=${code}`
    : "";

  const copy = async () => {
    if (!code) return;
    await navigator.clipboard.writeText(joinUrl);
    toast.success("Lien copié");
  };

  return (
    <div className="min-h-screen p-6 max-w-md mx-auto space-y-6">
      <header className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/devices")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">Lier un appareil</h1>
      </header>

      {paired ? (
        <Card className="p-6 border-ov-border text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-ov-success/20 text-ov-success flex items-center justify-center">
            <Check className="w-6 h-6" />
          </div>
          <p className="font-medium">Appareil lié !</p>
          <p className="text-sm text-ov-muted">
            Il apparaît maintenant dans votre liste.
          </p>
          <Button onClick={() => navigate("/devices")} className="w-full">
            Voir mes appareils
          </Button>
        </Card>
      ) : (
        <>
          <Card className="p-6 border-ov-border flex flex-col items-center gap-4">
            {code ? (
              <div className="bg-white p-3 rounded-xl">
                <QRCodeSVG value={joinUrl} size={220} level="M" />
              </div>
            ) : (
              <div className="w-[220px] h-[220px] bg-ov-bg rounded-xl flex items-center justify-center text-ov-muted text-sm">
                {loading ? "Génération…" : "—"}
              </div>
            )}

            <div className="text-center space-y-1">
              <p className="text-xs text-ov-muted uppercase tracking-wide">
                Code d'appairage
              </p>
              <p className="text-2xl font-mono font-bold tracking-widest text-ov-accent">
                {code ?? "····-····"}
              </p>
              {expiresAt && (
                <p className="text-xs text-ov-muted">
                  Expire à {new Date(expiresAt).toLocaleTimeString()}
                </p>
              )}
            </div>

            <div className="flex gap-2 w-full">
              <Button variant="outline" onClick={start} className="flex-1">
                <RefreshCw className="w-4 h-4 mr-2" /> Nouveau
              </Button>
              <Button onClick={copy} disabled={!code} className="flex-1">
                <Copy className="w-4 h-4 mr-2" /> Copier
              </Button>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/scan")}
            >
              <Camera className="w-4 h-4 mr-2" />
              Scanner un QR depuis cet appareil
            </Button>
          </Card>

          <p className="text-xs text-ov-muted text-center leading-relaxed">
            Ouvrez OvBridge sur l'autre appareil, connectez-vous avec le
            <strong> même email</strong>, et cliquez sur « J'ai un code ».
          </p>
        </>
      )}
    </div>
  );
}