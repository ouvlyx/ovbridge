import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Lock, EyeOff, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto space-y-6 text-ov-text">
      <header className="flex items-center gap-3 border-b border-ov-border pb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-ov-primary" />
          <h1 className="text-xl font-bold">Politique de Confidentialité</h1>
        </div>
      </header>

      <Card className="p-6 border-ov-border bg-ov-surface space-y-5 text-sm leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-ov-primary flex items-center gap-2">
            <Lock className="w-4 h-4" /> 1. Chiffrement de Bout en Bout (Zero-Knowledge)
          </h2>
          <p className="text-ov-muted">
            OvBridge applique un principe strict de "Zero-Knowledge Architecture". Vos contenus (textes, fichiers, éléments du presse-papiers) sont chiffrés localement sur votre appareil à l'aide de la bibliothèque cryptographique <strong>libsodium (Curve25519)</strong> avant tout transfert. Aucun serveur, y compris les relais Supabase, ne possède la clé privée nécessaire pour déchiffrer vos données.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-ov-primary flex items-center gap-2">
            <EyeOff className="w-4 h-4" /> 2. Données Collectées & Traitement
          </h2>
          <p className="text-ov-muted">
            Seules les données strictly indispensables au fonctionnement du pont sont conservées :
          </p>
          <ul className="list-disc list-inside text-ov-muted pl-2 space-y-1">
            <li>Votre adresse e-mail d'authentification.</li>
            <li>Les empreintes publiques (BLAKE2b) et noms attribués à vos appareils.</li>
            <li>Les métadonnées de transfert chiffré (taille du fichier, horodatage, statut de lecture).</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-ov-primary flex items-center gap-2">
            <FileText className="w-4 h-4" /> 3. Conservation et Suppression
          </h2>
          <p className="text-ov-muted">
            Les transferts temporaires peuvent être configurés avec un délai d'expiration ou supprimés manuellement à tout moment depuis votre console. La suppression d'un appareil ou de votre compte entraîne l'effacement définitif de toutes ses paires de clés associées.
          </p>
        </section>
      </Card>
    </div>
  );
}
