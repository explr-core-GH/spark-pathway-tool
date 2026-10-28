export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
        }
        Relationships: []
      }
      application_seasons: {
        Row: {
          closes_at: string | null
          created_at: string
          id: string
          is_current: boolean
          name: string
          opens_at: string | null
          program_end: string | null
          program_start: string | null
          retention_days: number
        }
        Insert: {
          closes_at?: string | null
          created_at?: string
          id?: string
          is_current?: boolean
          name: string
          opens_at?: string | null
          program_end?: string | null
          program_start?: string | null
          retention_days?: number
        }
        Update: {
          closes_at?: string | null
          created_at?: string
          id?: string
          is_current?: boolean
          name?: string
          opens_at?: string | null
          program_end?: string | null
          program_start?: string | null
          retention_days?: number
        }
        Relationships: []
      }
      application_status_events: {
        Row: {
          created_at: string
          created_by: string | null
          delivery: Json
          general_id: string
          id: string
          note: string | null
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          delivery?: Json
          general_id: string
          id?: string
          note?: string | null
          status: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          delivery?: Json
          general_id?: string
          id?: string
          note?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_status_events_general_id_fkey"
            columns: ["general_id"]
            isOneToOne: false
            referencedRelation: "hs_general_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      aptitude_results: {
        Row: {
          band: string
          completed_at: string
          id: string
          started_at: string
          student_id: string
          subscale_scores: Json
          total_items: number
          total_score: number
        }
        Insert: {
          band: string
          completed_at?: string
          id?: string
          started_at?: string
          student_id: string
          subscale_scores: Json
          total_items: number
          total_score: number
        }
        Update: {
          band?: string
          completed_at?: string
          id?: string
          started_at?: string
          student_id?: string
          subscale_scores?: Json
          total_items?: number
          total_score?: number
        }
        Relationships: []
      }
      assessment_assignments: {
        Row: {
          assessment_kind: Database["public"]["Enums"]["assessment_kind"]
          assigned_at: string
          assigned_by: string | null
          due_at: string | null
          id: string
          notes: string | null
          program_id: string | null
          program_type: Database["public"]["Enums"]["program_type"] | null
        }
        Insert: {
          assessment_kind: Database["public"]["Enums"]["assessment_kind"]
          assigned_at?: string
          assigned_by?: string | null
          due_at?: string | null
          id?: string
          notes?: string | null
          program_id?: string | null
          program_type?: Database["public"]["Enums"]["program_type"] | null
        }
        Update: {
          assessment_kind?: Database["public"]["Enums"]["assessment_kind"]
          assigned_at?: string
          assigned_by?: string | null
          due_at?: string | null
          id?: string
          notes?: string | null
          program_id?: string | null
          program_type?: Database["public"]["Enums"]["program_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_assignments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_item_photos: {
        Row: {
          item_id: string
          updated_at: string
          updated_by: string | null
          url: string
        }
        Insert: {
          item_id: string
          updated_at?: string
          updated_by?: string | null
          url: string
        }
        Update: {
          item_id?: string
          updated_at?: string
          updated_by?: string | null
          url?: string
        }
        Relationships: []
      }
      assessment_responses: {
        Row: {
          created_at: string
          is_practice: boolean
          item_id: string
          response_id: string
          response_time_ms: number
          response_value: Json
          session_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          is_practice?: boolean
          item_id: string
          response_id?: string
          response_time_ms: number
          response_value: Json
          session_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          is_practice?: boolean
          item_id?: string
          response_id?: string
          response_time_ms?: number
          response_value?: Json
          session_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "assessment_sessions"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "assessment_responses_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          current_index: number
          flag_inattentive: boolean | null
          flag_speeding: boolean | null
          flag_uniform: boolean | null
          form_version: string
          grade_at_session: number
          holland_code: string | null
          item_sequence: Json
          items_answered: number
          scale_scores: Json | null
          session_id: string
          started_at: string
          student_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_index?: number
          flag_inattentive?: boolean | null
          flag_speeding?: boolean | null
          flag_uniform?: boolean | null
          form_version: string
          grade_at_session: number
          holland_code?: string | null
          item_sequence: Json
          items_answered?: number
          scale_scores?: Json | null
          session_id?: string
          started_at?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_index?: number
          flag_inattentive?: boolean | null
          flag_speeding?: boolean | null
          flag_uniform?: boolean | null
          form_version?: string
          grade_at_session?: number
          holland_code?: string | null
          item_sequence?: Json
          items_answered?: number
          scale_scores?: Json | null
          session_id?: string
          started_at?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_targets: {
        Row: {
          assessment_kind: string
          assigned_by: string | null
          available_from: string | null
          available_until: string | null
          created_at: string
          due_at: string | null
          id: string
          notes: string | null
          survey_assignment_id: string | null
          target_id: string
          target_slug: string | null
          target_type: string
        }
        Insert: {
          assessment_kind: string
          assigned_by?: string | null
          available_from?: string | null
          available_until?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          notes?: string | null
          survey_assignment_id?: string | null
          target_id: string
          target_slug?: string | null
          target_type: string
        }
        Update: {
          assessment_kind?: string
          assigned_by?: string | null
          available_from?: string | null
          available_until?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          notes?: string | null
          survey_assignment_id?: string | null
          target_id?: string
          target_slug?: string | null
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_targets_survey_assignment_id_fkey"
            columns: ["survey_assignment_id"]
            isOneToOne: false
            referencedRelation: "survey_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      attestation_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          email_error: string | null
          experience_id: string
          expires_at: string
          id: string
          opened_at: string | null
          sent_at: string | null
          status: string
          student_id: string
          supervisor_email: string
          supervisor_name: string
          token_hash: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          email_error?: string | null
          experience_id: string
          expires_at?: string
          id?: string
          opened_at?: string | null
          sent_at?: string | null
          status?: string
          student_id: string
          supervisor_email: string
          supervisor_name: string
          token_hash: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          email_error?: string | null
          experience_id?: string
          expires_at?: string
          id?: string
          opened_at?: string | null
          sent_at?: string | null
          status?: string
          student_id?: string
          supervisor_email?: string
          supervisor_name?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "attestation_requests_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attestation_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      camp_educators: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          camp_slug: string
          educator_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          camp_slug: string
          educator_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          camp_slug?: string
          educator_id?: string
        }
        Relationships: []
      }
      camp_student_logins: {
        Row: {
          child_name: string
          explr_camp_id: string | null
          explr_registration_id: string | null
          generated_at: string
          generated_by: string | null
          id: string
          password_plain: string
          student_id: string | null
          username: string
        }
        Insert: {
          child_name: string
          explr_camp_id?: string | null
          explr_registration_id?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          password_plain: string
          student_id?: string | null
          username: string
        }
        Update: {
          child_name?: string
          explr_camp_id?: string | null
          explr_registration_id?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          password_plain?: string
          student_id?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "camp_student_logins_explr_camp_id_fkey"
            columns: ["explr_camp_id"]
            isOneToOne: false
            referencedRelation: "explr_camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camp_student_logins_explr_registration_id_fkey"
            columns: ["explr_registration_id"]
            isOneToOne: true
            referencedRelation: "explr_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camp_student_logins_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      camps: {
        Row: {
          age_range: string
          created_at: string
          days: Json
          duration: string
          emoji: string
          name: string
          overview: string
          resources: Json
          slides: string | null
          slug: string
          sort_order: number
          tagline: string
          updated_at: string
          visible: boolean
        }
        Insert: {
          age_range?: string
          created_at?: string
          days?: Json
          duration?: string
          emoji?: string
          name: string
          overview?: string
          resources?: Json
          slides?: string | null
          slug: string
          sort_order?: number
          tagline?: string
          updated_at?: string
          visible?: boolean
        }
        Update: {
          age_range?: string
          created_at?: string
          days?: Json
          duration?: string
          emoji?: string
          name?: string
          overview?: string
          resources?: Json
          slides?: string | null
          slug?: string
          sort_order?: number
          tagline?: string
          updated_at?: string
          visible?: boolean
        }
        Relationships: []
      }
      career_clusters: {
        Row: {
          description: string
          id: string
          label: string
          sort_order: number
        }
        Insert: {
          description?: string
          id: string
          label: string
          sort_order?: number
        }
        Update: {
          description?: string
          id?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      career_goals: {
        Row: {
          changed_since_last: boolean | null
          checkpoint_id: string | null
          cluster: string | null
          created_at: string
          grade: number | null
          id: string
          post_hs_plan: string | null
          primary_goal: string
          secondary_goal: string | null
          student_id: string
          why: string | null
        }
        Insert: {
          changed_since_last?: boolean | null
          checkpoint_id?: string | null
          cluster?: string | null
          created_at?: string
          grade?: number | null
          id?: string
          post_hs_plan?: string | null
          primary_goal: string
          secondary_goal?: string | null
          student_id: string
          why?: string | null
        }
        Update: {
          changed_since_last?: boolean | null
          checkpoint_id?: string | null
          cluster?: string | null
          created_at?: string
          grade?: number | null
          id?: string
          post_hs_plan?: string | null
          primary_goal?: string
          secondary_goal?: string | null
          student_id?: string
          why?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "career_goals_checkpoint_id_fkey"
            columns: ["checkpoint_id"]
            isOneToOne: false
            referencedRelation: "checkpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "career_goals_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_items: {
        Row: {
          auto: boolean
          checked_at: string | null
          comment: string | null
          id: string
          item_no: number
          school_year: string
          student_id: string
        }
        Insert: {
          auto?: boolean
          checked_at?: string | null
          comment?: string | null
          id?: string
          item_no: number
          school_year: string
          student_id: string
        }
        Update: {
          auto?: boolean
          checked_at?: string | null
          comment?: string | null
          id?: string
          item_no?: number
          school_year?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      checkpoint_tasks: {
        Row: {
          checkpoint_id: string
          completed_at: string | null
          id: string
          payload: Json | null
          required: boolean
          status: string
          task_key: string
          updated_at: string
          waived_by: string | null
          waived_reason: string | null
        }
        Insert: {
          checkpoint_id: string
          completed_at?: string | null
          id?: string
          payload?: Json | null
          required?: boolean
          status?: string
          task_key: string
          updated_at?: string
          waived_by?: string | null
          waived_reason?: string | null
        }
        Update: {
          checkpoint_id?: string
          completed_at?: string | null
          id?: string
          payload?: Json | null
          required?: boolean
          status?: string
          task_key?: string
          updated_at?: string
          waived_by?: string | null
          waived_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkpoint_tasks_checkpoint_id_fkey"
            columns: ["checkpoint_id"]
            isOneToOne: false
            referencedRelation: "checkpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      checkpoints: {
        Row: {
          advisor_notes: string | null
          created_at: string
          grade: number
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          school_year: string
          status: string
          student_id: string
          submitted_at: string | null
          term: string
        }
        Insert: {
          advisor_notes?: string | null
          created_at?: string
          grade: number
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_year: string
          status?: string
          student_id: string
          submitted_at?: string | null
          term: string
        }
        Update: {
          advisor_notes?: string | null
          created_at?: string
          grade?: number
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_year?: string
          status?: string
          student_id?: string
          submitted_at?: string | null
          term?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkpoints_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      class_students: {
        Row: {
          added_at: string
          class_id: string
          id: string
          student_id: string
        }
        Insert: {
          added_at?: string
          class_id: string
          id?: string
          student_id: string
        }
        Update: {
          added_at?: string
          class_id?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string
          created_by: string | null
          educator_id: string | null
          grade: number | null
          id: string
          join_code: string | null
          name: string
          period: string | null
          school_irn: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          educator_id?: string | null
          grade?: number | null
          id?: string
          join_code?: string | null
          name: string
          period?: string | null
          school_irn?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          educator_id?: string | null
          grade?: number | null
          id?: string
          join_code?: string | null
          name?: string
          period?: string | null
          school_irn?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_educator_id_fkey"
            columns: ["educator_id"]
            isOneToOne: false
            referencedRelation: "educators"
            referencedColumns: ["id"]
          },
        ]
      }
      credentials: {
        Row: {
          created_at: string
          credits: number | null
          evidence_url: string | null
          id: string
          issued_at: string | null
          issuer: string | null
          student_id: string
          title: string
          type: string
          verification_method: string
        }
        Insert: {
          created_at?: string
          credits?: number | null
          evidence_url?: string | null
          id?: string
          issued_at?: string | null
          issuer?: string | null
          student_id: string
          title: string
          type: string
          verification_method?: string
        }
        Update: {
          created_at?: string
          credits?: number | null
          evidence_url?: string | null
          id?: string
          issued_at?: string | null
          issuer?: string | null
          student_id?: string
          title?: string
          type?: string
          verification_method?: string
        }
        Relationships: [
          {
            foreignKeyName: "credentials_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_tags: {
        Row: {
          camp_slug: string
          program_type: Database["public"]["Enums"]["program_type"]
          tagged_at: string
          tagged_by: string | null
        }
        Insert: {
          camp_slug: string
          program_type: Database["public"]["Enums"]["program_type"]
          tagged_at?: string
          tagged_by?: string | null
        }
        Update: {
          camp_slug?: string
          program_type?: Database["public"]["Enums"]["program_type"]
          tagged_at?: string
          tagged_by?: string | null
        }
        Relationships: []
      }
      educator_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          email: string
          expires_at: string
          id: string
          invited_at: string
          invited_by: string | null
          organization: string | null
          program_type: Database["public"]["Enums"]["program_type"] | null
          role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          email: string
          expires_at?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          organization?: string | null
          program_type?: Database["public"]["Enums"]["program_type"] | null
          role?: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          organization?: string | null
          program_type?: Database["public"]["Enums"]["program_type"] | null
          role?: string
          token?: string
        }
        Relationships: []
      }
      educators: {
        Row: {
          approved: boolean
          created_at: string
          email: string
          full_name: string
          grade_levels: number[] | null
          id: string
          organization: string | null
          program_type: Database["public"]["Enums"]["program_type"] | null
          role: Database["public"]["Enums"]["educator_role"]
          school_irn: string | null
          school_name: string | null
          student_count: number | null
        }
        Insert: {
          approved?: boolean
          created_at?: string
          email: string
          full_name: string
          grade_levels?: number[] | null
          id: string
          organization?: string | null
          program_type?: Database["public"]["Enums"]["program_type"] | null
          role?: Database["public"]["Enums"]["educator_role"]
          school_irn?: string | null
          school_name?: string | null
          student_count?: number | null
        }
        Update: {
          approved?: boolean
          created_at?: string
          email?: string
          full_name?: string
          grade_levels?: number[] | null
          id?: string
          organization?: string | null
          program_type?: Database["public"]["Enums"]["program_type"] | null
          role?: Database["public"]["Enums"]["educator_role"]
          school_irn?: string | null
          school_name?: string | null
          student_count?: number | null
        }
        Relationships: []
      }
      experience_ratings: {
        Row: {
          comment: string | null
          competency: string
          experience_id: string
          id: string
          omj_skill: string | null
          rated_at: string
          rater_email: string | null
          rater_name: string
          rating_baseline: number | null
          rating_final: number
          setting: string
        }
        Insert: {
          comment?: string | null
          competency: string
          experience_id: string
          id?: string
          omj_skill?: string | null
          rated_at?: string
          rater_email?: string | null
          rater_name: string
          rating_baseline?: number | null
          rating_final: number
          setting: string
        }
        Update: {
          comment?: string | null
          competency?: string
          experience_id?: string
          id?: string
          omj_skill?: string | null
          rated_at?: string
          rater_email?: string | null
          rater_name?: string
          rating_baseline?: number | null
          rating_final?: number
          setting?: string
        }
        Relationships: [
          {
            foreignKeyName: "experience_ratings_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
        ]
      }
      experiences: {
        Row: {
          attestation: Json | null
          career_cluster: string | null
          compensation_type: string | null
          created_at: string
          duties: string | null
          end_date: string | null
          experience_type: string
          explr_camp_id: string | null
          hours: number | null
          id: string
          internship_slug: string | null
          opportunity_id: string | null
          organization: string | null
          reflection: string | null
          riasec_module: string | null
          role_title: string | null
          source: string
          stage: string
          start_date: string | null
          status: string
          student_id: string
          supervisor_email: string | null
          supervisor_name: string | null
          title: string
          updated_at: string
          verified_at: string | null
          verified_hours: number | null
        }
        Insert: {
          attestation?: Json | null
          career_cluster?: string | null
          compensation_type?: string | null
          created_at?: string
          duties?: string | null
          end_date?: string | null
          experience_type: string
          explr_camp_id?: string | null
          hours?: number | null
          id?: string
          internship_slug?: string | null
          opportunity_id?: string | null
          organization?: string | null
          reflection?: string | null
          riasec_module?: string | null
          role_title?: string | null
          source?: string
          stage: string
          start_date?: string | null
          status?: string
          student_id: string
          supervisor_email?: string | null
          supervisor_name?: string | null
          title: string
          updated_at?: string
          verified_at?: string | null
          verified_hours?: number | null
        }
        Update: {
          attestation?: Json | null
          career_cluster?: string | null
          compensation_type?: string | null
          created_at?: string
          duties?: string | null
          end_date?: string | null
          experience_type?: string
          explr_camp_id?: string | null
          hours?: number | null
          id?: string
          internship_slug?: string | null
          opportunity_id?: string | null
          organization?: string | null
          reflection?: string | null
          riasec_module?: string | null
          role_title?: string | null
          source?: string
          stage?: string
          start_date?: string | null
          status?: string
          student_id?: string
          supervisor_email?: string | null
          supervisor_name?: string | null
          title?: string
          updated_at?: string
          verified_at?: string | null
          verified_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "experiences_explr_camp_id_fkey"
            columns: ["explr_camp_id"]
            isOneToOne: false
            referencedRelation: "explr_camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experiences_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experiences_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      explore_logins: {
        Row: {
          avatar_color: string
          avatar_shape: string
          created_at: string
          created_by: string | null
          failed_attempts: number
          id: string
          last_signed_in_at: string | null
          locked_until: string | null
          rotated_at: string
          secret_hash: string
          student_id: string
          token_hash: string
        }
        Insert: {
          avatar_color: string
          avatar_shape: string
          created_at?: string
          created_by?: string | null
          failed_attempts?: number
          id?: string
          last_signed_in_at?: string | null
          locked_until?: string | null
          rotated_at?: string
          secret_hash: string
          student_id: string
          token_hash: string
        }
        Update: {
          avatar_color?: string
          avatar_shape?: string
          created_at?: string
          created_by?: string | null
          failed_attempts?: number
          id?: string
          last_signed_in_at?: string | null
          locked_until?: string | null
          rotated_at?: string
          secret_hash?: string
          student_id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "explore_logins_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      explr_camp_curriculum_links: {
        Row: {
          camp_slug: string
          explr_camp_id: string
          linked_at: string
          linked_by: string | null
        }
        Insert: {
          camp_slug: string
          explr_camp_id: string
          linked_at?: string
          linked_by?: string | null
        }
        Update: {
          camp_slug?: string
          explr_camp_id?: string
          linked_at?: string
          linked_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "explr_camp_curriculum_links_camp_slug_fkey"
            columns: ["camp_slug"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "explr_camp_curriculum_links_explr_camp_id_fkey"
            columns: ["explr_camp_id"]
            isOneToOne: false
            referencedRelation: "explr_camps"
            referencedColumns: ["id"]
          },
        ]
      }
      explr_camp_educators: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          educator_id: string
          explr_camp_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          educator_id: string
          explr_camp_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          educator_id?: string
          explr_camp_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "explr_camp_educators_explr_camp_id_fkey"
            columns: ["explr_camp_id"]
            isOneToOne: false
            referencedRelation: "explr_camps"
            referencedColumns: ["id"]
          },
        ]
      }
      explr_camps: {
        Row: {
          age_range: string | null
          capacity: number | null
          category: string | null
          date: string | null
          description: string | null
          end_date: string | null
          id: string
          image: string | null
          imported_at: string
          join_code: string | null
          linked_camp_slug: string | null
          location: string | null
          source_updated_at: string | null
          time: string | null
          title: string
        }
        Insert: {
          age_range?: string | null
          capacity?: number | null
          category?: string | null
          date?: string | null
          description?: string | null
          end_date?: string | null
          id: string
          image?: string | null
          imported_at?: string
          join_code?: string | null
          linked_camp_slug?: string | null
          location?: string | null
          source_updated_at?: string | null
          time?: string | null
          title: string
        }
        Update: {
          age_range?: string | null
          capacity?: number | null
          category?: string | null
          date?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          image?: string | null
          imported_at?: string
          join_code?: string | null
          linked_camp_slug?: string | null
          location?: string | null
          source_updated_at?: string | null
          time?: string | null
          title?: string
        }
        Relationships: []
      }
      explr_registrations: {
        Row: {
          camp_id: string
          child_age: number | null
          child_name: string
          id: string
          imported_at: string
          parent_email: string | null
          parent_name: string | null
          parent_phone: string | null
          source_created_at: string | null
          status: string | null
        }
        Insert: {
          camp_id: string
          child_age?: number | null
          child_name: string
          id: string
          imported_at?: string
          parent_email?: string | null
          parent_name?: string | null
          parent_phone?: string | null
          source_created_at?: string | null
          status?: string | null
        }
        Update: {
          camp_id?: string
          child_age?: number | null
          child_name?: string
          id?: string
          imported_at?: string
          parent_email?: string | null
          parent_name?: string | null
          parent_phone?: string | null
          source_created_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "explr_registrations_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "explr_camps"
            referencedColumns: ["id"]
          },
        ]
      }
      family_links: {
        Row: {
          code_hash: string
          created_at: string
          expires_at: string
          id: string
          label: string | null
          last_used_at: string | null
          revoked_at: string | null
          student_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string
          expires_at?: string
          id?: string
          label?: string | null
          last_used_at?: string | null
          revoked_at?: string | null
          student_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string
          expires_at?: string
          id?: string
          label?: string | null
          last_used_at?: string | null
          revoked_at?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_links_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      family_sessions: {
        Row: {
          created_at: string
          expires_at: string
          family_link_id: string
          id: string
          last_seen_at: string | null
          token_hash: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          family_link_id: string
          id?: string
          last_seen_at?: string | null
          token_hash: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          family_link_id?: string
          id?: string
          last_seen_at?: string | null
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_sessions_family_link_id_fkey"
            columns: ["family_link_id"]
            isOneToOne: false
            referencedRelation: "family_links"
            referencedColumns: ["id"]
          },
        ]
      }
      form_completions: {
        Row: {
          completed_file_url: string | null
          created_at: string
          form_id: string
          id: string
          signed_at: string | null
          signed_name: string | null
          student_id: string
        }
        Insert: {
          completed_file_url?: string | null
          created_at?: string
          form_id: string
          id?: string
          signed_at?: string | null
          signed_name?: string | null
          student_id: string
        }
        Update: {
          completed_file_url?: string | null
          created_at?: string
          form_id?: string
          id?: string
          signed_at?: string | null
          signed_name?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_completions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "opportunity_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_completions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      hs_demographics: {
        Row: {
          application_id: string
          data: Json
          student_id: string
          updated_at: string
        }
        Insert: {
          application_id: string
          data?: Json
          student_id: string
          updated_at?: string
        }
        Update: {
          application_id?: string
          data?: Json
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hs_demographics_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "hs_general_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hs_demographics_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      hs_general_applications: {
        Row: {
          assessment_session_id: string | null
          choices: Json
          core: Json
          created_at: string
          extras: Json
          id: string
          missing_note: string | null
          placed_opportunity_id: string | null
          pseudo_id: string | null
          season_id: string
          staff_notes: string | null
          status: string
          step: number
          student_id: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          assessment_session_id?: string | null
          choices?: Json
          core?: Json
          created_at?: string
          extras?: Json
          id?: string
          missing_note?: string | null
          placed_opportunity_id?: string | null
          pseudo_id?: string | null
          season_id: string
          staff_notes?: string | null
          status?: string
          step?: number
          student_id: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          assessment_session_id?: string | null
          choices?: Json
          core?: Json
          created_at?: string
          extras?: Json
          id?: string
          missing_note?: string | null
          placed_opportunity_id?: string | null
          pseudo_id?: string | null
          season_id?: string
          staff_notes?: string | null
          status?: string
          step?: number
          student_id?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hs_general_applications_assessment_session_id_fkey"
            columns: ["assessment_session_id"]
            isOneToOne: false
            referencedRelation: "assessment_sessions"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "hs_general_applications_placed_opportunity_id_fkey"
            columns: ["placed_opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hs_general_applications_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "application_seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hs_general_applications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      hs_partner_applications: {
        Row: {
          answers: Json
          cleared_help: string[]
          created_at: string
          general_id: string
          id: string
          opportunity_id: string
          question_notes: Json
          requirements: Json
          status: string
          student_id: string
          submitted_at: string | null
          updated_at: string
          version_id: string | null
        }
        Insert: {
          answers?: Json
          cleared_help?: string[]
          created_at?: string
          general_id: string
          id?: string
          opportunity_id: string
          question_notes?: Json
          requirements?: Json
          status?: string
          student_id: string
          submitted_at?: string | null
          updated_at?: string
          version_id?: string | null
        }
        Update: {
          answers?: Json
          cleared_help?: string[]
          created_at?: string
          general_id?: string
          id?: string
          opportunity_id?: string
          question_notes?: Json
          requirements?: Json
          status?: string
          student_id?: string
          submitted_at?: string | null
          updated_at?: string
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hs_partner_applications_general_id_fkey"
            columns: ["general_id"]
            isOneToOne: false
            referencedRelation: "hs_general_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hs_partner_applications_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hs_partner_applications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hs_partner_applications_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "opp_application_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      internship_applications: {
        Row: {
          decided_at: string | null
          id: string
          responses: Json
          riasec_snapshot: Json | null
          selected_internship_ids: string[]
          staff_notes: string | null
          status: string
          student_id: string
          submission_term: string
          submitted_at: string
        }
        Insert: {
          decided_at?: string | null
          id?: string
          responses: Json
          riasec_snapshot?: Json | null
          selected_internship_ids: string[]
          staff_notes?: string | null
          status?: string
          student_id: string
          submission_term?: string
          submitted_at?: string
        }
        Update: {
          decided_at?: string | null
          id?: string
          responses?: Json
          riasec_snapshot?: Json | null
          selected_internship_ids?: string[]
          staff_notes?: string | null
          status?: string
          student_id?: string
          submission_term?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "internship_applications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      internship_career_tags: {
        Row: {
          career_sector: string
          internship_slug: string
          tagged_at: string
          tagged_by: string | null
        }
        Insert: {
          career_sector: string
          internship_slug: string
          tagged_at?: string
          tagged_by?: string | null
        }
        Update: {
          career_sector?: string
          internship_slug?: string
          tagged_at?: string
          tagged_by?: string | null
        }
        Relationships: []
      }
      internship_educators: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          educator_id: string
          internship_slug: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          educator_id: string
          internship_slug: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          educator_id?: string
          internship_slug?: string
        }
        Relationships: []
      }
      internship_evaluations: {
        Row: {
          created_at: string
          evaluator_id: string
          id: string
          internship_ref: string
          notes: string | null
          recommend: boolean
          rubric: Json
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          evaluator_id: string
          id?: string
          internship_ref: string
          notes?: string | null
          recommend?: boolean
          rubric?: Json
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          evaluator_id?: string
          id?: string
          internship_ref?: string
          notes?: string | null
          recommend?: boolean
          rubric?: Json
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "internship_evaluations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      internship_interest_completions: {
        Row: {
          completed_at: string
          student_id: string
        }
        Insert: {
          completed_at?: string
          student_id: string
        }
        Update: {
          completed_at?: string
          student_id?: string
        }
        Relationships: []
      }
      internship_interest_responses: {
        Row: {
          internship_slug: string
          responded_at: string
          response: string
          student_id: string
        }
        Insert: {
          internship_slug: string
          responded_at?: string
          response: string
          student_id: string
        }
        Update: {
          internship_slug?: string
          responded_at?: string
          response?: string
          student_id?: string
        }
        Relationships: []
      }
      internship_occupations: {
        Row: {
          internship_slug: string
          occupation_id: string
          tagged_at: string
          tagged_by: string | null
        }
        Insert: {
          internship_slug: string
          occupation_id: string
          tagged_at?: string
          tagged_by?: string | null
        }
        Update: {
          internship_slug?: string
          occupation_id?: string
          tagged_at?: string
          tagged_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "internship_occupations_occupation_id_fkey"
            columns: ["occupation_id"]
            isOneToOne: false
            referencedRelation: "occupations"
            referencedColumns: ["id"]
          },
        ]
      }
      internship_placements: {
        Row: {
          application_id: string | null
          approved_at: string
          approved_by: string | null
          approved_internship_id: string
          hs_general_id: string | null
          id: string
          staff_notes: string | null
          student_id: string
        }
        Insert: {
          application_id?: string | null
          approved_at?: string
          approved_by?: string | null
          approved_internship_id: string
          hs_general_id?: string | null
          id?: string
          staff_notes?: string | null
          student_id: string
        }
        Update: {
          application_id?: string | null
          approved_at?: string
          approved_by?: string | null
          approved_internship_id?: string
          hs_general_id?: string | null
          id?: string
          staff_notes?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "internship_placements_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "internship_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internship_placements_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internship_placements_hs_general_id_fkey"
            columns: ["hs_general_id"]
            isOneToOne: false
            referencedRelation: "hs_general_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internship_placements_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      internship_profiles: {
        Row: {
          availability: Json
          career_aspiration: string | null
          coursework: Json
          demographics: Json
          dislikes: string | null
          grad_year: number | null
          high_school: string | null
          intended_college: string | null
          intended_major: string | null
          likes: string | null
          student_id: string
          transportation: string | null
          updated_at: string
          work_authorization: boolean | null
        }
        Insert: {
          availability?: Json
          career_aspiration?: string | null
          coursework?: Json
          demographics?: Json
          dislikes?: string | null
          grad_year?: number | null
          high_school?: string | null
          intended_college?: string | null
          intended_major?: string | null
          likes?: string | null
          student_id: string
          transportation?: string | null
          updated_at?: string
          work_authorization?: boolean | null
        }
        Update: {
          availability?: Json
          career_aspiration?: string | null
          coursework?: Json
          demographics?: Json
          dislikes?: string | null
          grad_year?: number | null
          high_school?: string | null
          intended_college?: string | null
          intended_major?: string | null
          likes?: string | null
          student_id?: string
          transportation?: string | null
          updated_at?: string
          work_authorization?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "internship_profiles_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      internship_rosters: {
        Row: {
          id: string
          imported_at: string
          imported_by: string | null
          internship_slug: string
          student_name: string
        }
        Insert: {
          id?: string
          imported_at?: string
          imported_by?: string | null
          internship_slug: string
          student_name: string
        }
        Update: {
          id?: string
          imported_at?: string
          imported_by?: string | null
          internship_slug?: string
          student_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "internship_rosters_internship_slug_fkey"
            columns: ["internship_slug"]
            isOneToOne: false
            referencedRelation: "internships"
            referencedColumns: ["slug"]
          },
        ]
      }
      internship_selections: {
        Row: {
          acknowledgments: string[]
          answers: Json
          decided_at: string | null
          decided_notes: string | null
          hard_fail: string[]
          id: string
          internship_ref: string
          link_proofs: Json
          match_breakdown: Json | null
          match_computed_at: string | null
          match_score: number | null
          opportunity_id: string | null
          rank: number | null
          requested_at: string
          status: string
          student_id: string
          submitted_at: string | null
        }
        Insert: {
          acknowledgments?: string[]
          answers?: Json
          decided_at?: string | null
          decided_notes?: string | null
          hard_fail?: string[]
          id?: string
          internship_ref: string
          link_proofs?: Json
          match_breakdown?: Json | null
          match_computed_at?: string | null
          match_score?: number | null
          opportunity_id?: string | null
          rank?: number | null
          requested_at?: string
          status?: string
          student_id: string
          submitted_at?: string | null
        }
        Update: {
          acknowledgments?: string[]
          answers?: Json
          decided_at?: string | null
          decided_notes?: string | null
          hard_fail?: string[]
          id?: string
          internship_ref?: string
          link_proofs?: Json
          match_breakdown?: Json | null
          match_computed_at?: string | null
          match_score?: number | null
          opportunity_id?: string | null
          rank?: number | null
          requested_at?: string
          status?: string
          student_id?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "internship_selections_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internship_selections_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      internship_student_logins: {
        Row: {
          child_name: string
          generated_at: string
          generated_by: string | null
          id: string
          internship_slug: string
          password_plain: string
          roster_id: string | null
          student_id: string | null
          username: string
        }
        Insert: {
          child_name: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          internship_slug: string
          password_plain: string
          roster_id?: string | null
          student_id?: string | null
          username: string
        }
        Update: {
          child_name?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          internship_slug?: string
          password_plain?: string
          roster_id?: string | null
          student_id?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "internship_student_logins_internship_slug_fkey"
            columns: ["internship_slug"]
            isOneToOne: false
            referencedRelation: "internships"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "internship_student_logins_roster_id_fkey"
            columns: ["roster_id"]
            isOneToOne: true
            referencedRelation: "internship_rosters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internship_student_logins_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      internship_survey_results: {
        Row: {
          activity_tags: string[]
          completed_at: string | null
          env_vector: Json | null
          experience: Json | null
          holland_code: string | null
          matches: Json | null
          responses: Json
          riasec_norm: Json | null
          riasec_raw: Json | null
          sector_values: Json | null
          student_id: string
          updated_at: string
        }
        Insert: {
          activity_tags?: string[]
          completed_at?: string | null
          env_vector?: Json | null
          experience?: Json | null
          holland_code?: string | null
          matches?: Json | null
          responses?: Json
          riasec_norm?: Json | null
          riasec_raw?: Json | null
          sector_values?: Json | null
          student_id: string
          updated_at?: string
        }
        Update: {
          activity_tags?: string[]
          completed_at?: string | null
          env_vector?: Json | null
          experience?: Json | null
          holland_code?: string | null
          matches?: Json | null
          responses?: Json
          riasec_norm?: Json | null
          riasec_raw?: Json | null
          sector_values?: Json | null
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      internship_tags: {
        Row: {
          internship_slug: string
          program_type: Database["public"]["Enums"]["program_type"]
          tagged_at: string
          tagged_by: string | null
        }
        Insert: {
          internship_slug: string
          program_type: Database["public"]["Enums"]["program_type"]
          tagged_at?: string
          tagged_by?: string | null
        }
        Update: {
          internship_slug?: string
          program_type?: Database["public"]["Enums"]["program_type"]
          tagged_at?: string
          tagged_by?: string | null
        }
        Relationships: []
      }
      internship_visibility: {
        Row: {
          internship_slug: string
          updated_at: string
          updated_by: string | null
          visible: boolean
        }
        Insert: {
          internship_slug: string
          updated_at?: string
          updated_by?: string | null
          visible?: boolean
        }
        Update: {
          internship_slug?: string
          updated_at?: string
          updated_by?: string | null
          visible?: boolean
        }
        Relationships: []
      }
      internships: {
        Row: {
          created_at: string
          deliverables: string
          emoji: string
          external_url: string
          lead: string | null
          name: string
          outside_partners: string
          riasec: string[]
          slug: string
          sort_order: number
          theme: string
          updated_at: string
          visible: boolean
        }
        Insert: {
          created_at?: string
          deliverables?: string
          emoji?: string
          external_url?: string
          lead?: string | null
          name: string
          outside_partners?: string
          riasec?: string[]
          slug: string
          sort_order?: number
          theme?: string
          updated_at?: string
          visible?: boolean
        }
        Update: {
          created_at?: string
          deliverables?: string
          emoji?: string
          external_url?: string
          lead?: string | null
          name?: string
          outside_partners?: string
          riasec?: string[]
          slug?: string
          sort_order?: number
          theme?: string
          updated_at?: string
          visible?: boolean
        }
        Relationships: []
      }
      module_progress: {
        Row: {
          completed_at: string | null
          module_id: string
          started_at: string | null
          status: string
          student_id: string
        }
        Insert: {
          completed_at?: string | null
          module_id: string
          started_at?: string | null
          status?: string
          student_id: string
        }
        Update: {
          completed_at?: string | null
          module_id?: string
          started_at?: string | null
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      occupation_programs: {
        Row: {
          credential: string | null
          id: string
          occupation_id: string
          program_name: string
          school: string
          sort_order: number
          url: string | null
        }
        Insert: {
          credential?: string | null
          id?: string
          occupation_id: string
          program_name: string
          school: string
          sort_order?: number
          url?: string | null
        }
        Update: {
          credential?: string | null
          id?: string
          occupation_id?: string
          program_name?: string
          school?: string
          sort_order?: number
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "occupation_programs_occupation_id_fkey"
            columns: ["occupation_id"]
            isOneToOne: false
            referencedRelation: "occupations"
            referencedColumns: ["id"]
          },
        ]
      }
      occupations: {
        Row: {
          annual_openings: number | null
          cluster_id: string
          created_at: string
          description: string
          education: string | null
          growth_pct: number | null
          id: string
          median_wage: number | null
          soc_code: string | null
          sort_order: number
          title: string
        }
        Insert: {
          annual_openings?: number | null
          cluster_id: string
          created_at?: string
          description?: string
          education?: string | null
          growth_pct?: number | null
          id?: string
          median_wage?: number | null
          soc_code?: string | null
          sort_order?: number
          title: string
        }
        Update: {
          annual_openings?: number | null
          cluster_id?: string
          created_at?: string
          description?: string
          education?: string | null
          growth_pct?: number | null
          id?: string
          median_wage?: number | null
          soc_code?: string | null
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "occupations_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "career_clusters"
            referencedColumns: ["id"]
          },
        ]
      }
      opp_application_versions: {
        Row: {
          builder: Json
          id: string
          locked_at: string | null
          opportunity_id: string
          published_at: string
          published_by: string | null
          version: number
        }
        Insert: {
          builder: Json
          id?: string
          locked_at?: string | null
          opportunity_id: string
          published_at?: string
          published_by?: string | null
          version: number
        }
        Update: {
          builder?: Json
          id?: string
          locked_at?: string | null
          opportunity_id?: string
          published_at?: string
          published_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "opp_application_versions_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          application_builder: Json | null
          application_links: Json
          application_version_id: string | null
          capacity: number | null
          cost_cents: number | null
          created_at: string
          custom: Json
          decided_at: string | null
          description: string | null
          end_date: string | null
          experience_type: string | null
          external_url: string | null
          gate_evidence: Json | null
          gate_reviewed_at: string | null
          gate_reviewed_by: string | null
          gate_status: string
          grade_max: number | null
          grade_min: number | null
          id: string
          image_url: string | null
          is_free: boolean
          lat: number | null
          lng: number | null
          location: string | null
          name: string | null
          org_id: string
          org_logo_url: string | null
          org_name: string | null
          registration_mode: string
          requirements: Json
          review_notes: string | null
          riasec_code: string | null
          riasec_weights: Json | null
          schedule: string | null
          schedule_json: Json | null
          stage: string | null
          start_date: string | null
          status: string
          submitted_at: string | null
          target_competencies: string[]
          type: string
          updated_at: string
          wbl: Json
        }
        Insert: {
          application_builder?: Json | null
          application_links?: Json
          application_version_id?: string | null
          capacity?: number | null
          cost_cents?: number | null
          created_at?: string
          custom?: Json
          decided_at?: string | null
          description?: string | null
          end_date?: string | null
          experience_type?: string | null
          external_url?: string | null
          gate_evidence?: Json | null
          gate_reviewed_at?: string | null
          gate_reviewed_by?: string | null
          gate_status?: string
          grade_max?: number | null
          grade_min?: number | null
          id?: string
          image_url?: string | null
          is_free?: boolean
          lat?: number | null
          lng?: number | null
          location?: string | null
          name?: string | null
          org_id: string
          org_logo_url?: string | null
          org_name?: string | null
          registration_mode?: string
          requirements?: Json
          review_notes?: string | null
          riasec_code?: string | null
          riasec_weights?: Json | null
          schedule?: string | null
          schedule_json?: Json | null
          stage?: string | null
          start_date?: string | null
          status?: string
          submitted_at?: string | null
          target_competencies?: string[]
          type: string
          updated_at?: string
          wbl?: Json
        }
        Update: {
          application_builder?: Json | null
          application_links?: Json
          application_version_id?: string | null
          capacity?: number | null
          cost_cents?: number | null
          created_at?: string
          custom?: Json
          decided_at?: string | null
          description?: string | null
          end_date?: string | null
          experience_type?: string | null
          external_url?: string | null
          gate_evidence?: Json | null
          gate_reviewed_at?: string | null
          gate_reviewed_by?: string | null
          gate_status?: string
          grade_max?: number | null
          grade_min?: number | null
          id?: string
          image_url?: string | null
          is_free?: boolean
          lat?: number | null
          lng?: number | null
          location?: string | null
          name?: string | null
          org_id?: string
          org_logo_url?: string | null
          org_name?: string | null
          registration_mode?: string
          requirements?: Json
          review_notes?: string | null
          riasec_code?: string | null
          riasec_weights?: Json | null
          schedule?: string | null
          schedule_json?: Json | null
          stage?: string | null
          start_date?: string | null
          status?: string
          submitted_at?: string | null
          target_competencies?: string[]
          type?: string
          updated_at?: string
          wbl?: Json
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_application_version_id_fkey"
            columns: ["application_version_id"]
            isOneToOne: false
            referencedRelation: "opp_application_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_form_fields: {
        Row: {
          created_at: string
          enabled: boolean
          field_key: string
          field_type: string
          help_text: string | null
          id: string
          is_core: boolean
          label: string
          opportunity_type: string
          options: Json | null
          required: boolean
          sort_order: number
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          field_key: string
          field_type?: string
          help_text?: string | null
          id?: string
          is_core?: boolean
          label: string
          opportunity_type: string
          options?: Json | null
          required?: boolean
          sort_order?: number
        }
        Update: {
          created_at?: string
          enabled?: boolean
          field_key?: string
          field_type?: string
          help_text?: string | null
          id?: string
          is_core?: boolean
          label?: string
          opportunity_type?: string
          options?: Json | null
          required?: boolean
          sort_order?: number
        }
        Relationships: []
      }
      opportunity_forms: {
        Row: {
          created_at: string
          file_url: string | null
          id: string
          name: string
          opportunity_id: string
          requires_signature: boolean
          sort_order: number
        }
        Insert: {
          created_at?: string
          file_url?: string | null
          id?: string
          name: string
          opportunity_id: string
          requires_signature?: boolean
          sort_order?: number
        }
        Update: {
          created_at?: string
          file_url?: string | null
          id?: string
          name?: string
          opportunity_id?: string
          requires_signature?: boolean
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_forms_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_registrations: {
        Row: {
          application_id: string | null
          contact_email: string | null
          contact_name: string | null
          created_at: string
          id: string
          note: string | null
          opportunity_id: string
          student_id: string | null
        }
        Insert: {
          application_id?: string | null
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          note?: string | null
          opportunity_id: string
          student_id?: string | null
        }
        Update: {
          application_id?: string | null
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          note?: string | null
          opportunity_id?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_registrations_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_registrations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          website: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          id: string
          logo_url?: string | null
          name: string
          website?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          website?: string | null
        }
        Relationships: []
      }
      plan_approvals: {
        Row: {
          advisor_ack_at: string | null
          advisor_id: string | null
          guardian_ack_at: string | null
          id: string
          method: string | null
          school_year: string
          student_ack_at: string | null
          student_id: string
        }
        Insert: {
          advisor_ack_at?: string | null
          advisor_id?: string | null
          guardian_ack_at?: string | null
          id?: string
          method?: string | null
          school_year: string
          student_ack_at?: string | null
          student_id: string
        }
        Update: {
          advisor_ack_at?: string | null
          advisor_id?: string | null
          guardian_ack_at?: string | null
          id?: string
          method?: string | null
          school_year?: string
          student_ack_at?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_approvals_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_pieces: {
        Row: {
          artifact_type: string
          competency_tags: string[]
          context: string | null
          created_at: string
          experience_id: string | null
          id: string
          media_consent: boolean
          reflection: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          student_id: string
          title: string
          url: string | null
          visibility: string
        }
        Insert: {
          artifact_type?: string
          competency_tags?: string[]
          context?: string | null
          created_at?: string
          experience_id?: string | null
          id?: string
          media_consent?: boolean
          reflection?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          student_id: string
          title: string
          url?: string | null
          visibility?: string
        }
        Update: {
          artifact_type?: string
          competency_tags?: string[]
          context?: string | null
          created_at?: string
          experience_id?: string | null
          id?: string
          media_consent?: boolean
          reflection?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          student_id?: string
          title?: string
          url?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_pieces_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_pieces_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      program_educators: {
        Row: {
          added_at: string
          educator_id: string
          program_id: string
        }
        Insert: {
          added_at?: string
          educator_id: string
          program_id: string
        }
        Update: {
          added_at?: string
          educator_id?: string
          program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_educators_educator_id_fkey"
            columns: ["educator_id"]
            isOneToOne: false
            referencedRelation: "educators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_educators_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          grade_band: string | null
          grade_levels: number[] | null
          id: string
          name: string
          program_type: Database["public"]["Enums"]["program_type"]
          school_irn: string | null
          school_name: string | null
          student_count: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          grade_band?: string | null
          grade_levels?: number[] | null
          id?: string
          name: string
          program_type: Database["public"]["Enums"]["program_type"]
          school_irn?: string | null
          school_name?: string | null
          student_count?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          grade_band?: string | null
          grade_levels?: number[] | null
          id?: string
          name?: string
          program_type?: Database["public"]["Enums"]["program_type"]
          school_irn?: string | null
          school_name?: string | null
          student_count?: number | null
        }
        Relationships: []
      }
      rate_limit_hits: {
        Row: {
          hits: number
          key: string
          window_start: string
        }
        Insert: {
          hits?: number
          key: string
          window_start: string
        }
        Update: {
          hits?: number
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      responses: {
        Row: {
          completed_at: string
          id: string
          item_id: string
          module_id: string
          presentation_format_used: string | null
          student_id: string
          value_numeric: number | null
        }
        Insert: {
          completed_at?: string
          id?: string
          item_id: string
          module_id: string
          presentation_format_used?: string | null
          student_id: string
          value_numeric?: number | null
        }
        Update: {
          completed_at?: string
          id?: string
          item_id?: string
          module_id?: string
          presentation_format_used?: string | null
          student_id?: string
          value_numeric?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "responses_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_camp_links: {
        Row: {
          explr_camp_id: string
          linked_at: string
          student_id: string
        }
        Insert: {
          explr_camp_id: string
          linked_at?: string
          student_id: string
        }
        Update: {
          explr_camp_id?: string
          linked_at?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_camp_links_explr_camp_id_fkey"
            columns: ["explr_camp_id"]
            isOneToOne: false
            referencedRelation: "explr_camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_camp_links_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_presence: {
        Row: {
          label: string | null
          last_seen_at: string
          path: string | null
          student_id: string
        }
        Insert: {
          label?: string | null
          last_seen_at?: string
          path?: string | null
          student_id: string
        }
        Update: {
          label?: string | null
          last_seen_at?: string
          path?: string | null
          student_id?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          about_me: string | null
          avatar_emoji: string | null
          created_at: string
          date_of_birth: string | null
          first_name: string | null
          grade: number
          grade_band: string | null
          headline: string | null
          id: string
          photo_url: string | null
          scheduled_deletion_at: string | null
        }
        Insert: {
          about_me?: string | null
          avatar_emoji?: string | null
          created_at?: string
          date_of_birth?: string | null
          first_name?: string | null
          grade: number
          grade_band?: string | null
          headline?: string | null
          id: string
          photo_url?: string | null
          scheduled_deletion_at?: string | null
        }
        Update: {
          about_me?: string | null
          avatar_emoji?: string | null
          created_at?: string
          date_of_birth?: string | null
          first_name?: string | null
          grade?: number
          grade_band?: string | null
          headline?: string | null
          id?: string
          photo_url?: string | null
          scheduled_deletion_at?: string | null
        }
        Relationships: []
      }
      survey_assignments: {
        Row: {
          administration: string
          closes_at: string | null
          created_at: string
          created_by: string | null
          id: string
          opens_at: string | null
          survey_type: string
          title: string
          unit_ref: string
          unit_type: string
        }
        Insert: {
          administration: string
          closes_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          opens_at?: string | null
          survey_type: string
          title: string
          unit_ref: string
          unit_type: string
        }
        Update: {
          administration?: string
          closes_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          opens_at?: string | null
          survey_type?: string
          title?: string
          unit_ref?: string
          unit_type?: string
        }
        Relationships: []
      }
      survey_item_responses: {
        Row: {
          id: string
          item_id: string
          skipped: boolean
          survey_response_id: string
          value_now: number | null
          value_then: number | null
        }
        Insert: {
          id?: string
          item_id: string
          skipped?: boolean
          survey_response_id: string
          value_now?: number | null
          value_then?: number | null
        }
        Update: {
          id?: string
          item_id?: string
          skipped?: boolean
          survey_response_id?: string
          value_now?: number | null
          value_then?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_item_responses_survey_response_id_fkey"
            columns: ["survey_response_id"]
            isOneToOne: false
            referencedRelation: "survey_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_item_responses_survey_response_id_fkey"
            columns: ["survey_response_id"]
            isOneToOne: false
            referencedRelation: "survey_scale_scores"
            referencedColumns: ["survey_response_id"]
          },
        ]
      }
      survey_open_responses: {
        Row: {
          id: string
          prompt: string
          response: string | null
          survey_response_id: string
        }
        Insert: {
          id?: string
          prompt: string
          response?: string | null
          survey_response_id: string
        }
        Update: {
          id?: string
          prompt?: string
          response?: string | null
          survey_response_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_open_responses_survey_response_id_fkey"
            columns: ["survey_response_id"]
            isOneToOne: false
            referencedRelation: "survey_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_open_responses_survey_response_id_fkey"
            columns: ["survey_response_id"]
            isOneToOne: false
            referencedRelation: "survey_scale_scores"
            referencedColumns: ["survey_response_id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          administration: string
          assignment_id: string
          completed_at: string | null
          demographics: Json | null
          device_type: string | null
          id: string
          progress_index: number
          started_at: string
          student_id: string
          survey_type: string
        }
        Insert: {
          administration: string
          assignment_id: string
          completed_at?: string | null
          demographics?: Json | null
          device_type?: string | null
          id?: string
          progress_index?: number
          started_at?: string
          student_id: string
          survey_type: string
        }
        Update: {
          administration?: string
          assignment_id?: string
          completed_at?: string | null
          demographics?: Json | null
          device_type?: string | null
          id?: string
          progress_index?: number
          started_at?: string
          student_id?: string
          survey_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "survey_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_rosters: {
        Row: {
          students: Json
          unit_slug: string
          unit_type: Database["public"]["Enums"]["roster_unit_type"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          students?: Json
          unit_slug: string
          unit_type: Database["public"]["Enums"]["roster_unit_type"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          students?: Json
          unit_slug?: string
          unit_type?: Database["public"]["Enums"]["roster_unit_type"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      survey_scale_scores: {
        Row: {
          administration: string | null
          assignment_id: string | null
          c21_now_mean: number | null
          c21_then_mean: number | null
          career_interest_now_mean: number | null
          career_interest_then_mean: number | null
          career_planning_now_mean: number | null
          completed_at: string | null
          engtech_now_mean: number | null
          engtech_then_mean: number | null
          math_now_mean: number | null
          math_then_mean: number | null
          science_now_mean: number | null
          science_then_mean: number | null
          student_id: string | null
          survey_response_id: string | null
          survey_type: string | null
          wbl_now_mean: number | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "survey_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      advance_session: { Args: { p_session_id: string }; Returns: undefined }
      check_rate_limit: {
        Args: { _key: string; _max: number; _window_seconds: number }
        Returns: boolean
      }
      daily_explr_sync_enabled: { Args: never; Returns: boolean }
      educator_can_access_camp: {
        Args: { _educator_id: string; _explr_camp_id: string }
        Returns: boolean
      }
      educator_can_access_class: {
        Args: { _class_id: string; _educator_id: string }
        Returns: boolean
      }
      educator_can_access_student: {
        Args: { _educator_id: string; _student_id: string }
        Returns: boolean
      }
      is_admin: { Args: { uid: string }; Returns: boolean }
      is_educator: { Args: { uid: string }; Returns: boolean }
      is_organization: { Args: { uid: string }; Returns: boolean }
      org_placed_students: {
        Args: never
        Returns: {
          internship_name: string
          opportunity_id: string
          placed_at: string
          placement_id: string
          start_date: string
          student_name: string
        }[]
      }
      purge_unplaced_applications: { Args: never; Returns: number }
      set_daily_explr_sync: { Args: { _enabled: boolean }; Returns: boolean }
      staff_can_see_student: {
        Args: { _student_id: string; _uid: string }
        Returns: boolean
      }
    }
    Enums: {
      assessment_kind:
        | "interest_ms"
        | "interest_hs"
        | "aptitude_ms"
        | "aptitude_hs"
        | "internships"
      educator_role: "educator" | "admin"
      program_type:
        | "stem"
        | "cs"
        | "robotics_fll"
        | "robotics_ftc"
        | "robotics_frc"
        | "camp"
        | "internship"
      roster_unit_type: "camp" | "internship"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      assessment_kind: [
        "interest_ms",
        "interest_hs",
        "aptitude_ms",
        "aptitude_hs",
        "internships",
      ],
      educator_role: ["educator", "admin"],
      program_type: [
        "stem",
        "cs",
        "robotics_fll",
        "robotics_ftc",
        "robotics_frc",
        "camp",
        "internship",
      ],
      roster_unit_type: ["camp", "internship"],
    },
  },
} as const
