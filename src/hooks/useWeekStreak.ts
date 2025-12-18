'use client';

import { useEffect, useState } from 'react';
import { checkSupabaseReady, safeSupabaseQuery } from '@/lib/supabase-guard';
import { supabase } from '@/lib/supabase';

interface ActivityDay {
  activity_date: string;
}

/**
 * Retorna a data atual no fuso America/Sao_Paulo no formato YYYY-MM-DD
 * CRÍTICO: Garante que o "dia atual" seja sempre baseado no horário local do usuário
 */
const getTodayInBrazil = (): string => {
  const nowUTC = new Date();
  
  // Converter para string no fuso America/Sao_Paulo
  const brazilDateString = nowUTC.toLocaleString('en-US', { 
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  // Parsear a string no formato MM/DD/YYYY para YYYY-MM-DD
  const [month, day, year] = brazilDateString.split(/[\/,\s]+/);
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

/**
 * Cria um objeto Date representando uma data específica no fuso America/Sao_Paulo
 * @param dateString - Data no formato YYYY-MM-DD
 */
const createBrazilDate = (dateString: string): Date => {
  // Criar data no fuso local do Brasil (sem conversão UTC)
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day, 0, 0, 0, 0);
  return date;
};

export function useWeekStreak() {
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStreak();

    // Listener para atualizar quando RPC for chamada
    const channel = supabase
      .channel('week_activity_streak_sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_week_activity',
        },
        () => {
          console.log('[useWeekStreak] Mudança detectada, recarregando streak...');
          loadStreak();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadStreak = async () => {
    try {
      // VALIDAÇÃO CRÍTICA: Verificar se Supabase está pronto
      const guard = await checkSupabaseReady();

      if (!guard.isReady) {
        console.log('[useWeekStreak] ⏭️ Supabase não está pronto:', guard.error);
        console.log('[useWeekStreak] Aguardando autenticação antes de carregar streak');
        setStreak(0);
        setLoading(false);
        return;
      }

      const userId = guard.user!.id;
      console.log('[useWeekStreak] ✅ Carregando streak para usuário:', userId);

      // Buscar últimos 365 dias de atividade para calcular streak
      const { data, error } = await safeSupabaseQuery(
        supabase
          .from('user_week_activity')
          .select('activity_date')
          .eq('user_id', userId)
          .order('activity_date', { ascending: false })
          .limit(365)
      );

      if (error) {
        console.log('[useWeekStreak] ⚠️ Erro ao carregar atividades:', error);
        
        // Se erro de conexão, tentar novamente após 2 segundos
        if (error.includes('Failed to fetch') || error.includes('fetch')) {
          console.log('[useWeekStreak] Tentando novamente em 2s...');
          setTimeout(() => loadStreak(), 2000);
          return;
        }
        
        setStreak(0);
        setLoading(false);
        return;
      }

      // Calcular streak (dias consecutivos a partir de hoje, ignorando dias futuros)
      const calculatedStreak = calculateStreak(data || []);
      setStreak(calculatedStreak);

      console.log('[useWeekStreak] ✅ Streak calculado:', calculatedStreak);

      setLoading(false);
    } catch (err) {
      console.log('[useWeekStreak] ⚠️ Exceção ao carregar streak (não crítico)');
      setStreak(0);
      setLoading(false);
    }
  };

  /**
   * Calcula streak de dias consecutivos até HOJE (ignorando dias futuros)
   * Usa fuso America/Sao_Paulo para determinar "hoje"
   * 
   * CORREÇÃO: Usa getTodayInBrazil() para garantir que o cálculo do streak
   * seja baseado no dia atual do usuário no Brasil, não em UTC
   */
  const calculateStreak = (activities: ActivityDay[]): number => {
    if (!activities || activities.length === 0) return 0;

    // Obter "hoje" no fuso America/Sao_Paulo (formato YYYY-MM-DD)
    const todayString = getTodayInBrazil();

    // Filtrar apenas atividades até hoje (ignorar dias futuros)
    const pastActivities = activities.filter(activity => activity.activity_date <= todayString);

    if (pastActivities.length === 0) return 0;

    // Ordenar atividades por data (mais recente primeiro)
    const sortedActivities = [...pastActivities].sort((a, b) => 
      new Date(b.activity_date).getTime() - new Date(a.activity_date).getTime()
    );

    // Verificar se a atividade mais recente é de hoje ou ontem
    const mostRecentDate = sortedActivities[0].activity_date;
    
    // Calcular "ontem" no fuso America/Sao_Paulo
    const todayDate = createBrazilDate(todayString);
    const yesterday = new Date(todayDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    // Se a atividade mais recente não é de hoje nem de ontem, streak = 0
    if (mostRecentDate !== todayString && mostRecentDate !== yesterdayString) {
      return 0;
    }

    // Calcular streak a partir da atividade mais recente
    let streak = 1;
    let currentDate = createBrazilDate(mostRecentDate);
    currentDate.setDate(currentDate.getDate() - 1); // Começar do dia anterior

    // Verificar dias consecutivos
    for (let i = 1; i < sortedActivities.length; i++) {
      const activityDate = sortedActivities[i].activity_date;
      const expectedDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;

      // Se a atividade é do dia esperado (consecutivo)
      if (activityDate === expectedDate) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        // Se não é consecutivo, parar a contagem
        break;
      }
    }

    return streak;
  };

  return { streak, loading };
}
