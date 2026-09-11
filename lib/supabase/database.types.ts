/**
 * Generated Supabase database types.
 *
 * PLACEHOLDER — the schema is created in Phase 5 (docs/ROADMAP.md). This file is
 * regenerated, never hand-edited:
 *
 *   npm run db:types        (requires the Supabase CLI and SUPABASE_PROJECT_ID)
 *
 * It is committed to version control so that CI type-checks against the same
 * schema the application expects.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
