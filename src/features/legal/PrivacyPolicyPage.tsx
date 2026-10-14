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
            <Lock className="w-4 h-4" /> 1. Chiffrement et limites
          </h2>
          <p className="text-ov-muted">
            Les messages texte et fichiers envoyés par les fonctions de transfert sont chiffrés sur l'appareil avant leur envoi, avec libsodium. Les serveurs ne reçoivent pas la clé privée de déchiffrement. Cela ne signifie pas que toutes les données sont chiffrées de bout en bout : les métadonnées nécessaires au service restent visibles, et le chiffrement n'empêche pas l'accès depuis un appareil compromis ou par un destinataire autorisé.
          </p>
          <p className="text-ov-muted">
            Les clés privées des appareils sont actuellement conservées dans le stockage local du navigateur. Toute personne ou tout script malveillant ayant accès à la session du navigateur pourrait donc y accéder. La sécurité des clés dépend aussi de la sécurité de l'appareil et du navigateur.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-ov-primary flex items-center gap-2">
            <EyeOff className="w-4 h-4" /> 2. Données Collectées & Traitement
          </h2>
          <p className="text-ov-muted">
            Pour fournir le service, OvBridge et son hébergeur Supabase traitent notamment :
          </p>
          <ul className="list-disc list-inside text-ov-muted pl-2 space-y-1">
            <li>Les données de compte (adresse e-mail, identifiant, nom d'affichage et champs de profil renseignés).</li>
            <li>Les appareils associés au compte, leurs noms, clés publiques et dates d'activité.</li>
            <li>Les contenus de transfert chiffrés et les métadonnées associées : destinataires, taille et type de fichier, horodatage et statut.</li>
            <li>Les données nécessaires aux espaces, appels, presse-papiers et espace de stockage, y compris leurs métadonnées.</li>
            <li>Les journaux techniques ou de modération générés lors de l'utilisation ou d'un signalement.</li>
          </ul>
          <p className="text-ov-muted">
            Supabase, Vercel et le fournisseur d'e-mail configuré interviennent dans l'hébergement, l'authentification, la diffusion du site ou l'envoi de messages. Ces fournisseurs peuvent traiter des données techniques de connexion selon leur configuration et leurs propres politiques.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-ov-primary flex items-center gap-2">
            <FileText className="w-4 h-4" /> 3. Conservation et Suppression
          </h2>
          <p className="text-ov-muted">
            Les données sont conservées dans le projet Supabase selon sa configuration. Certains éléments peuvent être supprimés depuis l'application, mais la suppression d'un appareil ne supprime pas nécessairement tous les transferts, copies de sauvegarde ou journaux associés. Les délais de conservation et les demandes de suppression doivent être confirmés auprès de l'équipe qui exploite la bêta avant toute collecte publique.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-ov-primary flex items-center gap-2">
            <FileText className="w-4 h-4" /> 4. Contact
          </h2>
          <p className="text-ov-muted">
            Pour toute question sur la confidentialité, l'accès à vos données ou
            une demande de suppression, écrivez à{" "}
            <a
              href="mailto:ouvlyx999@gmail.com"
              className="text-ov-accent hover:underline"
            >
              ouvlyx999@gmail.com
            </a>
            .
          </p>
        </section>
      </Card>
    </div>
  );
}
