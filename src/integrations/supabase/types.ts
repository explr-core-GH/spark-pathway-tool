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
            foreignKeyName: "assessment_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "educators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_assignments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "curriculum_tags_tagged_by_fkey"
            columns: ["tagged_by"]
            isOneToOne: false
            referencedRelation: "educators"
            referencedColumns: ["id"]
          },
        ]
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
          program_type: Database["public"]["Enums"]["program_type"]
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
          program_type: Database["public"]["Enums"]["program_type"]
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
          program_type?: Database["public"]["Enums"]["program_type"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "educator_invites_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "educators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "educator_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "educators"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "internship_tags_tagged_by_fkey"
            columns: ["tagged_by"]
            isOneToOne: false
            referencedRelation: "educators"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "programs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "educators"
            referencedColumns: ["id"]
          },
        ]
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
      students: {
        Row: {
          created_at: string
          first_name: string | null
          grade: number
          grade_band: string | null
          id: string
          scheduled_deletion_at: string | null
        }
        Insert: {
          created_at?: string
          first_name?: string | null
          grade: number
          grade_band?: string | null
          id: string
          scheduled_deletion_at?: string | null
        }
        Update: {
          created_at?: string
          first_name?: string | null
          grade?: number
          grade_band?: string | null
          id?: string
          scheduled_deletion_at?: string | null
        }
        Relationships: []
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
        Relationships: [
          {
            foreignKeyName: "unit_rosters_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "educators"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      advance_session: { Args: { p_session_id: string }; Returns: undefined }
      is_admin: { Args: { uid: string }; Returns: boolean }
      is_educator: { Args: { uid: string }; Returns: boolean }
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
