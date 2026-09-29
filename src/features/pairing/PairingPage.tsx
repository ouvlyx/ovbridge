import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Copy,
  Check,
  RefreshCw,
  Camera,
  QrCode as QrIcon,
  KeyRound,
} from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";
import { usePairing } from "./usePairing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Tab = "invite" | "join";

export default function PairingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { code, expiresAt, loading, paired, start } = usePairing(user?.id);

  const [tab, setTab] = useState<Tab>("invite");
  const [manualCode, setManualCode] = useState("");

  useEffect(() => {
    if (!code && !loading && tab === "invite") start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, tab]);

  const joinUrl = code
    ? `${window.location.origin}/join?token=${code}`
    : "";

  const copy = async () => {
    if (!code) return;
    await navigator.clipboard.writeText(joinUrl);
    toast.success("Lien copié");
  };

  const goToJoin = () => {
    const c = manualCode.trim().toUpperCase();
    if (!c) return toast.error("Entrez un code");
    navigate(`/join?token=${c}`);
  };

  return (
    <div className="min-h-screen p-6 max-w-md mx-auto space-y-6">
      <header className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/devices")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">Lier un appareil</h1>
      </header>

      {/* Onglets */}
      <div className="flex gap-2 p-1 rounded-xl bg-ov-surface border border-ov-border">
        <button
          onClick={() => setTab("invite")}
          className={cn(
            "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2",
            tab === "invite"
              ? "bg-ov-primary text-white"
              : "text-ov-muted hover:text-ov-text"
          )}
        >
          <QrIcon className="w-4 h-4" /> Inviter
        </button>
        <button
          onClick={() => setTab("join")}
          className={cn(
            "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2",
            tab === "join"
              ? "bg-ov-primary text-white"
              : "text-ov-muted hover:text-ov-text"
          )}
        >
          <KeyRound className="w-4 h-4" /> Rejoindre
        </button>
      </div>

      {/* Onglet INVITER */}
      {tab === "invite" && (
        <>
          {paired ? (
            <Card className="p-6 border-ov-border text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-ov-success/20 text-ov-success flex items-center justify-center">
                <Check className="w-6 h-6" />
              </div>
              <p className="font-medium">Appareil lié !</p>
              <p className="text-sm text-ov-muted">
                Il apparaît maintenant dans votre liste.
              </p>
              <Button
                onClick={() => navigate("/devices")}
                className="w-full"
              >
                Voir mes appareils
              </Button>
            </Card>
          ) : (
            <>
              <Card className="p-6 border-ov-border flex flex-col items-center gap-4">
                {code ? (
                  <div className="w-full max-w-[220px] aspect-square bg-white p-3 rounded-xl">
                    <QRCodeSVG
                      value={joinUrl}
                      size={220}
                      level="M"
                      className="block w-full h-full"
                    />
                  </div>
                ) : (
                  <div className="w-full max-w-[220px] aspect-square bg-ov-bg rounded-xl flex items-center justify-center text-ov-muted text-sm">
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
                      Expire à{" "}
                      {new Date(expiresAt).toLocaleTimeString()}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 w-full">
                  <Button
                    variant="outline"
                    onClick={start}
                    className="flex-1"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" /> Nouveau
                  </Button>
                  <Button
                    onClick={copy}
                    disabled={!code}
                    className="flex-1"
                  >
                    <Copy className="w-4 h-4 mr-2" /> Copier
                  </Button>
                </div>
              </Card>

              <p className="text-xs text-ov-muted text-center leading-relaxed">
                Sur l'autre appareil, ouvrez OvBridge puis cliquez sur l'onglet{" "}
                <strong className="text-ov-text">Rejoindre</strong> et scannez
                ce QR code, ou saisissez le code.
              </p>
            </>
          )}
        </>
      )}

      {/* Onglet REJOINDRE */}
      {tab === "join" && (
        <>
          <Card className="p-6 border-ov-border space-y-5">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-ov-accent/15 text-ov-accent flex items-center justify-center">
              <Camera className="w-7 h-7" />
            </div>

            <div className="text-center space-y-1">
              <p className="font-medium">Rejoindre un pont existant</p>
              <p className="text-xs text-ov-muted">
                Scannez le QR code ou saisissez le code d'appairage
              </p>
            </div>

            <Button
              onClick={() => navigate("/scan")}
              className="w-full bg-ov-primary hover:bg-ov-primaryHover"
            >
              <Camera className="w-4 h-4 mr-2" /> Scanner avec la caméra
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-ov-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-ov-surface px-2 text-ov-muted">ou</span>
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="manual-code">Code d'appairage</Label>
              <Input
                id="manual-code"
                value={manualCode}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setManualCode(e.target.value.toUpperCase())
                }
                placeholder="XXXX-XXXX"
                className="font-mono tracking-widest text-center text-lg"
                onKeyDown={(e) => {
                  if (e.key === "Enter") goToJoin();
                }}
              />
              <Button
                onClick={goToJoin}
                disabled={!manualCode.trim()}
                variant="outline"
                className="w-full"
              >
                <KeyRound className="w-4 h-4 mr-2" /> Utiliser ce code
              </Button>
            </div>
          </Card>

          <p className="text-xs text-ov-muted text-center leading-relaxed">
            Vous serez redirigé vers la page de liaison, où vous devrez vous
            connecter avec <strong className="text-ov-text">le même compte</strong>{" "}
            que sur l'autre appareil.
          </p>
        </>
      )}
    </div>
  );
}