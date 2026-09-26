// Hand-maintained from the version-controlled migrations, including Phase 1 public recruitment.
export type AppRole = "platform_owner" | "admin" | "customer";
export type Organisation = { id: string; name: string; careers_slug: string; created_at: string; updated_at: string };
export type Profile = { id: string; full_name: string; role: AppRole; organisation_id: string | null; created_at: string; updated_at: string };
export type Assignment = { admin_id: string; organisation_id: string; admin_role: "admin"; created_at: string };

export type ApplicationStage = "applied" | "screening" | "interview" | "offer" | "hired" | "rejected";
export type JobStatus = "draft" | "published" | "closed" | "archived";
export type ApplicationSource = "manual" | "public";
export type AssessmentStatus = "not_ready" | "pending" | "completed" | "failed" | "stale";
export type Job = { id: string; organisation_id: string; title: string; description: string | null; description_rich: unknown | null; teaser: string | null; status: JobStatus; public_id: string; closes_at: string | null; published_at: string | null; closed_at: string | null; updated_at: string | null; content_version: number; created_at: string };
export type Candidate = { id: string; organisation_id: string; full_name: string; email: string | null; phone: string | null; linkedin_url: string | null; created_at: string };
export type Application = { id: string; organisation_id: string; candidate_id: string; job_id: string; stage: ApplicationStage; source: ApplicationSource; removed_at: string | null; assessment_status: AssessmentStatus; created_at: string; updated_at: string };

export type Database = {
  public: {
    Tables: {
      application_cvs: { Row: { application_id: string; organisation_id: string; job_id: string; normalized_email: string; submitted_full_name: string; submitted_phone: string | null; submitted_linkedin_url: string | null; object_id: string; byte_size: number; storage_path: string; created_at: string }; Insert: never; Update: never; Relationships: [] };
      candidate_assessments: { Row: { application_id: string; organisation_id: string; cv_object_id: string; job_content_version: number; cv_source: "candidate" | "application"; result: unknown; assessed_at: string }; Insert: never; Update: never; Relationships: [] };
      candidate_cvs: { Row: { candidate_id: string; organisation_id: string; object_id: string; storage_path: string; byte_size: number; updated_at: string }; Insert: { candidate_id: string; organisation_id: string; object_id: string; byte_size: number }; Update: { object_id: string; byte_size: number }; Relationships: [] };
      jobs: { Row: Job; Insert: never; Update: never; Relationships: [] };
      candidates: { Row: Candidate; Insert: Pick<Candidate, "organisation_id" | "full_name"> & Partial<Pick<Candidate, "email" | "phone" | "linkedin_url">>; Update: never; Relationships: [] };
      applications: { Row: Application; Insert: Pick<Application, "organisation_id" | "candidate_id" | "job_id">; Update: Partial<Pick<Application, "stage" | "removed_at">>; Relationships: [
        { foreignKeyName: "applications_candidate_fkey"; columns: ["organisation_id", "candidate_id"]; isOneToOne: false; referencedRelation: "candidates"; referencedColumns: ["organisation_id", "id"] },
        { foreignKeyName: "applications_job_fkey"; columns: ["organisation_id", "job_id"]; isOneToOne: false; referencedRelation: "jobs"; referencedColumns: ["organisation_id", "id"] }
      ] };
      organisations: { Row: Organisation; Insert: { id?: string; name: string; created_at?: string; updated_at?: string }; Update: Partial<Organisation>; Relationships: [] };
      profiles: { Row: Profile; Insert: { id: string; full_name: string; role: AppRole; organisation_id?: string | null; created_at?: string; updated_at?: string }; Update: Partial<Profile>; Relationships: [] };
      admin_organisation_assignments: { Row: Assignment; Insert: { admin_id: string; organisation_id: string; admin_role?: "admin"; created_at?: string }; Update: Partial<Assignment>; Relationships: [] };
    };
    Views: { [_ in never]: never };
    Functions: {
      prepare_public_application: { Args: { target_slug: string; target_public_id: string; applicant_email: string; cv_bytes: number }; Returns: unknown };
      complete_public_application: { Args: { upload_id: string; full_name: string; applicant_email: string; phone: string | null; linkedin_url: string | null }; Returns: unknown };
      finish_public_assessment: { Args: { target_application_id: string; target_cv_object_id: string; target_job_content_version: number; validated_result: unknown }; Returns: string };
      read_public_careers: { Args: { target_slug: string; page_offset: number; page_size: number }; Returns: unknown };
      read_public_job: { Args: { target_slug: string; target_public_id: string }; Returns: unknown };
      save_job_content: { Args: { target_organisation_id: string; target_job_id: string | null; job_title: string; job_document: unknown; job_closes_at: string | null; expected_content_version: number | null; draft_only: boolean }; Returns: string };
      transition_job: { Args: { target_organisation_id: string; target_job_id: string; next_status: JobStatus }; Returns: string };
      save_candidate_assessment: { Args: { target_application_id: string; target_cv_object_id: string; target_job_content_version: number; validated_result: unknown }; Returns: string };
      provision_customer_organisation: { Args: { target_auth_user_id: string; organisation_name: string; customer_full_name: string }; Returns: string };
      provision_customer_for_organisation: { Args: { target_auth_user_id: string; organisation_id: string; customer_full_name: string }; Returns: string };
      provision_admin: { Args: { target_auth_user_id: string; admin_full_name: string }; Returns: string };
      assign_admin_to_organisation: { Args: { admin_id: string; organisation_id: string }; Returns: undefined };
      unassign_admin_from_organisation: { Args: { admin_id: string; organisation_id: string }; Returns: undefined };
    };
    Enums: { app_role: AppRole; application_stage: ApplicationStage; job_status: JobStatus; application_source: ApplicationSource; assessment_status: AssessmentStatus };
    CompositeTypes: { [_ in never]: never };
  };
};
