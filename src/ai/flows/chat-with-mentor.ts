'use server';

/**
 * @fileOverview Interface para o chat do Mentor IA utilizando a OpenAI Chat Completions API.
 * Este arquivo atua como um Server Action para o frontend do Next.js.
 *
 * IMPORTANTE: erros são retornados como objeto { error, errorCode } em vez de lançados,
 * porque o Next.js oculta mensagens de exceções em produção.
 */

import OpenAI from 'openai';
import { z } from 'zod';
import { classifyOpenAIError, withOpenAITimeout } from '@/ai/openai-errors';

const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.NEURODO_MODEL || 'gpt-4o-mini';

let openai: OpenAI | null = null;
let initError: string | null = null;

if (!apiKey) {
  initError = 'OPENAI_API_KEY não está definida nas variáveis de ambiente do servidor.';
  console.error('[MentorDo] ERRO DE CONFIGURAÇÃO:', initError);
} else {
  try {
    openai = new OpenAI({ apiKey });
    console.log('[MentorDo] OpenAI inicializado com sucesso. Modelo:', model);
  } catch (error: any) {
    initError = `Falha ao inicializar OpenAI: ${error?.message}`;
    console.error('[MentorDo] ERRO DE INICIALIZAÇÃO:', initError);
  }
}

const SYSTEM_PROMPT = `Você é o "Mentor IA NeuroDO", um mentor pessoal para Gustavo, um CEO neurodivergente (TDAH). Sua missão é ajudá-lo a focar, organizar ideias e atingir suas metas.

REGRAS DE INTERAÇÃO (OBRIGATÓRIAS):
1.  **SEJA DIRETO E ACIONÁVEL**: Forneça respostas claras, calmas e práticas.
2.  **FOCO NO PRÓXIMO PASSO**: Quebre tarefas complexas em micro-passos simples.
3.  **LINGUAGEM EMPÁTICA**: Use um tom de apoio. Nunca use a palavra "falha"; prefira "ajuste de rota" ou "aprendizado".
4.  **CONTEXTUALIZE**: Os projetos principais são: ENVOX, FARMÁCIAS, GERAÇÃO PJ, FELIZMENTE e INFLUENCERS.
5.  **SEJA CONCISO**: Responda de forma curta e direta, sem se alongar.
`;

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

const ChatWithMentorInputSchema = z.object({
  message: z.string(),
  history: z.array(ChatMessageSchema).optional(),
  profileContext: z.string().optional(),
});

export type ChatWithMentorInput = z.infer<typeof ChatWithMentorInputSchema>;

export type ChatWithMentorOutput =
  | { response: string; error?: never; errorCode?: never }
  | { response?: never; error: string; errorCode: string; retryAfterMs?: number };

export async function chatWithMentor(input: ChatWithMentorInput): Promise<ChatWithMentorOutput> {
  const requestId = `mentor-${Date.now()}`;
  console.log(`[MentorDo:${requestId}] Iniciando. Modelo: ${model}. OpenAI pronto: ${!!openai}`);

  // Retorna erro de configuração (visível em produção via objeto retornado)
  if (!openai || initError) {
    const msg = initError || 'OpenAI não inicializado por motivo desconhecido.';
    console.error(`[MentorDo:${requestId}] Erro de configuração:`, msg);
    return { error: `Configuração do servidor: ${msg}`, errorCode: 'INIT_ERROR' };
  }

  const validated = ChatWithMentorInputSchema.safeParse(input);
  if (!validated.success) {
    return { error: 'Mensagem inválida. Por favor, tente novamente.', errorCode: 'VALIDATION_ERROR' };
  }

  const { message, history = [], profileContext } = validated.data;

  if (!message?.trim()) {
    return { error: 'Sua mensagem está vazia.', errorCode: 'EMPTY_MESSAGE' };
  }

  type MsgRole = { role: 'system' | 'user' | 'assistant'; content: string };

  const messages: MsgRole[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...(profileContext ? [{ role: 'system' as const, content: `Contexto do usuário: ${profileContext}` }] : []),
    ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user', content: message },
  ];


  try {
    console.log(`[MentorDo:${requestId}] Chamando OpenAI. Mensagens no histórico: ${messages.length}`);

    const res = await withOpenAITimeout((signal) => openai!.chat.completions.create({
      model,
      messages,
      temperature: 0.5,
      max_tokens: 512,
    }, { signal }));

    const text = res.choices[0]?.message?.content?.trim();
    if (!text) {
      console.warn(`[MentorDo:${requestId}] OpenAI retornou resposta vazia.`);
      return { error: 'O mentor não gerou uma resposta. Tente novamente.', errorCode: 'EMPTY_RESPONSE' };
    }

    console.log(`[MentorDo:${requestId}] Sucesso. Tamanho da resposta: ${text.length} chars`);
    return { response: text };

  } catch (error: any) {
    const classified = classifyOpenAIError(error);
    console.error(`[MentorDo:${requestId}] Erro OpenAI. Código: ${classified.errorCode}. Status: ${classified.status ?? 'n/a'}.`);
    return {
      error: classified.error,
      errorCode: classified.errorCode,
      retryAfterMs: classified.retryAfterMs,
    };
  }
}
