import { createClient } from "@supabase/supabase-js";
import { SUPABASE_SCHEMA } from "./constants";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error("Variables Supabase manquantes dans .env.local");
}

export const supabase = createClient(url, anonKey, {
  db: {
    schema: SUPABASE_SCHEMA,
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
