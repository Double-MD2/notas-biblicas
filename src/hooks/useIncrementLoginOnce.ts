'use client';

import { useEffect, useRef } from 'react';
import { callIncrementLoginStats } from '@/lib/auth-utils';
import { supabase } from '@/lib/supabase';

/**
 * Hook que chama increment_login_stats APENAS 1 vez por sessão
 * Usa bloqueio em memória para evitar chamadas duplicadas
 */
export function useIncrementLoginOnce() {
  const hasCalledRef = useRef(false);
  const isCallingRef = useRef(false);

  useEffect(() => {
    // Executar apenas no cliente
    if (typeof window === 'undefined') return;

    // Se já chamou ou está chamando, não fazer nada
    if (hasCalledRef.current || isCallingRef.current) {
      console.log('[useIncrementLoginOnce] ⏭️  Já executado ou em execução - pulando');
      return;
    }

    const incrementLogin = async () => {
      try {
        // Marcar como "chamando" para evitar race conditions
        isCallingRef.current = true;

        // Verificar se há usuário autenticado
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          console.log('[useIncrementLoginOnce] ⏭️  Nenhuma sessão encontrada - não incrementando');
          isCallingRef.current = false;
          return;
        }

        console.log('[useIncrementLoginOnce] 🚀 Chamando increment_login_stats...');

        // Chamar a função util
        const result = await callIncrementLoginStats();

        if (result.success) {
          console.log('[useIncrementLoginOnce] ✅ Login incrementado com sucesso');
          hasCalledRef.current = true; // Marcar como executado
        } else {
          console.error('[useIncrementLoginOnce] ❌ Erro ao incrementar login:', result.error);
        }
      } catch (error) {
        console.error('[useIncrementLoginOnce] ❌ Erro inesperado:', error);
      } finally {
        isCallingRef.current = false;
      }
    };

    incrementLogin();
  }, []); // Array vazio = executa apenas 1 vez no mount

  return null;
}
