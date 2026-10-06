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
      booking_participants: {
        Row: {
          booking_id: string
          created_at: string
          full_name: string
          id: string
          is_lead: boolean
        }
        Insert: {
          booking_id: string
          created_at?: string
          full_name: string
          id?: string
          is_lead?: boolean
        }
        Update: {
          booking_id?: string
          created_at?: string
          full_name?: string
          id?: string
          is_lead?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "booking_participants_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          contact_email: string
          contact_name: string
          contact_phone: string | null
          created_at: string
          expires_at: string | null
          id: string
          idempotency_key: string | null
          participant_count: number
          reference: string
          snapshot_departure_date: string
          snapshot_destination: string
          snapshot_price_amount: number
          snapshot_price_currency: string
          snapshot_return_date: string | null
          snapshot_trip_slug: string
          snapshot_trip_title: string
          status: string
          traveller_id: string | null
          trip_departure_id: string
          updated_at: string
        }
        Insert: {
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          idempotency_key?: string | null
          participant_count: number
          reference: string
          snapshot_departure_date: string
          snapshot_destination: string
          snapshot_price_amount: number
          snapshot_price_currency: string
          snapshot_return_date?: string | null
          snapshot_trip_slug: string
          snapshot_trip_title: string
          status?: string
          traveller_id?: string | null
          trip_departure_id: string
          updated_at?: string
        }
        Update: {
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          idempotency_key?: string | null
          participant_count?: number
          reference?: string
          snapshot_departure_date?: string
          snapshot_destination?: string
          snapshot_price_amount?: number
          snapshot_price_currency?: string
          snapshot_return_date?: string | null
          snapshot_trip_slug?: string
          snapshot_trip_title?: string
          status?: string
          traveller_id?: string | null
          trip_departure_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_trip_departure_id_fkey"
            columns: ["trip_departure_id"]
            isOneToOne: false
            referencedRelation: "trip_departures"
            referencedColumns: ["id"]
          },
        ]
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
      payments: {
        Row: {
          amount: number
          booking_id: string
          captured_at: string | null
          created_at: string
          currency: string
          failure_reason: string | null
          id: string
          provider: string
          provider_payment_id: string | null
          provider_reference: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          booking_id: string
          captured_at?: string | null
          created_at?: string
          currency: string
          failure_reason?: string | null
          id?: string
          provider: string
          provider_payment_id?: string | null
          provider_reference?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          booking_id?: string
          captured_at?: string | null
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          provider?: string
          provider_payment_id?: string | null
          provider_reference?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      traveller_profiles: {
        Row: {
          city: string | null
          created_at: string
          dietary_preference: string | null
          display_name: string
          id: string
          phone: string | null
          travel_interests: string[]
          travel_style: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          dietary_preference?: string | null
          display_name: string
          id?: string
          phone?: string | null
          travel_interests?: string[]
          travel_style?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string | null
          created_at?: string
          dietary_preference?: string | null
          display_name?: string
          id?: string
          phone?: string | null
          travel_interests?: string[]
          travel_style?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      booking_status_transition_is_valid: {
        Args: { p_from: string; p_to: string }
        Returns: boolean
      }
      bookings_confirm_seats: {
        Args: { p_departure_id: string; p_seats: number }
        Returns: undefined
      }
      bookings_release_seats: {
        Args: {
          p_departure_id: string
          p_from_confirmed: boolean
          p_seats: number
        }
        Returns: undefined
      }
      bookings_reserve_seats: {
        Args: { p_departure_id: string; p_seats: number }
        Returns: undefined
      }
      create_pending_booking: {
        Args: {
          p_contact_email: string
          p_contact_name: string
          p_contact_phone: string
          p_idempotency_key: string
          p_participants: Json
          p_traveller_id: string
          p_trip_departure_id: string
        }
        Returns: {
          contact_email: string
          contact_name: string
          contact_phone: string | null
          created_at: string
          expires_at: string | null
          id: string
          idempotency_key: string | null
          participant_count: number
          reference: string
          snapshot_departure_date: string
          snapshot_destination: string
          snapshot_price_amount: number
          snapshot_price_currency: string
          snapshot_return_date: string | null
          snapshot_trip_slug: string
          snapshot_trip_title: string
          status: string
          traveller_id: string | null
          trip_departure_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_admin_role: { Args: never; Returns: string }
      generate_booking_reference: { Args: never; Returns: string }
      record_payment_result: {
        Args: {
          p_failure_reason: string
          p_provider: string
          p_provider_order_id: string
          p_provider_payment_id: string
          p_reported_amount: number
          p_reported_currency: string
          p_status: string
        }
        Returns: {
          amount: number
          booking_id: string
          captured_at: string | null
          created_at: string
          currency: string
          failure_reason: string | null
          id: string
          provider: string
          provider_payment_id: string | null
          provider_reference: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      release_expired_booking_holds: { Args: never; Returns: number }
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

