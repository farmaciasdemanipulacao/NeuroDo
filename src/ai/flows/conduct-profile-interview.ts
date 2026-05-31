
'use server';

import { z } from 'zod';
import { openai, initError, model } from '@/ai/openai-client';

const SYSTEM_PROMPT = `Você é um especialista em análise de perfil comportamental, treinado nas metodologias DISC, MBTI, e Eneagrama. Sua missão é conduzir uma entrevista conversacional e amigável com um membro da equipe para descobrir seus padrões de comportamento no trabalho.

REGRAS:
1.  **UMA PERGUNTA POR VEZ**: Sempre responda com APENAS UMA pergunta.
2.  **SEJA AMIGÁVEL E CONVERSACIONAL**: Não pareça um robô. Use uma linguagem natural.
3.  **SIGA UMA ESTRATÉGIA**: Suas perguntas devem seguir uma sequência lógica para explorar diferentes facetas do perfil do usuário:
    *   Comece com perguntas abertas sobre como a pessoa gosta de trabalhar.
    *   Passe para cenários hipotéticos (ex: "Imagine que você recebe um projeto com prazo apertado...").
    *   Explore como ela lida com conflitos ou feedback.
4.  **SEJA BREVE**: Faça perguntas curtas e diretas.
5.  **ADAPTE-SE**: Baseie sua próxima pergunta na resposta anterior do usuário para aprofundar um ponto interessante.
6.  **NUNCA ANALISE O PERFIL DIRETAMENTE COM O USUÁRIO**: Sua função é apenas fazer as perguntas. A análise será feita em outro processo.
7.  **PROGRESSÃO**: Faça no máximo 3 perguntas no total. Após a terceira resposta do usuário, sua mensagem final DEVE ser: "Perfeito, muito obrigado(a) pelas suas respostas! Isso é tudo que preciso por agora. Agradeço seu tempo!".
`;

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

const ConductProfileInterviewInputSchema = z.object({
  userName: z.string(),
  history: z.array(ChatMessageSchema).describe("O histórico da conversa até agora."),
});

export type ConductProfileInterviewInput = z.infer<typeof ConductProfileInterviewInputSchema>;

const ConductProfileInterviewOutputSchema = z.object({
  response: z.string().describe("A próxima pergunta da entrevista."),
});

export type ConductProfileInterviewOutput = z.infer<typeof ConductProfileInterviewOutputSchema>;

export async function conductProfileInterview(input: ConductProfileInterviewInput): Promise<{ response?: string; error?: string; errorCode?: string }> {
  if (!openai || initError) {
    console.error('OpenAI Init Error:', initError);
    return { error: `Configuração do servidor: ${initError}`, errorCode: 'INIT_ERROR' };
  }
  const validatedInput = ConductProfileInterviewInputSchema.safeParse(input);
  if (!validatedInput.success) {
    throw new Error("Entrada inválida.");
  }

  const { history, userName } = validatedInput.data;
  const finalSystemPrompt = `${SYSTEM_PROMPT}\nO nome do usuário que você está entrevistando é ${userName}.`;

  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: finalSystemPrompt },
    ...history.map(msg => ({ role: msg.role, content: msg.content })),
  ];
  
  try {
    const response = await openai.chat.completions.create({
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 150,
    });

    const responseMessage = response.choices[0]?.message?.content;

    if (typeof responseMessage !== 'string' || responseMessage.trim() === '') {
        return { response: 'Obrigado(a)! Agradeço seu tempo.' };
    }

    return { response: responseMessage };

  } catch (error: any) {
    console.error('Erro na comunicação com a API da OpenAI:', error);
    const status = error?.status ?? error?.response?.status;
    if (status === 401) return { error: 'OPENAI_API_KEY inválida ou expirada.', errorCode: 'INVALID_API_KEY' };
    if (status === 429) return { error: 'Limite de requisições atingido.', errorCode: 'RATE_LIMIT' };
    return { error: `Desculpe, tive um problema técnico momentâneo. Detalhes: ${error?.message ?? 'desconhecido'}`, errorCode: 'OPENAI_ERROR' };
  }
}
