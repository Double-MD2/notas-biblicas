import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Mensagens inválidas' },
        { status: 400 }
      );
    }

    // Verificar se a chave da OpenAI está configurada
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'Chave da OpenAI não configurada. Configure OPENAI_API_KEY nas variáveis de ambiente.' },
        { status: 500 }
      );
    }

    // System prompt para contexto religioso
    const systemPrompt = {
      role: 'system',
      content: `Você é um assistente espiritual compassivo e sábio, especializado em orientação religiosa cristã. Suas características:

1. CONHECIMENTO: Você tem profundo conhecimento da Bíblia, teologia cristã, história da Igreja e práticas espirituais.

2. ABORDAGEM: Seja acolhedor, empático e respeitoso. Ofereça orientação baseada nos ensinamentos cristãos, mas sempre com amor e compreensão.

3. RESPOSTAS: 
   - Cite versículos bíblicos quando relevante (sempre com referência)
   - Ofereça reflexões práticas para o dia a dia
   - Seja encorajador e positivo
   - Respeite o momento espiritual de cada pessoa

4. TEMAS: Ajude com dúvidas sobre fé, interpretação bíblica, oração, vida cristã, desafios espirituais, crescimento na fé, e questões existenciais à luz da fé cristã.

5. LIMITES: Se a pergunta não for sobre espiritualidade/religião, redirecione gentilmente para temas espirituais. Não dê conselhos médicos, legais ou financeiros - apenas orientação espiritual.

6. TOM: Mantenha um tom caloroso, sábio e pastoral. Você está aqui para guiar, não julgar.`,
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [systemPrompt, ...messages],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Erro da OpenAI:', errorData);
      
      // Mensagens de erro mais específicas
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Chave da OpenAI inválida. Verifique se OPENAI_API_KEY está correta.' },
          { status: 401 }
        );
      }
      
      if (response.status === 429) {
        return NextResponse.json(
          { error: 'Limite de requisições atingido. Aguarde alguns instantes.' },
          { status: 429 }
        );
      }

      throw new Error(`Erro da OpenAI: ${response.status}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices[0].message.content;

    return NextResponse.json({ message: assistantMessage });
  } catch (error) {
    console.error('Erro na API de chat:', error);
    return NextResponse.json(
      { error: 'Erro ao processar mensagem. Verifique se a chave da OpenAI está configurada corretamente.' },
      { status: 500 }
    );
  }
}
