'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface ActivityDay {
  activity_date: string;
}

export function useWeekStreak() {
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [serverToday, setServerToday] = useState<string | null>(null);

  /**
   * Buscar data "hoje" do servidor no fuso America/Sao_Paulo
   * Fonte única de verdade
   */
  const fetchServerDate = useCallback(async () => {
    try {
      const response = await fetch('/api/server-date');
      const data = await response.json();
      
      if (data.today) {
        setServerToday(data.today);
        console.log('[useWeekStreak] ✅ server_today atualizado:', data.today);
      }
    } catch (error) {
      console.error('[useWeekStreak] Erro ao buscar server_today:', error);
    }
  }, []);

  const loadStreak = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.log('[useWeekStreak] Sem sessão, não carregando streak');
        setStreak(0);
        setLoading(false);
        return;
      }

      if (!serverToday) {
        console.log('[useWeekStreak] Aguardando server_today...');
        return;
      }

      // Buscar últimos 365 dias de atividade para calcular streak
      const { data, error } = await supabase
        .from('user_week_activity')
        .select('activity_date')
        .eq('user_id', session.user.id)
        .order('activity_date', { ascending: false })
        .limit(365);

      if (error) {
        console.error('[useWeekStreak] Erro ao carregar atividades:', error);
        setStreak(0);
        setLoading(false);
        return;
      }

      // Calcular streak usando server_today como referência
      const calculatedStreak = calculateStreak(data || [], serverToday);
      setStreak(calculatedStreak);

      console.log('[useWeekStreak] ✅ Streak calculado:', calculatedStreak, 'atividades:', data?.length);

      setLoading(false);
    } catch (err) {
      console.error('[useWeekStreak] Exceção ao carregar streak:', err);
      setStreak(0);
      setLoading(false);
    }
  }, [serverToday]);

  /**
   * Calcula streak de dias consecutivos a partir de server_today voltando no tempo
   * Se houver pelo menos um registro, streak mínimo = 1
   */
  const calculateStreak = (activities: ActivityDay[], today: string): number => {
    if (!activities || activities.length === 0 || !today) {
      console.log('[useWeekStreak] Sem atividades ou server_today, streak = 0');
      return 0;
    }

    // Criar set de datas para busca rápida
    const activityDates = new Set(activities.map(a => a.activity_date));
    
    console.log('[useWeekStreak] Datas de atividade:', Array.from(activityDates));
    console.log('[useWeekStreak] Server today:', today);

    // Calcular streak a partir de server_today voltando no tempo
    let streak = 0;
    let checkDate = today;

    // Verificar dias consecutivos a partir de hoje
    while (activityDates.has(checkDate)) {
      streak++;
      console.log('[useWeekStreak] Dia consecutivo encontrado:', checkDate, 'streak:', streak);
      
      // Voltar um dia
      const date = new Date(checkDate + 'T00:00:00');
      date.setDate(date.getDate() - 1);
      checkDate = date.toISOString().split('T')[0];
    }

    console.log('[useWeekStreak] Streak final calculado:', streak);

    // Garantir que streak mínimo = 1 se houver pelo menos um registro
    return streak > 0 ? streak : (activities.length > 0 ? 1 : 0);
  };

  useEffect(() => {
    // Obter data do servidor e carregar streak
    fetchServerDate();

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

    // Atualizar server_today ao voltar do background
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[useWeekStreak] App voltou ao foco, atualizando server_today...');
        fetchServerDate();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchServerDate, loadStreak]);

  // Carregar streak quando serverToday mudar
  useEffect(() => {
    if (serverToday) {
      loadStreak();
    }
  }, [serverToday, loadStreak]);

  return { streak, loading, serverToday };
}
