export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      ovbridge_profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          first_name: string | null;
          last_name: string | null;
          phone_number: string | null;
          address: string | null;
          avatar_url: string | null;
          auth_provider: string | null;
          theme_color: string | null;
          accent_color: string | null;
          interface_density: 'compact' | 'normal' | 'comfortable' | null;
          language: string | null;
          admin_role: 'sss_admin' | 'ss_admin' | 's_admin' | 'admin' | 'none';
          is_banned: boolean;
          banned_at: string | null;
          ban_reason: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          phone_number?: string | null;
          address?: string | null;
          avatar_url?: string | null;
          auth_provider?: string | null;
          theme_color?: string | null;
          accent_color?: string | null;
          interface_density?: 'compact' | 'normal' | 'comfortable' | null;
          language?: string | null;
          admin_role?: 'sss_admin' | 'ss_admin' | 's_admin' | 'admin' | 'none';
          is_banned?: boolean;
          banned_at?: string | null;
          ban_reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          phone_number?: string | null;
          address?: string | null;
          avatar_url?: string | null;
          auth_provider?: string | null;
          theme_color?: string | null;
          accent_color?: string | null;
          interface_density?: 'compact' | 'normal' | 'comfortable' | null;
          language?: string | null;
          admin_role?: 'sss_admin' | 'ss_admin' | 's_admin' | 'admin' | 'none';
          is_banned?: boolean;
          banned_at?: string | null;
          ban_reason?: string | null;
          created_at?: string;
        };
      };
      ovbridge_error_logs: {
        Row: {
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
        Insert: {
          id?: string;
          user_id?: string | null;
          device_id?: string | null;
          error_code: string;
          message: string;
          stack?: string | null;
          severity?: 'info' | 'warning' | 'error' | 'critical';
          resolved?: boolean;
          resolved_by?: string | null;
          resolved_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          device_id?: string | null;
          error_code?: string;
          message?: string;
          stack?: string | null;
          severity?: 'info' | 'warning' | 'error' | 'critical';
          resolved?: boolean;
          resolved_by?: string | null;
          resolved_at?: string | null;
          created_at?: string;
        };
      };
      ovbridge_system_rules: {
        Row: {
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
        Insert: {
          id?: string;
          title: string;
          category?: 'general' | 'security' | 'limits' | 'network';
          rule_key: string;
          rule_value: string;
          description?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          category?: 'general' | 'security' | 'limits' | 'network';
          rule_key?: string;
          rule_value?: string;
          description?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      ovbridge_moderation_reports: {
        Row: {
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
        Insert: {
          id?: string;
          reporter_id: string;
          target_type: 'transfer' | 'space' | 'device' | 'user';
          target_id: string;
          reason: string;
          status?: 'pending' | 'reviewed' | 'action_taken' | 'dismissed';
          reviewed_by?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          reporter_id?: string;
          target_type?: 'transfer' | 'space' | 'device' | 'user';
          target_id?: string;
          reason?: string;
          status?: 'pending' | 'reviewed' | 'action_taken' | 'dismissed';
          reviewed_by?: string | null;
          notes?: string | null;
          created_at?: string;
        };
      };
      ovbridge_admin_logs: {
        Row: {
          id: string;
          admin_id: string;
          admin_role: string;
          action: string;
          target_id: string | null;
          details: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id: string;
          admin_role: string;
          action: string;
          target_id?: string | null;
          details?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          admin_id?: string;
          admin_role?: string;
          action?: string;
          target_id?: string | null;
          details?: Json | null;
          created_at?: string;
        };
      };
    };
  };
}
