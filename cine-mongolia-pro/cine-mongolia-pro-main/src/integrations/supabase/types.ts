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
      ad_clicks: {
        Row: {
          ad_id: string
          created_at: string
          id: string
          page: string | null
          user_id: string | null
        }
        Insert: {
          ad_id: string
          created_at?: string
          id?: string
          page?: string | null
          user_id?: string | null
        }
        Update: {
          ad_id?: string
          created_at?: string
          id?: string
          page?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_clicks_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      ads: {
        Row: {
          click_count: number
          created_at: string
          ends_at: string | null
          id: string
          image_url: string
          impression_count: number
          is_active: boolean
          link_url: string
          placements: string[]
          starts_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          click_count?: number
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url: string
          impression_count?: number
          is_active?: boolean
          link_url: string
          placements?: string[]
          starts_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          click_count?: number
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url?: string
          impression_count?: number
          is_active?: boolean
          link_url?: string
          placements?: string[]
          starts_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          admin_telegram_chat_id: number | null
          bank_account_name: string
          bank_account_number: string
          bank_name: string
          id: number
          premium_price: number
          telegram_bot_username: string
          updated_at: string
        }
        Insert: {
          admin_telegram_chat_id?: number | null
          bank_account_name?: string
          bank_account_number?: string
          bank_name?: string
          id?: number
          premium_price?: number
          telegram_bot_username?: string
          updated_at?: string
        }
        Update: {
          admin_telegram_chat_id?: number | null
          bank_account_name?: string
          bank_account_number?: string
          bank_name?: string
          id?: number
          premium_price?: number
          telegram_bot_username?: string
          updated_at?: string
        }
        Relationships: []
      }
      broadcasts: {
        Row: {
          created_at: string
          id: string
          kind: string
          message: string
          recipients_count: number
          sent_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          message: string
          recipients_count?: number
          sent_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          message?: string
          recipients_count?: number
          sent_by?: string | null
        }
        Relationships: []
      }
      movies: {
        Row: {
          backdrop_url: string | null
          broadcast_sent: boolean
          cast_list: string | null
          created_at: string
          description: string | null
          description_en: string | null
          director: string | null
          duration_min: number | null
          genre: string
          id: string
          is_featured: boolean
          is_premium: boolean
          poster_url: string | null
          r2_key: string | null
          title: string
          title_en: string | null
          trailer_url: string | null
          video_url: string | null
          views: number
          year: number
        }
        Insert: {
          backdrop_url?: string | null
          broadcast_sent?: boolean
          cast_list?: string | null
          created_at?: string
          description?: string | null
          description_en?: string | null
          director?: string | null
          duration_min?: number | null
          genre: string
          id?: string
          is_featured?: boolean
          is_premium?: boolean
          poster_url?: string | null
          r2_key?: string | null
          title: string
          title_en?: string | null
          trailer_url?: string | null
          video_url?: string | null
          views?: number
          year: number
        }
        Update: {
          backdrop_url?: string | null
          broadcast_sent?: boolean
          cast_list?: string | null
          created_at?: string
          description?: string | null
          description_en?: string | null
          director?: string | null
          duration_min?: number | null
          genre?: string
          id?: string
          is_featured?: boolean
          is_premium?: boolean
          poster_url?: string | null
          r2_key?: string | null
          title?: string
          title_en?: string | null
          trailer_url?: string | null
          video_url?: string | null
          views?: number
          year?: number
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          id: string
          note: string | null
          payment_code: string
          status: Database["public"]["Enums"]["payment_status"]
          user_id: string
        }
        Insert: {
          amount?: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          note?: string | null
          payment_code: string
          status?: Database["public"]["Enums"]["payment_status"]
          user_id: string
        }
        Update: {
          amount?: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          note?: string | null
          payment_code?: string
          status?: Database["public"]["Enums"]["payment_status"]
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          payment_code: string | null
          subscription_expires_at: string | null
          subscription_status: string
          telegram_chat_id: number | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          payment_code?: string | null
          subscription_expires_at?: string | null
          subscription_status?: string
          telegram_chat_id?: number | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          payment_code?: string | null
          subscription_expires_at?: string | null
          subscription_status?: string
          telegram_chat_id?: number | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      cancel_subscription: { Args: { _user_id: string }; Returns: undefined }
      confirm_payment: {
        Args: { _payment_id: string }
        Returns: {
          amount: number
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          id: string
          note: string | null
          payment_code: string
          status: Database["public"]["Enums"]["payment_status"]
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      expire_subscriptions: {
        Args: never
        Returns: {
          email: string
          expired_user_id: string
          telegram_chat_id: number
        }[]
      }
      generate_payment_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      payment_status: "pending" | "confirmed" | "expired" | "cancelled"
      subscription_tier: "free" | "premium"
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
      app_role: ["admin", "user"],
      payment_status: ["pending", "confirmed", "expired", "cancelled"],
      subscription_tier: ["free", "premium"],
    },
  },
} as const
