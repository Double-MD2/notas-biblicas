'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, BookOpen, Sparkles } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Olá! Sou seu assistente espiritual cristão. Como posso ajudá-lo hoje? Posso conversar sobre a Bíblia, fé, oração, reflexões bíblicas e sua jornada espiritual.'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    
    // Adicionar mensagem do usuário
    const newMessages = [...messages, { role: 'user' as const, content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // Chamar o endpoint /api/chat-free
      const res = await fetch('/api/chat-free', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage,
          history: messages.slice(-6) // Últimas 6 mensagens para contexto
        })
      });

      // Ler o corpo ANTES de verificar response.ok
      const ct = res.headers.get('content-type') || '';
      const payload = ct.includes('application/json') 
        ? await res.json() 
        : { raw: await res.text() };

      // Se response.ok for false, NÃO lançar erro - exibir na UI
      if (!res.ok) {
        console.error({
          status: res.status,
          url: res.url,
          payload
        });

        // Exibir mensagem de erro na UI
        const errorMessage = payload.error || payload.answer || `Erro (status ${res.status})`;
        
        setMessages([...newMessages, { 
          role: 'assistant', 
          content: errorMessage
        }]);
        return;
      }

      // Sucesso: adicionar resposta do assistente
      setMessages([...newMessages, { 
        role: 'assistant', 
        content: payload.answer || 'Desculpe, não consegui gerar uma resposta.'
      }]);

    } catch (error) {
      console.error('Erro ao enviar mensagem:', {
        error,
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      
      // Tratar timeout/CORS com mensagem amigável
      let errorMessage = '❌ Desculpe, ocorreu um erro ao processar sua mensagem.';
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = '❌ Erro de conexão. Verifique sua internet e tente novamente.';
      }
      
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: errorMessage
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col bg-gradient-to-b from-pink-50 to-white" style={{ height: 'calc(100vh - 80px)' }}>
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-pink-100 flex-shrink-0">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-pink-500 rounded-full flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Chat Espiritual</h1>
              <p className="text-xs text-gray-500">Converse sobre fé e Bíblia</p>
            </div>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="container mx-auto max-w-3xl">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-pink-400 to-pink-500 text-white'
                    : 'bg-white shadow-md text-gray-800 border border-pink-100'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-pink-500" />
                    <span className="text-xs font-semibold text-pink-600">Assistente Cristão</span>
                  </div>
                )}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start mb-4">
              <div className="bg-white shadow-md rounded-2xl px-4 py-3 border border-pink-100">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-pink-500 animate-spin" />
                  <span className="text-sm text-gray-600">Pensando...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-pink-100 shadow-lg flex-shrink-0">
        <div className="container mx-auto max-w-3xl px-4 py-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunte sobre a Bíblia, fé, oração..."
              disabled={isLoading}
              className="flex-1 px-4 py-3 border border-pink-200 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-gradient-to-br from-pink-400 to-pink-500 text-white p-3 rounded-full hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
            >
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Send className="w-6 h-6" />
              )}
            </button>
          </form>
          
          <p className="text-xs text-center text-gray-400 mt-2">
            Chat bíblico gratuito • Powered by Gemini AI
          </p>
        </div>
      </div>
    </div>
  );
}
