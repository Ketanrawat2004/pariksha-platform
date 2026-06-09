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
      answers: {
        Row: {
          answered_at: string | null
          changed_count: number | null
          id: string
          marked_for_review: boolean | null
          question_id: string
          selected_option: string | null
          session_id: string
          time_taken_seconds: number | null
        }
        Insert: {
          answered_at?: string | null
          changed_count?: number | null
          id?: string
          marked_for_review?: boolean | null
          question_id: string
          selected_option?: string | null
          session_id: string
          time_taken_seconds?: number | null
        }
        Update: {
          answered_at?: string | null
          changed_count?: number | null
          id?: string
          marked_for_review?: boolean | null
          question_id?: string
          selected_option?: string | null
          session_id?: string
          time_taken_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "exam_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          details: Json | null
          id: string
          ip_address: string | null
          resource: string | null
          resource_id: string | null
          timestamp: string
          user_id: string | null
        }
        Insert: {
          action: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource?: string | null
          resource_id?: string | null
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource?: string | null
          resource_id?: string | null
          timestamp?: string
          user_id?: string | null
        }
        Relationships: []
      }
      centers: {
        Row: {
          capacity: number
          created_at: string
          district: string
          id: string
          invigilator_id: string | null
          is_verified: boolean
          name: string
          pincode: string
          state: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          district: string
          id?: string
          invigilator_id?: string | null
          is_verified?: boolean
          name: string
          pincode: string
          state: string
        }
        Update: {
          capacity?: number
          created_at?: string
          district?: string
          id?: string
          invigilator_id?: string | null
          is_verified?: boolean
          name?: string
          pincode?: string
          state?: string
        }
        Relationships: [
          {
            foreignKeyName: "centers_invigilator_id_fkey"
            columns: ["invigilator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_sessions: {
        Row: {
          browser_info: string | null
          device_fingerprint: Json | null
          ended_at: string | null
          flag_reasons: Json | null
          id: string
          integrity_score: number
          ip_address: string | null
          is_flagged: boolean
          is_submitted: boolean
          registration_id: string
          started_at: string
        }
        Insert: {
          browser_info?: string | null
          device_fingerprint?: Json | null
          ended_at?: string | null
          flag_reasons?: Json | null
          id?: string
          integrity_score?: number
          ip_address?: string | null
          is_flagged?: boolean
          is_submitted?: boolean
          registration_id: string
          started_at?: string
        }
        Update: {
          browser_info?: string | null
          device_fingerprint?: Json | null
          ended_at?: string | null
          flag_reasons?: Json | null
          id?: string
          integrity_score?: number
          ip_address?: string | null
          is_flagged?: boolean
          is_submitted?: boolean
          registration_id?: string
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_sessions_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          duration_minutes: number
          exam_date: string
          id: string
          paper_hash: string | null
          passing_marks: number
          start_time: string
          status: Database["public"]["Enums"]["exam_status"]
          subject: string
          title: string
          total_marks: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes: number
          exam_date: string
          id?: string
          paper_hash?: string | null
          passing_marks: number
          start_time: string
          status?: Database["public"]["Enums"]["exam_status"]
          subject: string
          title: string
          total_marks: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          exam_date?: string
          id?: string
          paper_hash?: string | null
          passing_marks?: number
          start_time?: string
          status?: Database["public"]["Enums"]["exam_status"]
          subject?: string
          title?: string
          total_marks?: number
        }
        Relationships: [
          {
            foreignKeyName: "exams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      integrity_events: {
        Row: {
          auto_resolved: boolean
          details: Json | null
          event_type: Database["public"]["Enums"]["integrity_event_type"]
          id: string
          session_id: string
          severity: Database["public"]["Enums"]["event_severity"]
          timestamp: string
        }
        Insert: {
          auto_resolved?: boolean
          details?: Json | null
          event_type: Database["public"]["Enums"]["integrity_event_type"]
          id?: string
          session_id: string
          severity?: Database["public"]["Enums"]["event_severity"]
          timestamp?: string
        }
        Update: {
          auto_resolved?: boolean
          details?: Json | null
          event_type?: Database["public"]["Enums"]["integrity_event_type"]
          id?: string
          session_id?: string
          severity?: Database["public"]["Enums"]["event_severity"]
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrity_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "exam_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          title: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      paper_registrations: {
        Row: {
          admit_card_number: string | null
          admit_released: boolean
          admit_released_at: string | null
          candidate_id: string
          created_at: string
          date_of_birth: string | null
          full_name: string
          id: string
          paper_submission_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          admit_card_number?: string | null
          admit_released?: boolean
          admit_released_at?: string | null
          candidate_id: string
          created_at?: string
          date_of_birth?: string | null
          full_name: string
          id?: string
          paper_submission_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          admit_card_number?: string | null
          admit_released?: boolean
          admit_released_at?: string | null
          candidate_id?: string
          created_at?: string
          date_of_birth?: string | null
          full_name?: string
          id?: string
          paper_submission_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "paper_registrations_paper_submission_id_fkey"
            columns: ["paper_submission_id"]
            isOneToOne: false
            referencedRelation: "paper_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      paper_submissions: {
        Row: {
          admin_note: string | null
          created_at: string
          description: string | null
          duration_minutes: number
          edit_request_note: string | null
          exam_date: string
          id: string
          institute_id: string
          passing_marks: number
          passkey_hash: string | null
          published_exam_id: string | null
          questions: Json
          start_time: string
          status: Database["public"]["Enums"]["paper_submission_status"]
          subject: string
          submitter_photo_url: string | null
          teacher_name: string | null
          title: string
          total_marks: number
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          edit_request_note?: string | null
          exam_date: string
          id?: string
          institute_id: string
          passing_marks?: number
          passkey_hash?: string | null
          published_exam_id?: string | null
          questions?: Json
          start_time: string
          status?: Database["public"]["Enums"]["paper_submission_status"]
          subject: string
          submitter_photo_url?: string | null
          teacher_name?: string | null
          title: string
          total_marks?: number
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          edit_request_note?: string | null
          exam_date?: string
          id?: string
          institute_id?: string
          passing_marks?: number
          passkey_hash?: string | null
          published_exam_id?: string | null
          questions?: Json
          start_time?: string
          status?: Database["public"]["Enums"]["paper_submission_status"]
          subject?: string
          submitter_photo_url?: string | null
          teacher_name?: string | null
          title?: string
          total_marks?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "paper_submissions_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paper_submissions_published_exam_id_fkey"
            columns: ["published_exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          aadhaar_hash: string | null
          center_id: string | null
          created_at: string
          date_of_birth: string | null
          email: string
          face_embedding: Json | null
          face_photo_path: string | null
          full_name: string
          gender: string | null
          id: string
          is_active: boolean
          phone: string | null
          photo_url: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          aadhaar_hash?: string | null
          center_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          email: string
          face_embedding?: Json | null
          face_photo_path?: string | null
          full_name: string
          gender?: string | null
          id: string
          is_active?: boolean
          phone?: string | null
          photo_url?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          aadhaar_hash?: string | null
          center_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string
          face_embedding?: Json | null
          face_photo_path?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          photo_url?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_center_fk"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          category: string | null
          correct_answer_encrypted: string
          created_at: string
          exam_id: string
          id: string
          marks: number
          option_a_encrypted: string
          option_b_encrypted: string
          option_c_encrypted: string
          option_d_encrypted: string
          question_order: number
          question_text_encrypted: string
        }
        Insert: {
          category?: string | null
          correct_answer_encrypted: string
          created_at?: string
          exam_id: string
          id?: string
          marks?: number
          option_a_encrypted: string
          option_b_encrypted: string
          option_c_encrypted: string
          option_d_encrypted: string
          question_order: number
          question_text_encrypted: string
        }
        Update: {
          category?: string | null
          correct_answer_encrypted?: string
          created_at?: string
          exam_id?: string
          id?: string
          marks?: number
          option_a_encrypted?: string
          option_b_encrypted?: string
          option_c_encrypted?: string
          option_d_encrypted?: string
          question_order?: number
          question_text_encrypted?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      registrations: {
        Row: {
          admit_card_number: string
          candidate_id: string
          center_id: string | null
          exam_id: string
          id: string
          registered_at: string
          seat_number: string | null
          status: Database["public"]["Enums"]["registration_status"]
        }
        Insert: {
          admit_card_number?: string
          candidate_id: string
          center_id?: string | null
          exam_id: string
          id?: string
          registered_at?: string
          seat_number?: string | null
          status?: Database["public"]["Enums"]["registration_status"]
        }
        Update: {
          admit_card_number?: string
          candidate_id?: string
          center_id?: string | null
          exam_id?: string
          id?: string
          registered_at?: string
          seat_number?: string | null
          status?: Database["public"]["Enums"]["registration_status"]
        }
        Relationships: [
          {
            foreignKeyName: "registrations_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      results: {
        Row: {
          certificate_id: string
          exam_id: string
          generated_at: string
          id: string
          is_verified: boolean
          pass_fail: boolean
          percentage: number
          percentile: number | null
          rank: number | null
          registration_id: string
          section_scores: Json | null
          total_score: number
          verified_by: string | null
        }
        Insert: {
          certificate_id?: string
          exam_id: string
          generated_at?: string
          id?: string
          is_verified?: boolean
          pass_fail: boolean
          percentage: number
          percentile?: number | null
          rank?: number | null
          registration_id: string
          section_scores?: Json | null
          total_score: number
          verified_by?: string | null
        }
        Update: {
          certificate_id?: string
          exam_id?: string
          generated_at?: string
          id?: string
          is_verified?: boolean
          pass_fail?: boolean
          percentage?: number
          percentile?: number | null
          rank?: number | null
          registration_id?: string
          section_scores?: Json | null
          total_score?: number
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "results_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: true
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_signin_photos: {
        Row: {
          created_at: string
          id: string
          photo_url: string
          role: Database["public"]["Enums"]["app_role"]
          signed_in_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          photo_url: string
          role: Database["public"]["Enums"]["app_role"]
          signed_in_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          photo_url?: string
          role?: Database["public"]["Enums"]["app_role"]
          signed_in_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      trishield_session_reports: {
        Row: {
          admin_ip: string | null
          admin_snapshot_count: number | null
          created_at: string
          critical_actions: Json | null
          duration_seconds: number | null
          ended_at: string | null
          exam_id: string | null
          final_paper_hash: string | null
          id: string
          incomplete_reason: string | null
          institute_ip: string | null
          institute_snapshot_count: number | null
          session_id: string
          session_type: string | null
          started_at: string | null
          superadmin_ip: string | null
          superadmin_snapshot_count: number | null
          verification_status: string | null
        }
        Insert: {
          admin_ip?: string | null
          admin_snapshot_count?: number | null
          created_at?: string
          critical_actions?: Json | null
          duration_seconds?: number | null
          ended_at?: string | null
          exam_id?: string | null
          final_paper_hash?: string | null
          id?: string
          incomplete_reason?: string | null
          institute_ip?: string | null
          institute_snapshot_count?: number | null
          session_id: string
          session_type?: string | null
          started_at?: string | null
          superadmin_ip?: string | null
          superadmin_snapshot_count?: number | null
          verification_status?: string | null
        }
        Update: {
          admin_ip?: string | null
          admin_snapshot_count?: number | null
          created_at?: string
          critical_actions?: Json | null
          duration_seconds?: number | null
          ended_at?: string | null
          exam_id?: string | null
          final_paper_hash?: string | null
          id?: string
          incomplete_reason?: string | null
          institute_ip?: string | null
          institute_snapshot_count?: number | null
          session_id?: string
          session_type?: string | null
          started_at?: string | null
          superadmin_ip?: string | null
          superadmin_snapshot_count?: number | null
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trishield_session_reports_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trishield_session_reports_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "trishield_watch_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      trishield_watch_sessions: {
        Row: {
          admin_camera_active: boolean
          admin_confirmed: boolean
          admin_device_fingerprint: Json | null
          admin_ip: string | null
          admin_joined_at: string | null
          admin_snapshot_count: number
          all_parties_present: boolean
          created_at: string
          exam_id: string | null
          id: string
          initiated_by: string
          institute_camera_active: boolean
          institute_device_fingerprint: Json | null
          institute_ip: string | null
          institute_snapshot_count: number
          paper_submission_id: string | null
          session_ended_at: string | null
          session_started_at: string
          session_type: string
          status: string
          superadmin_camera_active: boolean
          superadmin_confirmed: boolean
          superadmin_device_fingerprint: Json | null
          superadmin_ip: string | null
          superadmin_joined_at: string | null
          superadmin_snapshot_count: number
          updated_at: string
        }
        Insert: {
          admin_camera_active?: boolean
          admin_confirmed?: boolean
          admin_device_fingerprint?: Json | null
          admin_ip?: string | null
          admin_joined_at?: string | null
          admin_snapshot_count?: number
          all_parties_present?: boolean
          created_at?: string
          exam_id?: string | null
          id?: string
          initiated_by: string
          institute_camera_active?: boolean
          institute_device_fingerprint?: Json | null
          institute_ip?: string | null
          institute_snapshot_count?: number
          paper_submission_id?: string | null
          session_ended_at?: string | null
          session_started_at?: string
          session_type: string
          status?: string
          superadmin_camera_active?: boolean
          superadmin_confirmed?: boolean
          superadmin_device_fingerprint?: Json | null
          superadmin_ip?: string | null
          superadmin_joined_at?: string | null
          superadmin_snapshot_count?: number
          updated_at?: string
        }
        Update: {
          admin_camera_active?: boolean
          admin_confirmed?: boolean
          admin_device_fingerprint?: Json | null
          admin_ip?: string | null
          admin_joined_at?: string | null
          admin_snapshot_count?: number
          all_parties_present?: boolean
          created_at?: string
          exam_id?: string | null
          id?: string
          initiated_by?: string
          institute_camera_active?: boolean
          institute_device_fingerprint?: Json | null
          institute_ip?: string | null
          institute_snapshot_count?: number
          paper_submission_id?: string | null
          session_ended_at?: string | null
          session_started_at?: string
          session_type?: string
          status?: string
          superadmin_camera_active?: boolean
          superadmin_confirmed?: boolean
          superadmin_device_fingerprint?: Json | null
          superadmin_ip?: string | null
          superadmin_joined_at?: string | null
          superadmin_snapshot_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trishield_watch_sessions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trishield_watch_sessions_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trishield_watch_sessions_paper_submission_id_fkey"
            columns: ["paper_submission_id"]
            isOneToOne: false
            referencedRelation: "paper_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_has_any_role: {
        Args: { _roles: Database["public"]["Enums"]["app_role"][] }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_watch_snapshot: {
        Args: { _party: string; _session_id: string }
        Returns: undefined
      }
      list_published_paper_summaries: {
        Args: never
        Returns: {
          duration_minutes: number
          exam_date: string
          id: string
          passing_marks: number
          published_exam_id: string
          start_time: string
          subject: string
          teacher_name: string
          title: string
          total_marks: number
        }[]
      }
      release_paper_admits: {
        Args: { _paper_submission_id: string }
        Returns: {
          released_count: number
        }[]
      }
      verify_admit_card: {
        Args: { _admit_card_number: string }
        Returns: {
          exam_date: string
          exam_title: string
          valid: boolean
        }[]
      }
      verify_certificate: {
        Args: { _certificate_id: string }
        Returns: {
          exam_date: string
          exam_title: string
          pass_fail: boolean
          percentage: number
        }[]
      }
    }
    Enums: {
      app_role:
        | "superadmin"
        | "admin"
        | "invigilator"
        | "candidate"
        | "institute"
      event_severity: "low" | "medium" | "high" | "critical"
      exam_status: "draft" | "scheduled" | "live" | "completed" | "cancelled"
      integrity_event_type:
        | "tab_switch"
        | "copy_attempt"
        | "fullscreen_exit"
        | "face_mismatch"
        | "multiple_faces"
        | "no_face"
        | "network_anomaly"
        | "rapid_answer"
        | "suspicious_pattern"
      notification_type: "info" | "warning" | "alert" | "success"
      paper_submission_status:
        | "draft"
        | "pending"
        | "locked"
        | "approved"
        | "published"
        | "edit_requested"
        | "rejected"
      registration_status: "pending" | "approved" | "rejected"
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
      app_role: [
        "superadmin",
        "admin",
        "invigilator",
        "candidate",
        "institute",
      ],
      event_severity: ["low", "medium", "high", "critical"],
      exam_status: ["draft", "scheduled", "live", "completed", "cancelled"],
      integrity_event_type: [
        "tab_switch",
        "copy_attempt",
        "fullscreen_exit",
        "face_mismatch",
        "multiple_faces",
        "no_face",
        "network_anomaly",
        "rapid_answer",
        "suspicious_pattern",
      ],
      notification_type: ["info", "warning", "alert", "success"],
      paper_submission_status: [
        "draft",
        "pending",
        "locked",
        "approved",
        "published",
        "edit_requested",
        "rejected",
      ],
      registration_status: ["pending", "approved", "rejected"],
    },
  },
} as const
