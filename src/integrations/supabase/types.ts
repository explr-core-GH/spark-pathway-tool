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
          application_id: string
          approved_at: string
          approved_by: string | null
          approved_internship_id: string
          id: string
          staff_notes: string | null
          student_id: string
        }
        Insert: {
          application_id: string
          approved_at?: string
          approved_by?: string | null
          approved_internship_id: string
          id?: string
          staff_notes?: string | null
          student_id: string
        }
        Update: {
          application_id?: string
          approved_at?: string
          approved_by?: string | null
          approved_internship_id?: string
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
            foreignKeyName: "internship_placements_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
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
      opportunities: {
        Row: {
          application_links: Json
          capacity: number | null
          cost_cents: number | null
          created_at: string
          custom: Json
          decided_at: string | null
          description: string | null
          end_date: string | null
          external_url: string | null
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
          start_date: string | null
          status: string
          submitted_at: string | null
          type: string
          updated_at: string
        }
        Insert: {
          application_links?: Json
          capacity?: number | null
          cost_cents?: number | null
          created_at?: string
          custom?: Json
          decided_at?: string | null
          description?: string | null
          end_date?: string | null
          external_url?: string | null
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
          start_date?: string | null
          status?: string
          submitted_at?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          application_links?: Json
          capacity?: number | null
          cost_cents?: number | null
          created_at?: string
          custom?: Json
          decided_at?: string | null
          description?: string | null
          end_date?: string | null
          external_url?: string | null
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
          start_date?: string | null
          status?: string
          submitted_at?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
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
          created_at: string
          date_of_birth: string | null
          first_name: string | null
          grade: number
          grade_band: string | null
          id: string
          scheduled_deletion_at: string | null
        }
        Insert: {
          created_at?: string
          date_of_birth?: string | null
          first_name?: string | null
          grade: number
          grade_band?: string | null
          id: string
          scheduled_deletion_at?: string | null
        }
        Update: {
          created_at?: string
          date_of_birth?: string | null
          first_name?: string | null
          grade?: number
          grade_band?: string | null
          id?: string
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
      educator_can_access_camp: {
        Args: { _educator_id: string; _explr_camp_id: string }
        Returns: boolean
      }
      educator_can_access_student: {
        Args: { _educator_id: string; _student_id: string }
        Returns: boolean
      }
      is_admin: { Args: { uid: string }; Returns: boolean }
      is_educator: { Args: { uid: string }; Returns: boolean }
      is_organization: { Args: { uid: string }; Returns: boolean }
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
