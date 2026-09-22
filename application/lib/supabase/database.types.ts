// Hand-maintained from the identity and provisioning migrations.
// Provisioning migration remains local pending review and execution approval.
export type AppRole = "platform_owner" | "admin" | "customer";
export type Organisation = { id: string; name: string; created_at: string; updated_at: string };
export type Profile = { id: string; full_name: string; role: AppRole; organisation_id: string | null; created_at: string; updated_at: string };
export type Assignment = { admin_id: string; organisation_id: string; admin_role: "admin"; created_at: string };

export type ApplicationStage = "applied" | "screening" | "interview" | "offer" | "hired" | "rejected";
export type Job = { id: string; organisation_id: string; title: string; description: string | null; created_at: string };
export type Candidate = { id: string; organisation_id: string; full_name: string; email: string | null; phone: string | null; linkedin_url: string | null; created_at: string };
export type Application = { id: string; organisation_id: string; candidate_id: string; job_id: string; stage: ApplicationStage; created_at: string; updated_at: string };

export type Database = {
  public: {
    Tables: {
      jobs: { Row: Job; Insert: Pick<Job, "organisation_id" | "title"> & Partial<Pick<Job, "description">>; Update: never; Relationships: [] };
      candidates: { Row: Candidate; Insert: Pick<Candidate, "organisation_id" | "full_name"> & Partial<Pick<Candidate, "email" | "phone" | "linkedin_url">>; Update: never; Relationships: [] };
      applications: { Row: Application; Insert: Pick<Application, "organisation_id" | "candidate_id" | "job_id">; Update: Pick<Application, "stage">; Relationships: [
        { foreignKeyName: "applications_candidate_fkey"; columns: ["organisation_id", "candidate_id"]; isOneToOne: false; referencedRelation: "candidates"; referencedColumns: ["organisation_id", "id"] },
        { foreignKeyName: "applications_job_fkey"; columns: ["organisation_id", "job_id"]; isOneToOne: false; referencedRelation: "jobs"; referencedColumns: ["organisation_id", "id"] }
      ] };
      organisations: { Row: Organisation; Insert: { id?: string; name: string; created_at?: string; updated_at?: string }; Update: Partial<Organisation>; Relationships: [] };
      profiles: { Row: Profile; Insert: { id: string; full_name: string; role: AppRole; organisation_id?: string | null; created_at?: string; updated_at?: string }; Update: Partial<Profile>; Relationships: [] };
      admin_organisation_assignments: { Row: Assignment; Insert: { admin_id: string; organisation_id: string; admin_role?: "admin"; created_at?: string }; Update: Partial<Assignment>; Relationships: [] };
    };
    Views: { [_ in never]: never };
    Functions: {
      provision_customer_organisation: { Args: { target_auth_user_id: string; organisation_name: string; customer_full_name: string }; Returns: string };
      provision_customer_for_organisation: { Args: { target_auth_user_id: string; organisation_id: string; customer_full_name: string }; Returns: string };
      provision_admin: { Args: { target_auth_user_id: string; admin_full_name: string }; Returns: string };
      assign_admin_to_organisation: { Args: { admin_id: string; organisation_id: string }; Returns: undefined };
      unassign_admin_from_organisation: { Args: { admin_id: string; organisation_id: string }; Returns: undefined };
    };
    Enums: { app_role: AppRole; application_stage: ApplicationStage };
    CompositeTypes: { [_ in never]: never };
  };
};
