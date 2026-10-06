import { useNavigate } from "react-router-dom";
import { ArrowLeft, Scale, Shield, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function TermsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto space-y-6 text-ov-text">
      <header className="flex items-center gap-3 border-b border-ov-border pb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-ov-primary" />
          <h1 className="text-xl font-bold">Conditions Générales d'Utilisation (CGU)</h1>
        </div>
      </header>

      <Card className="p-6 border-ov-border bg-ov-surface space-y-5 text-sm leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-ov-primary flex items-center gap-2">
            <FileCheck className="w-4 h-4" /> 1. Objet et Acceptation
          </h2>
          <p className="text-ov-muted">
            Les présentes Conditions Générales d'Utilisation régissent l'accès et l'utilisation de la plateforme <strong>OvBridge</strong>. En créant un compte ou en liant un appareil, vous acceptez l'intégralité des présentes dispositions.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-ov-primary flex items-center gap-2">
            <Shield className="w-4 h-4" /> 2. Responsabilité et Sécurité des Clés
          </h2>
          <p className="text-ov-muted">
            L'utilisateur est le seul détenteur des clés privées générées localement sur ses appareils. En cas de suppression locale des données de navigateur ou de perte d'accès sans sauvegarde, OvBridge ne pourra en aucun cas récupérer ni déchiffrer les fichiers stockés.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-ov-primary flex items-center gap-2">
            <Scale className="w-4 h-4" /> 3. Usage Autorisé et Modération
          </h2>
          <p className="text-ov-muted">
            Il est strictement interdit d'utiliser OvBridge pour la diffusion de contenus illicites, malveillants ou contrefaits. L'équipe d'administration (via les modérateurs S Admin et SSS Admin) se réserve le droit de suspendre ou bannir tout compte en cas de signalement ou d'abus avéré.
          </p>
        </section>
      </Card>
    </div>
  );
}
