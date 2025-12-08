import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface QuizStatus {
  completed: boolean;
  currentStep: number;
  lastUpdated: string | null;
}

export function useQuizStatus(userId: string | null) {
  const [quizStatus, setQuizStatus] = useState<QuizStatus>({
    completed: false,
    currentStep: 0,
    lastUpdated: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    fetchQuizStatus();
  }, [userId]);

  const fetchQuizStatus = async () => {
    if (!userId) return;

    try {
      const response = await fetch(`/api/quiz-status?userId=${userId}`);
      
      if (response.ok) {
        const data = await response.json();
        setQuizStatus(data);
      } else {
        // Se não existe, criar registro inicial
        await createInitialQuizStatus();
      }
    } catch (error) {
      console.error('Erro ao buscar status do quiz:', error);
      // Fallback para localStorage
      const localStatus = localStorage.getItem(`quiz_status_${userId}`);
      if (localStatus) {
        setQuizStatus(JSON.parse(localStatus));
      }
    } finally {
      setLoading(false);
    }
  };

  const createInitialQuizStatus = async () => {
    if (!userId) return;

    const initialStatus: QuizStatus = {
      completed: false,
      currentStep: 0,
      lastUpdated: new Date().toISOString(),
    };

    try {
      await fetch('/api/quiz-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          ...initialStatus,
        }),
      });

      setQuizStatus(initialStatus);
      
      // Salvar também no localStorage como fallback
      localStorage.setItem(`quiz_status_${userId}`, JSON.stringify(initialStatus));
    } catch (error) {
      console.error('Erro ao criar status inicial do quiz:', error);
    }
  };

  const updateQuizStatus = async (updates: Partial<QuizStatus>) => {
    if (!userId) return;

    const newStatus = {
      ...quizStatus,
      ...updates,
      lastUpdated: new Date().toISOString(),
    };

    setQuizStatus(newStatus);

    try {
      await fetch('/api/quiz-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          ...newStatus,
        }),
      });

      // Atualizar localStorage também
      localStorage.setItem(`quiz_status_${userId}`, JSON.stringify(newStatus));
    } catch (error) {
      console.error('Erro ao atualizar status do quiz:', error);
      // Mesmo com erro, salvar no localStorage
      localStorage.setItem(`quiz_status_${userId}`, JSON.stringify(newStatus));
    }
  };

  const markQuizCompleted = async () => {
    await updateQuizStatus({
      completed: true,
      currentStep: 16, // 16 etapas completas
    });

    // Telemetria
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'quiz_completed', {
        user_id: userId,
      });
    }
  };

  const updateCurrentStep = async (step: number) => {
    await updateQuizStatus({
      currentStep: step,
    });

    // Telemetria
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'quiz_step_view', {
        user_id: userId,
        step_number: step,
      });
    }
  };

  return {
    quizStatus,
    loading,
    updateQuizStatus,
    markQuizCompleted,
    updateCurrentStep,
  };
}
