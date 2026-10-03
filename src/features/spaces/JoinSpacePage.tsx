import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Users, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { friendlyError } from "@/lib/errors";
import { useAuth } from "@/features/auth";
import { joinSpaceByCode } from "@/lib/spaces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export default function JoinSpacePage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [params] = useSearchParams();
  const [code, setCode] = useState(params.get("code") ?? "");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Connectez-vous d'abord");
      navigate("/login");
      return;
    }
    if (!code.trim()) return toast.error("Code vide");
    setBusy(true);
    try {
      const spaceId = await joinSpaceByCode(code);
      toast.success("Vous avez rejoint l'espace");
      navigate(`/spaces/${spaceId}`);
    } catch (e: any) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-6 bg-ov-surface border-ov-border space-y-6">
        <header className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/devices")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Rejoindre un espace</h1>
            <p className="text-xs text-ov-muted">Entrez le code reçu</p>
          </div>
        </header>

        <div className="w-16 h-16 mx-auto rounded-2xl bg-ov-primary/15 text-ov-primary flex items-center justify-center">
          <Users className="w-8 h-8" />
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Code d'invitation</Label>
            <Input
              id="code"
              value={code}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setCode(e.target.value.toUpperCase())
              }
              placeholder="XXXX-XXXX"
              className="font-mono tracking-widest text-center text-lg"
              autoFocus
            />
          </div>

          <Button
            type="submit"
            disabled={busy || authLoading}
            className="w-full bg-ov-primary hover:bg-ov-primaryHover"
          >
            {busy ? "Rejoindre…" : "Rejoindre l'espace"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
