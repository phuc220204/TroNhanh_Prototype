import { createClient } from "@supabase/supabase-js";
import { config } from "./config";

/**
 * Shared Supabase Client instance for the entire application.
 * Utilizes standard public/anon key and supports row-level security.
 */
export const supabase = createClient(config.supabase.url, config.supabase.anonKey);
