export type AdminRole = 'sss_admin' | 'ss_admin' | 's_admin' | 'admin' | 'none';

export const ADMIN_ROLE_LEVELS: Record<AdminRole, number> = {
  sss_admin: 100, // Access 100/100: Full control, delegation, logs, global rules
  ss_admin: 70,   // Access 70/100: Error management, rule creation, system config
  s_admin: 40,    // Access 40/100: Moderation, content flagging, reports
  admin: 10,      // Access 10/100: User ban/unban, member management
  none: 0,
};

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  sss_admin: "SSS Admin (100% - Total)",
  ss_admin: "SS Admin (70% - Règles & Erreurs)",
  s_admin: "S Admin (40% - Modération)",
  admin: "Admin (10% - Gestion Membres & Bannissement)",
  none: "Utilisateur Standard",
};

export type UserProfileAdmin = {
  id: string;
  email: string;
  display_name: string | null;
  admin_role: AdminRole;
  is_banned: boolean;
  banned_at: string | null;
  ban_reason: string | null;
  created_at: string;
};

export type ErrorLog = {
  id: string;
  user_id: string | null;
  device_id: string | null;
  error_code: string;
  message: string;
  stack: string | null;
  severity: 'info' | 'warning' | 'error' | 'critical';
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
};

export type SystemRule = {
  id: string;
  title: string;
  category: 'general' | 'security' | 'limits' | 'network';
  rule_key: string;
  rule_value: string;
  description: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ModerationReport = {
  id: string;
  reporter_id: string;
  target_type: 'transfer' | 'space' | 'device' | 'user';
  target_id: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'action_taken' | 'dismissed';
  reviewed_by: string | null;
  notes: string | null;
  created_at: string;
};

export type AdminLog = {
  id: string;
  admin_id: string;
  admin_role: string;
  action: string;
  target_id: string | null;
  details: any;
  created_at: string;
};
