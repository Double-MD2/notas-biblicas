import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

// Runtime Node.js (necessário para usar o driver do Supabase)
export const runtime = 'nodejs';

// Cliente Supabase com service role (para operações admin)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// POST - Incrementar loginCount e atualizar lastLoginAt
export async function POST(req: NextRequest) {
  const correlationId = randomUUID();
  
  try {
    console.log(`[LOGIN-CALLBACK] [${correlationId}] Iniciando callback de login`);
    
    // 1. Verificar autenticação
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error(`[LOGIN-CALLBACK] [${correlationId}] ❌ Sem header Authorization`);
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error(`[LOGIN-CALLBACK] [${correlationId}] ❌ Token inválido:`, authError);
      return NextResponse.json(
        { error: 'Sessão inválida ou expirada' },
        { status: 401 }
      );
    }

    const userId = user.id;
    console.log(`[LOGIN-CALLBACK] [${correlationId}] ✅ Usuário autenticado: ${userId}`);

    // 2. Buscar perfil atual
    const { data: currentProfile, error: fetchError } = await supabaseAdmin
      .from('user_profiles')
      .select('login_count')
      .eq('user_id', userId)
      .single();

    let currentLoginCount = 0;
    
    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        // Perfil não existe - será criado com loginCount = 1
        console.log(`[LOGIN-CALLBACK] [${correlationId}] ℹ️ Perfil não encontrado - criando novo`);
      } else {
        console.error(`[LOGIN-CALLBACK] [${correlationId}] ❌ Erro ao buscar perfil:`, fetchError);
        throw fetchError;
      }
    } else {
      currentLoginCount = currentProfile.login_count || 0;
    }

    // 3. Incrementar loginCount atomicamente e atualizar lastLoginAt
    const newLoginCount = currentLoginCount + 1;
    const now = new Date().toISOString();

    console.log(`[LOGIN-CALLBACK] [${correlationId}] 💾 Incrementando loginCount: ${currentLoginCount} → ${newLoginCount}`);

    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        user_id: userId,
        login_count: newLoginCount,
        last_login_at: now,
        updated_at: now,
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      console.error(`[LOGIN-CALLBACK] [${correlationId}] ❌ Erro ao atualizar:`, {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      throw error;
    }

    console.log(`[LOGIN-CALLBACK] [${correlationId}] ✅ Login registrado com sucesso!`, {
      userId,
      loginCount: data.login_count,
      lastLoginAt: data.last_login_at,
    });

    // 4. Verificar se quiz foi completo para decidir redirecionamento
    const quizCompleted = data.quiz_completed || false;
    const redirectTo = quizCompleted ? '/home' : '/onboarding';

    console.log(`[LOGIN-CALLBACK] [${correlationId}] 🔀 Redirecionamento: ${redirectTo} (quizCompleted: ${quizCompleted})`);

    return NextResponse.json({
      success: true,
      loginCount: data.login_count,
      lastLoginAt: data.last_login_at,
      quizCompleted,
      redirectTo,
      correlationId,
    });
  } catch (error: any) {
    console.error(`[LOGIN-CALLBACK] [${correlationId}] ❌ Erro inesperado:`, {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      stack: error.stack,
    });
    
    return NextResponse.json(
      { error: 'Erro ao registrar login', correlationId },
      { status: 500 }
    );
  }
}
