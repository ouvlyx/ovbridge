import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Copy, Check, ArrowLeft, ShieldCheck, Key, AlertCircle, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar } from "@/components/Avatar";
import { getSavedCredentials, SavedCredentials } from "@/lib/quickAuth";
import { supabase } from "@/lib/supabase";

export default function RecoverAccountPage() {
  const navigate = useNavigate();
  const [pseudoInput, setPseudoInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchDone, setSearchDone] = useState(false);
  const [foundAccount, setFoundAccount] = useState<{ id: string; display_name: string } | null>(null);

  const [savedCreds, setSavedCreds] = useState<SavedCredentials | null>(null);
  const [copiedLogin, setCopiedLogin] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  useEffect(() => {
    const creds = getSavedCredentials();
    if (creds) {
      setSavedCreds(creds);
      if (creds.pseudo) {
        setPseudoInput(creds.pseudo);
      }
    }
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = pseudoInput.trim();
    if (!clean) {
      toast.error("Veuillez saisir un pseudo.");
      return;
    }

    setSearching(true);
    setSearchDone(false);
    setFoundAccount(null);

    try {
      const { data, error } = await supabase
        .from("ovbridge_profiles")
        .select("id, display_name")
        .ilike("display_name", clean)
        .maybeSingle();

      if (error) {
        throw error;
      }

      setSearchDone(true);
      if (data) {
        setFoundAccount(data);
      } else {
        toast.error("Aucun compte trouvé avec ce pseudo.");
      }
    } catch (err: any) {
      toast.error("Erreur lors de la recherche du compte.");
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const copyToClipboard = async (text: string, type: "login" | "pass") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "login") {
        setCopiedLogin(true);
        setTimeout(() => setCopiedLogin(false), 2000);
      } else {
        setCopiedPass(true);
        setTimeout(() => setCopiedPass(false), 2000);
      }
      toast.success("Copié dans le presse-papier !");
    } catch {
      toast.error("Impossible de copier le texte.");
    }
  };

  const hasLocalCredsForPseudo =
    savedCreds &&
    foundAccount &&
    savedCreds.pseudo.toLowerCase() === foundAccount.display_name.toLowerCase();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-ov-bg text-ov-text">
      <div className="w-full max-w-md space-y-6">
        {/* Brand logo header */}
        <div className="flex justify-center mb-2">
          <Link to="/" className="inline-block">
            <img
              src="/brandmark-bg.png"
              alt="OvBridge"
              className="h-14 w-auto rounded-2xl shadow-xl border border-ov-border/50 hover:scale-105 transition-transform"
            />
          </Link>
        </div>

        <Card className="w-full p-6 bg-ov-surface/90 border-ov-border shadow-2xl backdrop-blur-md space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-ov-primary/10 text-ov-primary mb-1">
              <Key className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-ov-primary">
              Récupérer mon compte
            </h1>
            <p className="text-sm text-ov-muted">
              Saisis ton pseudo pour retrouver tes identifiants ou tes options d'accès.
            </p>
          </div>

          <form onSubmit={handleSearch} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pseudo">Ton pseudo OvBridge</Label>
              <div className="relative">
                <Input
                  id="pseudo"
                  type="text"
                  placeholder="Ex: Nova-Xyl"
                  value={pseudoInput}
                  onChange={(e) => setPseudoInput(e.target.value)}
                  className="pr-10 bg-ov-card border-ov-border font-medium"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-ov-muted">
                  <Search className="w-4 h-4" />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={searching || !pseudoInput.trim()}
              className="w-full bg-ov-primary hover:bg-ov-primaryHover text-white font-semibold h-11 rounded-xl"
            >
              {searching ? (
                <div className="flex items-center gap-2">
                  <LoaderCircle className="w-4 h-4 animate-spin" />
                  <span>Recherche en cours...</span>
                </div>
              ) : (
                <span>Retrouver mon compte</span>
              )}
            </Button>
          </form>

          {/* Results section */}
          {searchDone && foundAccount && (
            <div className="space-y-4 pt-2 border-t border-ov-border/60 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Avatar pseudo={foundAccount.display_name} size={40} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                    Compte trouvé !
                  </p>
                  <p className="text-base font-bold text-white truncate">
                    {foundAccount.display_name}
                  </p>
                </div>
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              </div>

              {/* Local credentials available */}
              {hasLocalCredsForPseudo ? (
                <div className="space-y-3 p-4 rounded-xl bg-ov-card border border-ov-border">
                  <p className="text-xs font-semibold text-ov-primary flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5" />
                    <span>Identifiants stockés sur cet appareil</span>
                  </p>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-ov-muted block mb-0.5">Identifiant interne (Login)</span>
                      <div className="flex items-center justify-between gap-2 p-2 rounded bg-ov-bg border border-ov-border/40 font-mono text-ov-text">
                        <span className="truncate select-all">{savedCreds.login}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(savedCreds.login, "login")}
                          className="p-1 hover:text-ov-primary text-ov-muted transition-colors shrink-0"
                          title="Copier le login"
                        >
                          {copiedLogin ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-ov-muted block mb-0.5">Mot de passe temporaire</span>
                      <div className="flex items-center justify-between gap-2 p-2 rounded bg-ov-bg border border-ov-border/40 font-mono text-ov-text">
                        <span className="truncate select-all">{savedCreds.pass}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(savedCreds.pass, "pass")}
                          className="p-1 hover:text-ov-primary text-ov-muted transition-colors shrink-0"
                          title="Copier le mot de passe"
                        >
                          {copiedPass ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={() => navigate("/login")}
                    className="w-full mt-2 bg-ov-primary hover:bg-ov-primaryHover text-white font-medium text-xs h-9 rounded-lg"
                  >
                    Se connecter directement
                  </Button>
                </div>
              ) : (
                /* Account exists but no local credentials on this device */
                <div className="p-4 rounded-xl bg-ov-card/70 border border-ov-border/80 space-y-3 text-xs text-ov-muted">
                  <div className="flex items-start gap-2 text-amber-400 font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Appareil non lié à ce compte</span>
                  </div>
                  <p>
                    Compte trouvé. Pour des raisons de sécurité, connecte-toi depuis un appareil déjà lié pour transférer l'accès, ou utilise tes identifiants sauvegardés si tu les as conservés.
                  </p>
                </div>
              )}
            </div>
          )}

          {searchDone && !foundAccount && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs text-center">
              Aucun compte ne correspond à ce pseudo. Vérifie l'orthographe ou crée un nouvel espace.
            </div>
          )}

          {/* Footer Back Link */}
          <div className="pt-2 text-center border-t border-ov-border/40">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs text-ov-accent hover:text-ov-primary transition-colors font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Retour à la connexion</span>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
