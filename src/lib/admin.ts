import { supabase } from "./supabase";
import type {
  AdminRole,
  UserProfileAdmin,
  ErrorLog,
  SystemRule,
  ModerationReport,
  AdminLog,
} from "@/types/admin";

export async function fetchUserAdminRole(userId: string): Promise<AdminRole> {
  const { data, error } = await supabase
    .from("ovbridge_profiles")
    .select("admin_role")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return "none";
  return (data.admin_role as AdminRole) ?? "none";
}

export async function logAdminAction(
  adminId: string,
  role: AdminRole,
  action: string,
  targetId?: string,
  details?: any
) {
  try {
    await supabase.from("ovbridge_admin_logs").insert({
      admin_id: adminId,
      admin_role: role,
      action,
      target_id: targetId ?? null,
      details: details ?? {},
    });
  } catch (e) {
    console.error("[logAdminAction]", e);
  }
}

// ---------- 10% ADMIN: User & Ban Management ----------

export async function fetchUsersForAdmin(): Promise<UserProfileAdmin[]> {
  const { data, error } = await supabase
    .from("ovbridge_profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as UserProfileAdmin[];
}

export async function setUserBanStatus(
  adminId: string,
  adminRole: AdminRole,
  userId: string,
  banned: boolean,
  reason?: string
) {
  const { error } = await supabase
    .from("ovbridge_profiles")
    .update({
      is_banned: banned,
      banned_at: banned ? new Date().toISOString() : null,
      ban_reason: banned ? reason || "Violation des conditions d'utilisation" : null,
    })
    .eq("id", userId);

  if (error) throw error;

  await logAdminAction(
    adminId,
    adminRole,
    banned ? "BAN_USER" : "UNBAN_USER",
    userId,
    { reason }
  );
}

export async function updateUserAdminRole(
  adminId: string,
  adminRole: AdminRole,
  userId: string,
  newRole: AdminRole
) {
  const { error } = await supabase
    .from("ovbridge_profiles")
    .update({ admin_role: newRole })
    .eq("id", userId);

  if (error) throw error;

  await logAdminAction(adminId, adminRole, "UPDATE_ADMIN_ROLE", userId, {
    newRole,
  });
}

// ---------- 40% S ADMIN: Moderation ----------

export async function fetchModerationReports(): Promise<ModerationReport[]> {
  const { data, error } = await supabase
    .from("ovbridge_moderation_reports")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ModerationReport[];
}

export async function updateReportStatus(
  adminId: string,
  adminRole: AdminRole,
  reportId: string,
  status: ModerationReport["status"],
  notes?: string
) {
  const { error } = await supabase
    .from("ovbridge_moderation_reports")
    .update({
      status,
      reviewed_by: adminId,
      notes,
    })
    .eq("id", reportId);

  if (error) throw error;

  await logAdminAction(adminId, adminRole, "UPDATE_REPORT_STATUS", reportId, {
    status,
    notes,
  });
}

// ---------- 70% SS ADMIN: System Errors & Rules ----------

export async function fetchErrorLogs(): Promise<ErrorLog[]> {
  const { data, error } = await supabase
    .from("ovbridge_error_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  return (data ?? []) as ErrorLog[];
}

export async function resolveErrorLog(
  adminId: string,
  adminRole: AdminRole,
  errorId: string
) {
  const { error } = await supabase
    .from("ovbridge_error_logs")
    .update({
      resolved: true,
      resolved_by: adminId,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", errorId);

  if (error) throw error;

  await logAdminAction(adminId, adminRole, "RESOLVE_ERROR", errorId);
}

export async function fetchSystemRules(): Promise<SystemRule[]> {
  const { data, error } = await supabase
    .from("ovbridge_system_rules")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as SystemRule[];
}

export async function createOrUpdateSystemRule(
  adminId: string,
  adminRole: AdminRole,
  rule: Partial<SystemRule> & { title: string; rule_key: string; rule_value: string }
) {
  const { error } = await supabase.from("ovbridge_system_rules").upsert({
    ...rule,
    created_by: adminId,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;

  await logAdminAction(
    adminId,
    adminRole,
    "SAVE_SYSTEM_RULE",
    rule.rule_key,
    rule
  );
}

// ---------- 100% SSS ADMIN: Audit Logs & Stats ----------

export async function fetchAdminLogs(): Promise<AdminLog[]> {
  const { data, error } = await supabase
    .from("ovbridge_admin_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;
  return (data ?? []) as AdminLog[];
}
