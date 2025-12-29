import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Criar client do servidor com ANON KEY (não service role)
// Isso garante que RLS será respeitado e apenas dados do usuário autenticado serão acessíveis
function createServerClient(authToken?: string) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Variáveis de ambiente do Supabase não configuradas');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: authToken ? {
        Authorization: `Bearer ${authToken}`,
      } : {},
    },
  });
}

// Extrair token do header Authorization
function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7); // Remove "Bearer "
}

// GET - Buscar dados do usuário autenticado
export async function GET(request: NextRequest) {
  try {
    // Extrair token de autenticação
    const token = extractToken(request);
    if (!token) {
      return NextResponse.json(
        { error: 'Token de autenticação não fornecido' },
        { status: 401 }
      );
    }

    // Criar client com token do usuário
    const supabase = createServerClient(token);

    // Validar usuário autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Token inválido ou expirado' },
        { status: 401 }
      );
    }

    // Usar o userId do usuário autenticado (NUNCA aceitar do cliente)
    const userId = user.id;

    // Buscar dados do usuário (RLS garante que só acessa seus próprios dados)
    const { data: userData, error: userDataError } = await supabase
      .from('user_data')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (userDataError && userDataError.code !== 'PGRST116') {
      throw userDataError;
    }

    // Buscar histórico de acesso (RLS garante que só acessa seus próprios dados)
    const { data: accessHistory, error: historyError } = await supabase
      .from('access_history')
      .select('*')
      .eq('user_id', userId)
      .order('access_date', { ascending: true });

    if (historyError) {
      throw historyError;
    }

    return NextResponse.json({
      userData: userData || null,
      accessHistory: accessHistory || []
    });
  } catch (error: any) {
    console.error('Erro ao buscar dados do usuário:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Criar ou atualizar dados do usuário autenticado
export async function POST(request: NextRequest) {
  try {
    // Extrair token de autenticação
    const token = extractToken(request);
    if (!token) {
      return NextResponse.json(
        { error: 'Token de autenticação não fornecido' },
        { status: 401 }
      );
    }

    // Criar client com token do usuário
    const supabase = createServerClient(token);

    // Validar usuário autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Token inválido ou expirado' },
        { status: 401 }
      );
    }

    // Usar o userId do usuário autenticado (IGNORAR userId do body)
    const userId = user.id;

    const body = await request.json();
    const { consecutiveDays, lastAccessDate, onboardingCompleted, trialStartedAt } = body;

    // Validar dados obrigatórios
    if (consecutiveDays === undefined || !lastAccessDate) {
      return NextResponse.json(
        { error: 'Dados obrigatórios não fornecidos' },
        { status: 400 }
      );
    }

    // Verificar se já existe dados do usuário (RLS garante que só acessa seus próprios dados)
    const { data: existingData } = await supabase
      .from('user_data')
      .select('*')
      .eq('user_id', userId)
      .single();

    let result;
    if (existingData) {
      // Atualizar dados existentes
      const updateData: any = {
        consecutive_days: consecutiveDays,
        last_access_date: lastAccessDate,
        onboarding_completed: onboardingCompleted,
        updated_at: new Date().toISOString()
      };

      // Adicionar trial_started_at apenas se fornecido
      if (trialStartedAt !== undefined) {
        updateData.trial_started_at = trialStartedAt;
      }

      const { data, error } = await supabase
        .from('user_data')
        .update(updateData)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Criar novos dados
      const insertData: any = {
        user_id: userId,
        consecutive_days: consecutiveDays || 0,
        last_access_date: lastAccessDate,
        onboarding_completed: onboardingCompleted || false
      };

      // Adicionar trial_started_at apenas se fornecido
      if (trialStartedAt !== undefined) {
        insertData.trial_started_at = trialStartedAt;
      }

      const { data, error } = await supabase
        .from('user_data')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Erro ao salvar dados do usuário:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
