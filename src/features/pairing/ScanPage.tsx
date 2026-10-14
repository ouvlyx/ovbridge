import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, AlertCircle } from "lucide-react";
import { friendlyError } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const REGION_ID = "ovbridge-qr-region";

export default function ScanPage() {
  const navigate = useNavigate();
  const scannerRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function start() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (!mounted) return;

        const scanner = new Html5Qrcode(REGION_ID);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            // On extrait le token du QR (URL complète ou juste le code)
            let token = decodedText.trim();

            try {
              const url = new URL(decodedText);
              const t = url.searchParams.get("token");
              if (t) token = t;
            } catch {
              // pas une URL → token brut, on garde
            }

            if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(token)) {
              // mauvais format, on ignore ce scan
              return;
            }

            stop().finally(() => {
              navigate(`/join?token=${token}`, { replace: true });
            });
          },
          () => {
            // erreur de frame, on ignore
          }
        );

        if (mounted) setStarting(false);
      } catch (e: any) {
        if (mounted) {
          setStarting(false);
          setError(
            e?.message?.includes("Permission")
              ? "Accès à la caméra refusé. Autorisez la caméra dans les réglages."
              : friendlyError(e)
          );
        }
      }
    }

    async function stop() {
      const s = scannerRef.current;
      if (s) {
        try {
          await s.stop();
          s.clear();
        } catch {
          // déjà arrêté
        }
        scannerRef.current = null;
      }
    }

    start();

    return () => {
      mounted = false;
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen p-6 max-w-md mx-auto space-y-6">
      <header className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate("/pair", { replace: true });
            }
          }}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">Scanner un QR code</h1>
      </header>

      <Card className="p-4 border-ov-border space-y-4">
        <div
          id={REGION_ID}
          className="w-full rounded-xl overflow-hidden bg-black min-h-[280px] flex items-center justify-center"
        />

        {starting && !error && (
          <p className="text-sm text-ov-muted text-center flex items-center justify-center gap-2">
            <Camera className="w-4 h-4" /> Ouverture de la caméra…
          </p>
        )}

        {error && (
          <div className="text-sm text-ov-danger flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p>{error}</p>
              <p className="text-xs text-ov-muted mt-1">
                Vous pouvez saisir le code manuellement.
              </p>
            </div>
          </div>
        )}

        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate("/join")}
        >
          Saisir le code manuellement
        </Button>
      </Card>

      <p className="text-xs text-ov-muted text-center">
        Pointez la caméra vers le QR code affiché sur l'autre appareil.
      </p>

      <Button
        variant="ghost"
        className="w-full text-ov-muted"
        onClick={() => navigate("/pair", { replace: true })}
      >
        Annuler et revenir
      </Button>
    </div>
  );
}