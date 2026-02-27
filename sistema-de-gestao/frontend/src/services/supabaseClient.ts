// services/supabaseClient.ts
// Configuração do cliente Supabase

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] ERRO: Variáveis não configuradas!');
  console.error('[Supabase] VITE_SUPABASE_URL:', supabaseUrl);
  console.error('[Supabase] VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Definida' : 'UNDEFINED');
  throw new Error("Variáveis do Supabase não configuradas. Verifique o arquivo .env");
}

// Supabase client initialized

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage
  }
});
