/**
 * Application Configuration Management
 * Centralizes and validates environment variables.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Missing env variable: VITE_SUPABASE_URL");
}

if (!supabaseAnonKey) {
  throw new Error("Missing env variable: VITE_SUPABASE_ANON_KEY");
}

export const config = {
  supabase: {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
  },
};
