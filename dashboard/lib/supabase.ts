import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY não configuradas (ver dashboard/.env.local)"
  );
}

// Cliente único, somente leitura (RLS: policy public_select nas 4 tabelas).
// Importar este client em todas as seções — não criar outra instância.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
