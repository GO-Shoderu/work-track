// Hand-maintained from the unexecuted Milestone 2 migration. Generate against the
// approved project only after migration approval; do not connect during review.
export type AppRole = "platform_owner" | "admin" | "customer";
export type Organisation = { id: string; name: string; created_at: string; updated_at: string };
export type Profile = { id: string; full_name: string; role: AppRole; organisation_id: string | null; created_at: string; updated_at: string };
export type Assignment = { admin_id: string; organisation_id: string; admin_role: "admin"; created_at: string };

export type Database = {
  public: {
    Tables: {
      organisations: { Row: Organisation; Insert: { id?: string; name: string; created_at?: string; updated_at?: string }; Update: Partial<Organisation>; Relationships: [] };
      profiles: { Row: Profile; Insert: { id: string; full_name: string; role: AppRole; organisation_id?: string | null; created_at?: string; updated_at?: string }; Update: Partial<Profile>; Relationships: [] };
      admin_organisation_assignments: { Row: Assignment; Insert: { admin_id: string; organisation_id: string; admin_role?: "admin"; created_at?: string }; Update: Partial<Assignment>; Relationships: [] };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { app_role: AppRole };
    CompositeTypes: { [_ in never]: never };
  };
};
