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
      assignment_submissions: {
        Row: {
          ai_feedback: string | null
          ai_score: number
          assignment_id: string
          concept_id: string
          created_at: string
          id: string
          response: string
          student_id: string
        }
        Insert: {
          ai_feedback?: string | null
          ai_score?: number
          assignment_id: string
          concept_id: string
          created_at?: string
          id?: string
          response: string
          student_id: string
        }
        Update: {
          ai_feedback?: string | null
          ai_score?: number
          assignment_id?: string
          concept_id?: string
          created_at?: string
          id?: string
          response?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          concept_id: string
          created_at: string
          difficulty: number
          id: string
          prompt: string
          rubric: string
          title: string
        }
        Insert: {
          concept_id: string
          created_at?: string
          difficulty?: number
          id?: string
          prompt: string
          rubric: string
          title: string
        }
        Update: {
          concept_id?: string
          created_at?: string
          difficulty?: number
          id?: string
          prompt?: string
          rubric?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
        ]
      }
      chapters: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
          subject_id: string
          summary: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          subject_id: string
          summary?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          subject_id?: string
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chapters_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      concepts: {
        Row: {
          chapter_id: string | null
          correct_index: number
          created_at: string
          difficulty: number
          id: string
          learning_objectives: string | null
          name: string
          options: Json
          prerequisite_id: string | null
          question: string
          sort_order: number
          subject: string
          video_url: string | null
        }
        Insert: {
          chapter_id?: string | null
          correct_index: number
          created_at?: string
          difficulty?: number
          id?: string
          learning_objectives?: string | null
          name: string
          options: Json
          prerequisite_id?: string | null
          question: string
          sort_order?: number
          subject?: string
          video_url?: string | null
        }
        Update: {
          chapter_id?: string | null
          correct_index?: number
          created_at?: string
          difficulty?: number
          id?: string
          learning_objectives?: string | null
          name?: string
          options?: Json
          prerequisite_id?: string | null
          question?: string
          sort_order?: number
          subject?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "concepts_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concepts_prerequisite_id_fkey"
            columns: ["prerequisite_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_states: {
        Row: {
          concept_id: string
          last_reviewed_at: string | null
          mastery_probability: number
          memory_stability: number
          next_revision_at: string
          student_id: string
          updated_at: string
        }
        Insert: {
          concept_id: string
          last_reviewed_at?: string | null
          mastery_probability?: number
          memory_stability?: number
          next_revision_at?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          concept_id?: string
          last_reviewed_at?: string | null
          mastery_probability?: number
          memory_stability?: number
          next_revision_at?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_states_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_states_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_events: {
        Row: {
          concept_id: string
          created_at: string
          difficulty: number
          event_kind: string
          id: string
          is_correct: boolean
          response_time_ms: number
          student_id: string
        }
        Insert: {
          concept_id: string
          created_at?: string
          difficulty?: number
          event_kind?: string
          id?: string
          is_correct: boolean
          response_time_ms?: number
          student_id: string
        }
        Update: {
          concept_id?: string
          created_at?: string
          difficulty?: number
          event_kind?: string
          id?: string
          is_correct?: boolean
          response_time_ms?: number
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_events_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_events_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_content: {
        Row: {
          body: string | null
          concept_id: string
          created_at: string
          duration_min: number
          id: string
          kind: string
          sort_order: number
          title: string
          url: string | null
        }
        Insert: {
          body?: string | null
          concept_id: string
          created_at?: string
          duration_min?: number
          id?: string
          kind: string
          sort_order?: number
          title: string
          url?: string | null
        }
        Update: {
          body?: string | null
          concept_id?: string
          created_at?: string
          duration_min?: number
          id?: string
          kind?: string
          sort_order?: number
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_content_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          briefing_generated_at: string | null
          created_at: string
          daily_briefing: string | null
          id: string
          name: string
        }
        Insert: {
          briefing_generated_at?: string | null
          created_at?: string
          daily_briefing?: string | null
          id?: string
          name: string
        }
        Update: {
          briefing_generated_at?: string | null
          created_at?: string
          daily_briefing?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      subjects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
