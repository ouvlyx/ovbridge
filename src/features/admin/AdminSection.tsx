import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UserCheck, UserX, UserPlus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/features/auth";
import {
  fetchUsersForAdmin,
  setUserBanStatus,
  updateUserAdminRole,
} from "@/lib/admin";
import {
  type UserProfileAdmin,
  type AdminRole,
  ADMIN_ROLE_LABELS,
  ADMIN_ROLE_LEVELS,
} from "@/types/admin";
import { friendlyError } from "@/lib/errors";
import { supabase } from "@/lib/supabase";

export default function AdminSection({ myRole }: { myRole: AdminRole }) {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfileAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  // Modal ajouter un membre
  const [addOpen, setAddOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [addBusy, setAddBusy] = useState(false);

  const myLevel = ADMIN_ROLE_LEVELS[myRole];

  const loadUsers = async () => {
    try {
      const data = await fetchUsersForAdmin();
      setUsers(data);
    } catch (e: any) {
      toast.error(friendlyError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleToggleBan = async (u: UserProfileAdmin) => {
    if (!user) return;
    setBusyId(u.id);
    try {
      const nextState = !u.is_banned;
      const reason = nextState ? "Banni par un administrateur" : undefined;
      await setUserBanStatus(user.id, myRole, u.id, nextState, reason);
      toast.success(nextState ? `Utilisateur ${u.email} banni` : `Bannissement levé pour ${u.email}`);
      await loadUsers();
    } catch (e: any) {
      toast.error(friendlyError(e));
    } finally {
      setBusyId(null);
    }
  };

  const handleRoleChange = async (u: UserProfileAdmin, newRole: AdminRole) => {
    if (!user) return;
    if (myLevel < 100) {
      return toast.error("Seul un SSS Admin (100%) peut attribuer des rôles d'administration");
    }
    setBusyId(u.id);
    try {
      await updateUserAdminRole(user.id, myRole, u.id, newRole);
      toast.success(`Rôle de ${u.email} mis à jour : ${ADMIN_ROLE_LABELS[newRole]}`);
      await loadUsers();
    } catch (e: any) {
      toast.error(friendlyError(e));
    } finally {
      setBusyId(null);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return toast.error("Entrez une adresse email");
    setAddBusy(true);
    try {
      // Envoyer une invitation ou inscrire le membre via l'API Supabase Auth
      const { error } = await supabase.auth.signUp({
        email: newEmail.trim(),
        password: "TempPassword123!",
      });

      if (error) throw error;

      toast.success(`Membre ${newEmail} ajouté avec succès. Un email de confirmation a été envoyé.`);
      setNewEmail("");
      setNewDisplayName("");
      setAddOpen(false);
      await loadUsers();
    } catch (e: any) {
      toast.error(friendlyError(e));
    } finally {
      setAddBusy(false);
    }
  };

  const filtered = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.display_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Gestion des Membres & Bannissements (10/100)</h2>
          <p className="text-xs text-ov-muted">
            Recherchez, modérez l'accès des membres et ajoutez de nouveaux utilisateurs.
          </p>
        </div>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-ov-primary hover:bg-ov-primaryHover text-xs">
              <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Ajouter un membre
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-ov-surface border-ov-border text-ov-text">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-ov-primary" /> Ajouter un nouveau membre
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddMember} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="add-email">Adresse Email</Label>
                <Input
                  id="add-email"
                  type="email"
                  placeholder="collaborateur@exemple.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-name">Nom d'affichage (Optionnel)</Label>
                <Input
                  id="add-name"
                  placeholder="Jean Dupont"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={addBusy} className="w-full bg-ov-primary hover:bg-ov-primaryHover">
                {addBusy ? "Création…" : "Créer / Inviter le membre"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-3 text-ov-muted" />
        <Input
          placeholder="Rechercher par email ou nom…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <p className="text-sm text-ov-muted text-center py-6">Chargement des membres…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-ov-muted text-center py-6">Aucun membre trouvé.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((u) => {
            const level = ADMIN_ROLE_LEVELS[u.admin_role];
            return (
              <Card
                key={u.id}
                className="p-4 border-ov-border bg-ov-surface flex flex-wrap items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm truncate">{u.email}</p>
                    {u.is_banned && <Badge variant="destructive">Banni</Badge>}
                    {level > 0 && (
                      <Badge className="bg-ov-accent/20 text-ov-accent border-0 text-[10px]">
                        {u.admin_role.toUpperCase()} ({level}%)
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-ov-muted truncate">
                    {u.display_name ?? "Sans nom d'affichage"} · Inscrit le{" "}
                    {new Date(u.created_at).toLocaleDateString()}
                  </p>
                  {u.ban_reason && (
                    <p className="text-xs text-ov-danger mt-1">Raison : {u.ban_reason}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {myLevel >= 100 && (
                    <select
                      value={u.admin_role}
                      onChange={(e) =>
                        handleRoleChange(u, e.target.value as AdminRole)
                      }
                      disabled={busyId === u.id || u.id === user?.id}
                      className="text-xs bg-ov-bg border border-ov-border rounded-lg px-2 py-1 text-ov-text"
                    >
                      <option value="none">Standard (0%)</option>
                      <option value="admin">Admin (10%)</option>
                      <option value="s_admin">S Admin (40%)</option>
                      <option value="ss_admin">SS Admin (70%)</option>
                      <option value="sss_admin">SSS Admin (100%)</option>
                    </select>
                  )}

                  <Button
                    size="sm"
                    variant={u.is_banned ? "outline" : "danger"}
                    disabled={busyId === u.id || u.id === user?.id}
                    onClick={() => handleToggleBan(u)}
                  >
                    {u.is_banned ? (
                      <>
                        <UserCheck className="w-3.5 h-3.5 mr-1" /> Débannir
                      </>
                    ) : (
                      <>
                        <UserX className="w-3.5 h-3.5 mr-1" /> Bannir
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
