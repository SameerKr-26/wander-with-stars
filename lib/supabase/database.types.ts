/**
 * Generated Supabase database types.
 *
 * Generated in Phase 4.2A, refreshed in Phase 4.3 (adds `admin_roles`),
 * against a real, locally-migrated Supabase/Postgres instance (`npx
 * supabase start` / `supabase db reset`) — no longer the Phase 1
 * placeholder. Regenerate, never hand-edit:
 *
 *   npm run db:types:local   (local dev stack — `npx supabase start` first)
 *   npm run db:types         (a linked remote project — requires
 *                             `npx supabase link`, not done in this repo)
 *
 * CHECK-constrained text columns (`trips.content_status`,
 * `trip_departures.status`, `trip_media.kind`, `trip_policy_sections.kind`,
 * `trip_important_notes.category`, `admin_roles.role`, ...) generate as
 * plain `string`/`string | null` here — Postgres CHECK constraints aren't
 * real enum types, so this generator has no way to know their literal
 * value sets. See `lib/content/db/schema.ts` and `lib/admin/roles.ts` for
 * the hand-maintained, literal-typed refinements of those columns.
 *
 * It is committed to version control so that CI type-checks against the same
 * schema the application expects.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admin_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          role: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      guides: {
        Row: {
          avatar_alt: string | null
          avatar_kind: string | null
          avatar_poster: string | null
          avatar_src: string | null
          created_at: string
          id: string
          name: string
          tagline: string | null
          updated_at: string
        }
        Insert: {
          avatar_alt?: string | null
          avatar_kind?: string | null
          avatar_poster?: string | null
          avatar_src?: string | null
          created_at?: string
          id?: string
          name: string
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          avatar_alt?: string | null
          avatar_kind?: string | null
          avatar_poster?: string | null
          avatar_src?: string | null
          created_at?: string
          id?: string
          name?: string
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      hosts: {
        Row: {
          avatar_alt: string | null
          avatar_kind: string | null
          avatar_poster: string | null
          avatar_src: string | null
          created_at: string
          id: string
          name: string
          tagline: string | null
          updated_at: string
        }
        Insert: {
          avatar_alt?: string | null
          avatar_kind?: string | null
          avatar_poster?: string | null
          avatar_src?: string | null
          created_at?: string
          id?: string
          name: string
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          avatar_alt?: string | null
          avatar_kind?: string | null
          avatar_poster?: string | null
          avatar_src?: string | null
          created_at?: string
          id?: string
          name?: string
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      itinerary_days: {
        Row: {
          created_at: string
          day_number: number
          id: string
          summary: string
          title: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_number: number
          id?: string
          summary: string
          title: string
          trip_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_number?: number
          id?: string
          summary?: string
          title?: string
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_days_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_accommodation: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          media_id: string | null
          name: string | null
          nights: number | null
          trip_departure_id: string
          type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          media_id?: string | null
          name?: string | null
          nights?: number | null
          trip_departure_id: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          media_id?: string | null
          name?: string | null
          nights?: number | null
          trip_departure_id?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_accommodation_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "trip_media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_accommodation_trip_departure_id_fkey"
            columns: ["trip_departure_id"]
            isOneToOne: false
            referencedRelation: "trip_departures"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_departures: {
        Row: {
          capacity: number | null
          created_at: string
          departure_date: string
          guide_id: string | null
          id: string
          price_amount: number | null
          price_currency: string | null
          return_date: string | null
          seats_confirmed: number
          seats_reserved: number
          status: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          departure_date: string
          guide_id?: string | null
          id?: string
          price_amount?: number | null
          price_currency?: string | null
          return_date?: string | null
          seats_confirmed?: number
          seats_reserved?: number
          status?: string
          trip_id: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          departure_date?: string
          guide_id?: string | null
          id?: string
          price_amount?: number | null
          price_currency?: string | null
          return_date?: string | null
          seats_confirmed?: number
          seats_reserved?: number
          status?: string
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_departures_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_departures_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_exclusions: {
        Row: {
          created_at: string
          display_order: number
          id: string
          label: string
          trip_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          label: string
          trip_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          label?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_exclusions_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_extras: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          name: string
          price_amount: number | null
          price_currency: string | null
          trip_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name: string
          price_amount?: number | null
          price_currency?: string | null
          trip_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name?: string
          price_amount?: number | null
          price_currency?: string | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_extras_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_faqs: {
        Row: {
          answer: string
          created_at: string
          display_order: number
          id: string
          question: string
          trip_id: string
        }
        Insert: {
          answer: string
          created_at?: string
          display_order?: number
          id?: string
          question: string
          trip_id: string
        }
        Update: {
          answer?: string
          created_at?: string
          display_order?: number
          id?: string
          question?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_faqs_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_important_notes: {
        Row: {
          category: string | null
          created_at: string
          detail: string
          display_order: number
          id: string
          title: string
          trip_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          detail: string
          display_order?: number
          id?: string
          title: string
          trip_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          detail?: string
          display_order?: number
          id?: string
          title?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_important_notes_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_inclusions: {
        Row: {
          created_at: string
          display_order: number
          id: string
          label: string
          trip_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          label: string
          trip_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          label?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_inclusions_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_media: {
        Row: {
          alt: string | null
          created_at: string
          display_order: number
          focal_point: string | null
          id: string
          is_hero: boolean
          kind: string
          poster: string | null
          src: string | null
          trip_id: string
        }
        Insert: {
          alt?: string | null
          created_at?: string
          display_order?: number
          focal_point?: string | null
          id?: string
          is_hero?: boolean
          kind: string
          poster?: string | null
          src?: string | null
          trip_id: string
        }
        Update: {
          alt?: string | null
          created_at?: string
          display_order?: number
          focal_point?: string | null
          id?: string
          is_hero?: boolean
          kind?: string
          poster?: string | null
          src?: string | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_media_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_meeting_points: {
        Row: {
          created_at: string
          id: string
          instructions: string | null
          location: string
          meeting_time: string | null
          trip_departure_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          instructions?: string | null
          location: string
          meeting_time?: string | null
          trip_departure_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          instructions?: string | null
          location?: string
          meeting_time?: string | null
          trip_departure_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_meeting_points_trip_departure_id_fkey"
            columns: ["trip_departure_id"]
            isOneToOne: true
            referencedRelation: "trip_departures"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_policy_sections: {
        Row: {
          body: string
          created_at: string
          display_order: number
          id: string
          kind: string
          title: string
          trip_id: string
        }
        Insert: {
          body: string
          created_at?: string
          display_order?: number
          id?: string
          kind: string
          title: string
          trip_id: string
        }
        Update: {
          body?: string
          created_at?: string
          display_order?: number
          id?: string
          kind?: string
          title?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_policy_sections_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_transport: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          mode: string
          trip_departure_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          mode: string
          trip_departure_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          mode?: string
          trip_departure_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_transport_trip_departure_id_fkey"
            columns: ["trip_departure_id"]
            isOneToOne: false
            referencedRelation: "trip_departures"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          content_status: string
          country: string
          created_at: string
          destination: string
          duration_nights: number
          host_id: string | null
          id: string
          overview: string
          published_at: string | null
          review_notes: string | null
          slug: string
          source_reference: string | null
          style_scores: Json
          tagline: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content_status?: string
          country: string
          created_at?: string
          destination: string
          duration_nights: number
          host_id?: string | null
          id?: string
          overview: string
          published_at?: string | null
          review_notes?: string | null
          slug: string
          source_reference?: string | null
          style_scores?: Json
          tagline?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content_status?: string
          country?: string
          created_at?: string
          destination?: string
          duration_nights?: number
          host_id?: string | null
          id?: string
          overview?: string
          published_at?: string | null
          review_notes?: string | null
          slug?: string
          source_reference?: string | null
          style_scores?: Json
          tagline?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trips_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "hosts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_admin_role: { Args: never; Returns: string }
      trip_departure_is_visible: {
        Args: { p_departure_id: string }
        Returns: boolean
      }
      trip_is_published: { Args: { p_trip_id: string }; Returns: boolean }
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
    Enums: {},
  },
} as const

