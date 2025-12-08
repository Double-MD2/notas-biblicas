'use client';

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Hook para registrar login diário automaticamente
 * Chama a função RPC log_daily_login do Supabase
 * 
 * Estratégia de gatilhos:
 * - Após autenticação bem-sucedida
 * - Ao restaurar sessão válida
 * - Ao retornar do background (visibilitychange)
 * 
 * Throttle: 2 minutos entre chamadas para reduzir ruído de rede
 */

const THROTTLE_INTERVAL = 2 * 60 * 1000; // 2 minutos em ms

export function useDailyLogin() {
  const lastCallRef = useRef<number>(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isCallingRef = useRef(false);

  const logDailyLogin = useCallback(async (retryCount = 0): Promise<boolean> => {
    // Evitar chamadas simultâneas
    if (isCallingRef.current) {
      console.log('[DAILY_LOGIN] Chamada já em andamento, ignorando...');
      return false;
    }

    // Throttle: verificar se já chamou recentemente
    const now = Date.now();
    if (now - lastCallRef.current < THROTTLE_INTERVAL) {
      console.log('[DAILY_LOGIN] Throttle ativo, ignorando chamada');
      return false;
    }

    try {
      isCallingRef.current = true;

      // Verificar se tem sessão válida
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.log('[DAILY_LOGIN] Sem sessão válida, não registrando login');
        return false;
      }

      console.log('[DAILY_LOGIN] Chamando RPC log_daily_login...');
      
      // Chamar função RPC (sem parâmetros - usa auth.uid() no servidor)
      const { data, error } = await supabase.rpc('log_daily_login');

      if (error) {
        // Erro 401/403 = sem permissão, não tentar novamente
        if (error.code === 'PGRST301' || error.message.includes('401') || error.message.includes('403')) {
          console.error('[DAILY_LOGIN] ❌ Sem permissão (401/403), não tentando novamente');
          return false;
        }

        // Erro de rede/timeout = tentar novamente com backoff exponencial
        console.error('[DAILY_LOGIN] ⚠️ Erro na chamada RPC:', error);

        if (retryCount < 3) {
          const backoffDelay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
          console.log(`[DAILY_LOGIN] Tentando novamente em ${backoffDelay}ms (tentativa ${retryCount + 1}/3)`);

          retryTimeoutRef.current = setTimeout(() => {
            logDailyLogin(retryCount + 1);
          }, backoffDelay);
        }

        return false;
      }

      // Sucesso!
      lastCallRef.current = now;
      console.log('[DAILY_LOGIN] ✅ Login diário registrado com sucesso:', data);

      // Telemetria
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'daily_login_logged', {
          user_id: session.user.id,
        });
      }

      return true;
    } catch (err) {
      console.error('[DAILY_LOGIN] ❌ Exceção ao registrar login:', err);
      return false;
    } finally {
      isCallingRef.current = false;
    }
  }, []);

  useEffect(() => {
    // Registrar ao montar componente (sessão restaurada)
    logDailyLogin();

    // Listener para visibilitychange (app voltou do background)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[DAILY_LOGIN] App voltou ao foco, registrando login...');
        logDailyLogin();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [logDailyLogin]);

  return { logDailyLogin };
}
