import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("ovbridge_profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();
      setDisplayName(data?.display_name ?? "");
      setLoading(false);
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase
      .from("ovbridge_profiles")
      .update({ display_name: displayName.trim() })
      .eq("id", user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Profil mis à jour");
  };

  return (
    <div className="min-h-screen p-6 max-w-md mx-auto space-y-6">
      <header className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/devices")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">Mon profil</h1>
      </header>

      <Card className="p-5 border-ov-border space-y-5">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={user?.email ?? ""} disabled />
        </div>

        <div className="space-y-2">
          <Label htmlFor="display">Nom d'affichage</Label>
          <Input
            id="display"
            value={loading ? "" : displayName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setDisplayName(e.target.value)
            }
            placeholder="Ton nom"
            maxLength={40}
          />
          <p className="text-xs text-ov-muted">
            Ce nom apparaîtra comme signature lors de l'envoi de fichiers.
          </p>
        </div>

        <Button
          onClick={save}
          disabled={busy || loading}
          className="w-full bg-ov-primary hover:bg-ov-primaryHover"
        >
          {busy ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </Card>
    </div>
  );
}
