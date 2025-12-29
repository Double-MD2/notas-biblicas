import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - Buscar status do quiz do usuário
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar status do quiz no Supabase
    const { data, error } = await supabase
      .from('quiz_status')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Registro não encontrado
        return NextResponse.json(
          { 
            completed: false, 
            currentStep: 0, 
            lastUpdated: null 
          },
          { status: 200 }
        );
      }
      throw error;
    }

    return NextResponse.json({
      completed: data.completed || false,
      currentStep: data.current_step || 0,
      lastUpdated: data.last_updated || null,
    });
  } catch (error) {
    console.error('Erro ao buscar status do quiz:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar status do quiz' },
      { status: 500 }
    );
  }
}

// POST - Criar ou atualizar status do quiz
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, completed, currentStep, lastUpdated } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId é obrigatório' },
        { status: 400 }
      );
    }

    // Upsert (insert ou update) no Supabase
    const { data, error } = await supabase
      .from('quiz_status')
      .upsert({
        user_id: userId,
        completed: completed || false,
        current_step: currentStep || 0,
        last_updated: lastUpdated || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: {
        completed: data.completed,
        currentStep: data.current_step,
        lastUpdated: data.last_updated,
      },
    });
  } catch (error) {
    console.error('Erro ao salvar status do quiz:', error);
    return NextResponse.json(
      { error: 'Erro ao salvar status do quiz' },
      { status: 500 }
    );
  }
}
