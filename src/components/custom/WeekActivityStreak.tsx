'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Calendar } from 'lucide-react';
import { useWeekStreak } from '@/hooks/useWeekStreak';

interface ActivityDay {
  activity_date: string;
}

export default function WeekActivityStreak() {
  const [activities, setActivities] = useState<ActivityDay[]>([]);
  const { streak, serverToday } = useWeekStreak(); // Usar hook compartilhado com server_today
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (serverToday) {
      loadActivities();
    }

    // Listener para atualizar quando RPC for chamada
    const channel = supabase
      .channel('week_activity_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_week_activity',
        },
        () => {
          console.log('[WEEK_ACTIVITY] Mudança detectada, recarregando...');
          loadActivities();
        }
      )
      .subscribe();

    // Atualizar ao voltar do background
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && serverToday) {
        console.log('[WEEK_ACTIVITY] App voltou ao foco, recarregando...');
        loadActivities();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [serverToday]);

  const loadActivities = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.log('[WEEK_ACTIVITY] Sem sessão, não carregando atividades');
        setLoading(false);
        return;
      }

      if (!serverToday) {
        console.log('[WEEK_ACTIVITY] Aguardando server_today...');
        return;
      }

      // Buscar janela da semana atual (domingo a sábado)
      const { startDate, endDate } = getCurrentWeekWindow();
      
      const { data, error } = await supabase
        .from('user_week_activity')
        .select('activity_date')
        .eq('user_id', session.user.id)
        .gte('activity_date', startDate)
        .lte('activity_date', endDate)
        .order('activity_date', { ascending: false });

      if (error) {
        console.error('[WEEK_ACTIVITY] Erro ao carregar atividades:', error);
        setLoading(false);
        return;
      }

      setActivities(data || []);

      console.log('[WEEK_ACTIVITY] ✅ Atividades carregadas:', {
        total: data?.length || 0,
        startDate,
        endDate,
        serverToday,
        activities: data?.map(a => a.activity_date),
      });

      setLoading(false);
    } catch (err) {
      console.error('[WEEK_ACTIVITY] Exceção ao carregar atividades:', err);
      setLoading(false);
    }
  };

  /**
   * Retorna janela da semana atual (domingo a sábado) baseado em server_today
   * Sempre ancorado no domingo da semana de "hoje" (America/Sao_Paulo)
   */
  const getCurrentWeekWindow = (): { startDate: string; endDate: string } => {
    if (!serverToday) {
      return { startDate: '', endDate: '' };
    }

    const today = new Date(serverToday + 'T12:00:00Z'); // Usar meio-dia UTC para evitar problemas de fuso
    const dayOfWeek = today.getUTCDay(); // 0 = domingo, 1 = segunda, ..., 6 = sábado
    
    // Calcular o domingo da semana atual
    const sunday = new Date(today);
    sunday.setUTCDate(today.getUTCDate() - dayOfWeek);
    
    // Calcular o sábado da semana atual
    const saturday = new Date(sunday);
    saturday.setUTCDate(sunday.getUTCDate() + 6);
    
    const startDate = sunday.toISOString().split('T')[0];
    const endDate = saturday.toISOString().split('T')[0];
    
    console.log('[WEEK_ACTIVITY] Janela da semana:', { startDate, endDate, serverToday, dayOfWeek });
    
    return { startDate, endDate };
  };

  /**
   * Retorna os 7 dias da semana atual (domingo a sábado)
   * com informações sobre atividade e estado
   */
  const getWeekDays = (): { day: string; date: string; hasActivity: boolean; isToday: boolean; isFuture: boolean }[] => {
    if (!serverToday) {
      return [];
    }

    const { startDate } = getCurrentWeekWindow();
    const startDateObj = new Date(startDate + 'T12:00:00Z');
    
    // Rótulos fixos: D S T Q Q S S (domingo → sábado)
    const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
    
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(startDateObj);
      date.setUTCDate(startDateObj.getUTCDate() + index);
      const dateString = date.toISOString().split('T')[0];
      
      const hasActivity = activities.some(
        (activity) => activity.activity_date === dateString
      );

      // Hoje é igual a server_today
      const isToday = dateString === serverToday;

      // Dia futuro é qualquer dia depois de hoje (comparação de strings YYYY-MM-DD)
      const isFuture = dateString > serverToday;

      // Usar rótulo fixo baseado no índice (domingo = 0, sábado = 6)
      const day = weekDays[index];

      return { day, date: dateString, hasActivity, isToday, isFuture };
    });
  };

  /**
   * Retorna o estilo CSS para cada dia baseado no estado:
   * - Hoje (server_today): laranja (destaque)
   * - Dia com registro: amarelo (presente)
   * - Dia futuro: branco (ainda não aconteceu)
   * - Dia passado sem registro: cinza escuro (ausente)
   */
  const getDayStyle = (dayInfo: { day: string; date: string; hasActivity: boolean; isToday: boolean; isFuture: boolean }) => {
    // HOJE (server_today): destaque laranja
    if (dayInfo.isToday) {
      return 'bg-gradient-to-br from-orange-400 to-orange-500 text-white shadow-lg scale-105';
    }
    
    // DIA COM REGISTRO: presente (amarelo)
    if (dayInfo.hasActivity) {
      return 'bg-gradient-to-br from-yellow-200 to-yellow-300 text-gray-800';
    }

    // DIA FUTURO: branco com borda (ainda não aconteceu) - mais visível
    if (dayInfo.isFuture) {
      return 'bg-white border-2 border-gray-300 text-gray-600';
    }
    
    // DIA PASSADO SEM REGISTRO: cinza escuro (ausente)
    return 'bg-gray-700 text-gray-400';
  };

  if (loading || !serverToday) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
        <div className="flex justify-between gap-1.5">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="flex-1 aspect-square rounded-full bg-gray-200 max-w-[44px]"></div>
          ))}
        </div>
      </div>
    );
  }

  const weekDays = getWeekDays();

  console.log('[WEEK_ACTIVITY] Renderizando semana:', weekDays);

  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-amber-500" />
          Sua Semana
        </h2>
      </div>
      
      <div className="flex justify-between gap-1.5">
        {weekDays.map((dayInfo, index) => (
          <div key={index} className="flex flex-col items-center gap-1 flex-1 max-w-[44px]">
            <div
              className={`w-full aspect-square rounded-full flex items-center justify-center font-semibold text-xs transition-all ${getDayStyle(dayInfo)}`}
              title={`${dayInfo.date} - ${dayInfo.isToday ? 'Hoje' : dayInfo.isFuture ? 'Futuro' : dayInfo.hasActivity ? 'Presente' : 'Ausente'}`}
            >
              {dayInfo.day}
            </div>
          </div>
        ))}
      </div>

      {streak > 0 && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            🙏 Você está em uma sequência de <span className="font-bold text-orange-500">{streak} dia{streak !== 1 ? 's' : ''}</span> consecutivo{streak !== 1 ? 's' : ''}!
          </p>
        </div>
      )}
    </div>
  );
}
