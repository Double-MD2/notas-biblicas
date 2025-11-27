import { createClient } from '@supabase/supabase-js';

// Ler variáveis de ambiente com fallback seguro
const supabaseUrl = typeof window !== 'undefined' 
  ? (window as any).__NEXT_DATA__?.props?.pageProps?.env?.NEXT_PUBLIC_SUPABASE_URL || ''
  : process.env.NEXT_PUBLIC_SUPABASE_URL || '';

const supabaseAnonKey = typeof window !== 'undefined'
  ? (window as any).__NEXT_DATA__?.props?.pageProps?.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Validação robusta das variáveis de ambiente (apenas no desenvolvimento)
if (process.env.NODE_ENV === 'development' && (!supabaseUrl || !supabaseAnonKey)) {
  console.warn('⚠️ Variáveis de ambiente do Supabase não configuradas.');
  console.warn('Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no arquivo .env.local');
}

// Criar cliente Supabase com validação
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
    global: {
      headers: {
        'x-application-name': 'plano-diario',
      },
    },
  }
);

// Função helper para verificar se o Supabase está configurado corretamente
export const isSupabaseConfigured = (): boolean => {
  const isConfigured = Boolean(
    supabaseUrl && 
    supabaseAnonKey && 
    supabaseUrl !== '' && 
    supabaseAnonKey !== '' &&
    supabaseUrl !== 'https://placeholder.supabase.co' &&
    supabaseAnonKey !== 'placeholder-key'
  );
  
  if (!isConfigured && process.env.NODE_ENV === 'development') {
    console.warn('⚠️ Supabase não está configurado. Configure as variáveis de ambiente.');
  }
  
  return isConfigured;
};

// Tipos para o banco de dados
export interface User {
  id: string;
  email: string;
  name?: string;
  created_at: string;
  updated_at: string;
}

export interface UserData {
  id: string;
  user_id: string;
  consecutive_days: number;
  last_access_date: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface AccessHistory {
  id: string;
  user_id: string;
  access_date: string;
  accessed: boolean;
  created_at: string;
}
