-- =====================================================
-- OvBridge — Migration 0017: Admin System & Governance
-- =====================================================

-- 1. Ajout des rôles admin et statut de bannissement aux profils
alter table public.ovbridge_profiles
  add column if not exists admin_role text check (admin_role in ('sss_admin', 'ss_admin', 's_admin', 'admin', 'none')) default 'none',
  add column if not exists is_banned boolean default false,
  add column if not exists banned_at timestamptz,
  add column if not exists ban_reason text;

-- Index pour recherche rapide d'admins et bannis
create index if not exists ovbridge_profiles_admin_role_idx on public.ovbridge_profiles(admin_role);
create index if not exists ovbridge_profiles_is_banned_idx on public.ovbridge_profiles(is_banned);

-- 2. Table des journaux d'erreurs système (SS Admin 70% & SSS Admin 100%)
create table if not exists public.ovbridge_error_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  device_id uuid references public.ovbridge_devices(id) on delete set null,
  error_code text not null,
  message text not null,
  stack text,
  severity text default 'error' check (severity in ('info', 'warning', 'error', 'critical')),
  resolved boolean default false,
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz default now() not null
);

alter table public.ovbridge_error_logs enable row level security;

-- 3. Table des règles système (SS Admin 70% & SSS Admin 100%)
create table if not exists public.ovbridge_system_rules (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text default 'general' check (category in ('general', 'security', 'limits', 'network')),
  rule_key text not null unique,
  rule_value text not null,
  description text,
  is_active boolean default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.ovbridge_system_rules enable row level security;

-- 4. Table de modération et des signalements (S Admin 40% & SSS Admin 100%)
create table if not exists public.ovbridge_moderation_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete cascade not null,
  target_type text not null check (target_type in ('transfer', 'space', 'device', 'user')),
  target_id text not null,
  reason text not null,
  status text default 'pending' check (status in ('pending', 'reviewed', 'action_taken', 'dismissed')),
  reviewed_by uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz default now() not null
);

alter table public.ovbridge_moderation_reports enable row level security;

-- 5. Table des logs d'audit admin (SSS Admin 100%)
create table if not exists public.ovbridge_admin_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id) on delete cascade not null,
  admin_role text not null,
  action text not null,
  target_id text,
  details jsonb,
  created_at timestamptz default now() not null
);

alter table public.ovbridge_admin_logs enable row level security;

-- ---------- FONCTIONS D'AIDE ET POLICIES RLS ----------

-- Fonction auxiliaire pour vérifier le rôle admin
create or replace function public.ovbridge_get_admin_role(p_user_id uuid)
returns text
language sql
security definer
set search_path = public
as $$
  select coalesce(admin_role, 'none')
  from public.ovbridge_profiles
  where id = p_user_id;
$$;

-- RLS Error Logs : L'utilisateur peut insérer des erreurs, les admins (SS & SSS) peuvent lire et modifier
create policy "ovbridge_error_logs: insert authenticated"
  on public.ovbridge_error_logs for insert
  with check (auth.uid() is not null);

create policy "ovbridge_error_logs: select admins"
  on public.ovbridge_error_logs for select
  using (public.ovbridge_get_admin_role(auth.uid()) in ('sss_admin', 'ss_admin'));

create policy "ovbridge_error_logs: update admins"
  on public.ovbridge_error_logs for update
  using (public.ovbridge_get_admin_role(auth.uid()) in ('sss_admin', 'ss_admin'));

-- RLS System Rules : Lecture pour tous les authentifiés, écriture pour SS & SSS Admin
create policy "ovbridge_system_rules: select authenticated"
  on public.ovbridge_system_rules for select
  using (auth.uid() is not null);

create policy "ovbridge_system_rules: write admins"
  on public.ovbridge_system_rules for all
  using (public.ovbridge_get_admin_role(auth.uid()) in ('sss_admin', 'ss_admin'));

-- RLS Moderation Reports : Création pour tous, lecture/gestion pour S & SSS Admin
create policy "ovbridge_moderation_reports: insert authenticated"
  on public.ovbridge_moderation_reports for insert
  with check (auth.uid() = reporter_id);

create policy "ovbridge_moderation_reports: select admins"
  on public.ovbridge_moderation_reports for select
  using (public.ovbridge_get_admin_role(auth.uid()) in ('sss_admin', 's_admin'));

create policy "ovbridge_moderation_reports: update admins"
  on public.ovbridge_moderation_reports for update
  using (public.ovbridge_get_admin_role(auth.uid()) in ('sss_admin', 's_admin'));

-- RLS Admin Logs : Accessible uniquement aux SSS Admins
create policy "ovbridge_admin_logs: sss admins access"
  on public.ovbridge_admin_logs for all
  using (public.ovbridge_get_admin_role(auth.uid()) = 'sss_admin');

-- RLS Profiles Admin Updates : Tous les admins peuvent lire les profils, SSS & Admin (10%) peuvent modifier le bannissement
create policy "ovbridge_profiles: admins select all"
  on public.ovbridge_profiles for select
  using (public.ovbridge_get_admin_role(auth.uid()) in ('sss_admin', 'ss_admin', 's_admin', 'admin'));

-- Fonction RPC sécurisée pour la gestion des bannissements par les administrateurs
create or replace function public.ovbridge_admin_set_user_ban(
  target_user_id uuid,
  new_ban_status boolean,
  reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
begin
  caller_role := public.ovbridge_get_admin_role(auth.uid());

  if caller_role not in ('sss_admin', 'ss_admin', 's_admin', 'admin') then
    raise exception 'Permission refusée: Réservé aux administrateurs.';
  end if;

  update public.ovbridge_profiles
  set
    is_banned = new_ban_status,
    banned_at = case when new_ban_status then now() else null end,
    ban_reason = case when new_ban_status then reason else null end,
    updated_at = now()
  where id = target_user_id;

  -- Audit log
  insert into public.ovbridge_admin_logs (admin_id, admin_role, action, target_id, details)
  values (
    auth.uid(),
    caller_role,
    case when new_ban_status then 'ban_user' else 'unban_user' end,
    target_user_id::text,
    jsonb_build_object('reason', reason)
  );
end;
$$;

-- Fonction RPC sécurisée pour la modification des rôles d'administration (SSS Admin 100% uniquement)
create or replace function public.ovbridge_admin_set_user_role(
  target_user_id uuid,
  new_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
begin
  caller_role := public.ovbridge_get_admin_role(auth.uid());

  if caller_role != 'sss_admin' then
    raise exception 'Permission refusée: Seul un SSS Admin (100%%) peut attribuer des rôles d administration.';
  end if;

  if new_role not in ('sss_admin', 'ss_admin', 's_admin', 'admin', 'none') then
    raise exception 'Rôle invalide';
  end if;

  update public.ovbridge_profiles
  set
    admin_role = new_role,
    updated_at = now()
  where id = target_user_id;

  insert into public.ovbridge_admin_logs (admin_id, admin_role, action, target_id, details)
  values (
    auth.uid(),
    caller_role,
    'change_admin_role',
    target_user_id::text,
    jsonb_build_object('new_role', new_role)
  );
end;
$$;
