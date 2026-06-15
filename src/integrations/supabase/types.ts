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
      ai_usage_daily: {
        Row: {
          count: number
          date: string
          id: string
          user_id: string
        }
        Insert: {
          count?: number
          date?: string
          id?: string
          user_id: string
        }
        Update: {
          count?: number
          date?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          awarded_at: string
          code: string
          id: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          code: string
          id?: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          code?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      calendar_tasks: {
        Row: {
          created_at: string
          due_date: string | null
          id: string
          plot_id: string | null
          source: Database["public"]["Enums"]["task_source"]
          status: Database["public"]["Enums"]["task_status"]
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          id?: string
          plot_id?: string | null
          source?: Database["public"]["Enums"]["task_source"]
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          due_date?: string | null
          id?: string
          plot_id?: string | null
          source?: Database["public"]["Enums"]["task_source"]
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_tasks_plot_id_fkey"
            columns: ["plot_id"]
            isOneToOne: false
            referencedRelation: "farm_plots"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          ai_answer: string | null
          body: string
          created_at: string
          id: string
          language: string | null
          moderated_at: string | null
          moderated_by: string | null
          status: Database["public"]["Enums"]["content_status"]
          title: string
          user_id: string
        }
        Insert: {
          ai_answer?: string | null
          body: string
          created_at?: string
          id?: string
          language?: string | null
          moderated_at?: string | null
          moderated_by?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          title: string
          user_id: string
        }
        Update: {
          ai_answer?: string | null
          body?: string
          created_at?: string
          id?: string
          language?: string | null
          moderated_at?: string | null
          moderated_by?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      community_replies: {
        Row: {
          body: string
          created_at: string
          id: string
          is_ai: boolean
          language: string | null
          moderated_at: string | null
          moderated_by: string | null
          post_id: string
          status: Database["public"]["Enums"]["content_status"]
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_ai?: boolean
          language?: string | null
          moderated_at?: string | null
          moderated_by?: string | null
          post_id: string
          status?: Database["public"]["Enums"]["content_status"]
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_ai?: boolean
          language?: string | null
          moderated_at?: string | null
          moderated_by?: string | null
          post_id?: string
          status?: Database["public"]["Enums"]["content_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_replies_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_reveals: {
        Row: {
          id: string
          listing_id: string
          revealed_at: string
          user_id: string
        }
        Insert: {
          id?: string
          listing_id: string
          revealed_at?: string
          user_id: string
        }
        Update: {
          id?: string
          listing_id?: string
          revealed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_reveals_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "market_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      crop_plans: {
        Row: {
          ai_result: Json | null
          country: string | null
          created_at: string
          id: string
          language: string | null
          region: string | null
          season_month: number | null
          user_id: string
        }
        Insert: {
          ai_result?: Json | null
          country?: string | null
          created_at?: string
          id?: string
          language?: string | null
          region?: string | null
          season_month?: number | null
          user_id: string
        }
        Update: {
          ai_result?: Json | null
          country?: string | null
          created_at?: string
          id?: string
          language?: string | null
          region?: string | null
          season_month?: number | null
          user_id?: string
        }
        Relationships: []
      }
      diagnoses: {
        Row: {
          ai_result: Json | null
          created_at: string
          crop_name: string | null
          id: string
          image_path: string | null
          language: string | null
          symptoms: string | null
          user_id: string
        }
        Insert: {
          ai_result?: Json | null
          created_at?: string
          crop_name?: string | null
          id?: string
          image_path?: string | null
          language?: string | null
          symptoms?: string | null
          user_id: string
        }
        Update: {
          ai_result?: Json | null
          created_at?: string
          crop_name?: string | null
          id?: string
          image_path?: string | null
          language?: string | null
          symptoms?: string | null
          user_id?: string
        }
        Relationships: []
      }
      farm_plots: {
        Row: {
          area: number | null
          country: string | null
          created_at: string
          crop_name: string | null
          id: string
          name: string
          planted_at: string | null
          region: string | null
          user_id: string
        }
        Insert: {
          area?: number | null
          country?: string | null
          created_at?: string
          crop_name?: string | null
          id?: string
          name: string
          planted_at?: string | null
          region?: string | null
          user_id: string
        }
        Update: {
          area?: number | null
          country?: string | null
          created_at?: string
          crop_name?: string | null
          id?: string
          name?: string
          planted_at?: string | null
          region?: string | null
          user_id?: string
        }
        Relationships: []
      }
      listing_reports: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          reason: string | null
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["report_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          reason?: string | null
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          reason?: string | null
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
        }
        Relationships: [
          {
            foreignKeyName: "listing_reports_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "market_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      market_listings: {
        Row: {
          contact_phone: string | null
          country: string | null
          created_at: string
          crop_name: string
          currency: string | null
          id: string
          image_path: string | null
          moderated_at: string | null
          moderated_by: string | null
          price: number | null
          qty: number | null
          region: string | null
          status: Database["public"]["Enums"]["listing_status"]
          unit: string | null
          user_id: string
        }
        Insert: {
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          crop_name: string
          currency?: string | null
          id?: string
          image_path?: string | null
          moderated_at?: string | null
          moderated_by?: string | null
          price?: number | null
          qty?: number | null
          region?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          unit?: string | null
          user_id: string
        }
        Update: {
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          crop_name?: string
          currency?: string | null
          id?: string
          image_path?: string | null
          moderated_at?: string | null
          moderated_by?: string | null
          price?: number | null
          qty?: number | null
          region?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          unit?: string | null
          user_id?: string
        }
        Relationships: []
      }
      market_prices: {
        Row: {
          as_of: string
          country: string
          created_at: string
          crop_name: string
          currency: string
          id: string
          price: number
          region: string | null
          unit: string
        }
        Insert: {
          as_of?: string
          country: string
          created_at?: string
          crop_name: string
          currency: string
          id?: string
          price: number
          region?: string | null
          unit: string
        }
        Update: {
          as_of?: string
          country?: string
          created_at?: string
          crop_name?: string
          currency?: string
          id?: string
          price?: number
          region?: string | null
          unit?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          area_unit: string
          country: string | null
          created_at: string
          currency: string
          full_name: string | null
          id: string
          krishi_score: number
          preferred_language: string
          region: string | null
        }
        Insert: {
          area_unit?: string
          country?: string | null
          created_at?: string
          currency?: string
          full_name?: string | null
          id: string
          krishi_score?: number
          preferred_language?: string
          region?: string | null
        }
        Update: {
          area_unit?: string
          country?: string | null
          created_at?: string
          currency?: string
          full_name?: string | null
          id?: string
          krishi_score?: number
          preferred_language?: string
          region?: string | null
        }
        Relationships: []
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
      award_badge: {
        Args: { _code: string; _user_id: string }
        Returns: undefined
      }
      bump_score: {
        Args: { _delta: number; _user_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "user" | "admin"
      content_status: "visible" | "hidden"
      listing_status: "active" | "sold" | "hidden" | "removed"
      report_status: "open" | "resolved" | "dismissed"
      task_source: "manual" | "ai"
      task_status: "pending" | "done"
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
      app_role: ["user", "admin"],
      content_status: ["visible", "hidden"],
      listing_status: ["active", "sold", "hidden", "removed"],
      report_status: ["open", "resolved", "dismissed"],
      task_source: ["manual", "ai"],
      task_status: ["pending", "done"],
    },
  },
} as const
