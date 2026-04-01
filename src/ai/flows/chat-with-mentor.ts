'use server';

/**
 * @fileOverview Interface para o chat do Mentor IA utilizando a OpenAI Responses API.
 * Este arquivo atua como um Server Action para o frontend do Next.js.
 */

import OpenAI from 'openai';
import { z } from 'zod';

const apiKey = process.env.OPENAI_API_KEY;
const vectorStoreId = process.env.NEURODO_VECTOR_STORE_ID;
const model = process.env.NEURODO_MODEL || 'gpt-4o-mini';

let openai: OpenAI | null = null;
let initError: string | null = null;

// Log detalhado de inicialização
if (!apiKey) {
  initError = 'CRITICAL: A variável de ambiente OPENAI_API_KEY não está definida no servidor.';
  console.error(`[AI Mentor Init Error] ${initError}`);
  console.error('[AI Mentor Init Debug]', {
    env: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    availableEnv: Object.keys(process.env).filter(k => k.includes('OPENAI') || k.includes('NEURODO')),
  });
} else {
  try {
    openai = new OpenAI({ apiKey });
    console.log('[AI Mentor] OpenAI inicializado com sucesso', {
      model,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    initError = `Erro ao inicializar OpenAI: ${error?.message}`;
    console.error(`[AI Mentor Init Error] ${initError}`, error);
  }
}

const SYSTEM_PROMPT = `Você é o "Mentor IA NeuroDO", um mentor pessoal para Gustavo, um CEO neurodivergente (TDAH). Sua missão é ajudá-lo a focar, organizar ideias e atingir suas metas.

REGRAS DE INTERAÇÃO (OBRIGATÓRIAS):
1.  **SEJA DIRETO E ACIONÁVEL**: Forneça respostas claras, calmas e práticas.
2.  **FOCO NO PRÓXIMO PASSO**: Quebre tarefas complexas em micro-passos simples.
3.  **LINGUAGEM EMPÁTICA**: Use um tom de apoio. Nunca use a palavra "falha"; prefira "ajuste de rota" ou "aprendizado".
4.  **USE SEU CONHECIMENTO**: Você tem acesso a documentos sobre os projetos e a vida de Gustavo via 'file_search'. Suas respostas DEVEM considerar esse contexto para enriquecer suas respostas. Os projetos principais são: ENVOX, FARMÁCIAS, GERAÇÃO PJ, FELIZMENTE e INFLUENCERS.
5.  **SEJA CONCISO**: Responda de forma curta e direta, sem se alongar.
`;

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

const ChatWithMentorInputSchema = z.object({
  message: z.string().describe('A mensagem do usuário para o mentor.'),
  history: z.array(ChatMessageSchema).optional().describe('O histórico da conversa para manter o contexto.'),
});

export type ChatWithMentorInput = z.infer<typeof ChatWithMentorInputSchema>;

const ChatWithMentorOutputSchema = z.object({
  response: z.string().describe('A resposta do mentor.'),
});

export type ChatWithMentorOutput = z.infer<typeof ChatWithMentorOutputSchema>;

export async function chatWithMentor(input: ChatWithMentorInput): Promise<ChatWithMentorOutput> {
  const requestId = `mentor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();

  console.log(`[AI Mentor Request: ${requestId}] Iniciando processamento`, {
    timestamp: new Date().toISOString(),
  });

  // Verificação de inicialização
  if (!openai || initError) {
    const errorMsg = `Servidor não configurado adequadamente: ${initError}`;
    console.error(`[AI Mentor Error: ${requestId}] ${errorMsg}`, {
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });
    throw new Error(errorMsg);
  }

  // Validação de entrada
  const validatedInput = ChatWithMentorInputSchema.safeParse(input);
  if (!validatedInput.success) {
    const validationError = `Entrada inválida: ${validatedInput.error.message}`;
    console.warn(`[AI Mentor Warning: ${requestId}] ${validationError}`);
    throw new Error('Mensagem inválida. Por favor, tente novamente.');
  }

  const { message, history = [] } = validatedInput.data;

  if (!message?.trim()) {
    console.warn(`[AI Mentor Warning: ${requestId}] Mensagem vazia`);
    throw new Error('Sua mensagem está vazia. Por favor, escreva algo.');
  }

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.map((msg) => ({ role: msg.role as 'user' | 'assistant', content: msg.content })),
    { role: 'user', content: message },
  ];

  try {
    console.log(`[AI Mentor Request: ${requestId}] Enviando para OpenAI`, {
      messageCount: messages.length,
      model,
      timestamp: new Date().toISOString(),
    });

    const request = {
      model,
      messages,
      temperature: 0.5,
      max_tokens: 512,
    };

    // Timeout de 30 segundos para a requisição
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await openai.chat.completions.create(request as any);
      clearTimeout(timeoutId);

      const responseMessage = response.choices[0]?.message?.content?.trim();

      if (!responseMessage) {
        console.warn(`[AI Mentor Warning: ${requestId}] OpenAI retornou resposta vazia`, {
          choicesCount: response.choices.length,
          timestamp: new Date().toISOString(),
        });
        return {
          response: 'Desculpe, não consegui formular uma resposta. Tente novamente em alguns instantes.',
        };
      }

      const parsed = ChatWithMentorOutputSchema.safeParse({ response: responseMessage });
      if (!parsed.success) {
        console.warn(`[AI Mentor Warning: ${requestId}] Falha na validação de saída`, {
          error: parsed.error.message,
          timestamp: new Date().toISOString(),
        });
        // Mesmo com erro de validação, retornamos a resposta da IA
        return { response: responseMessage };
      }

      console.log(`[AI Mentor Success: ${requestId}] Resposta obtida com sucesso`, {
        duration: Date.now() - startTime,
        responseLength: responseMessage.length,
        timestamp: new Date().toISOString(),
      });

      return parsed.data;
    } catch (abortError: any) {
      clearTimeout(timeoutId);
      if (abortError.name === 'AbortError') {
        const msg = 'A resposta do mentor levou muito tempo. Tente novamente.';
        console.error(`[AI Mentor Error: ${requestId}] Timeout (30s)`, {
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        });
        throw new Error(msg);
      }
      throw abortError;
    }
  } catch (error: any) {
    console.error(`[AI Mentor Error: ${requestId}] Erro na API OpenAI`, {
      errorMessage: error?.message,
      errorCode: error?.code,
      errorStatus: error?.status,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });

    // Tratamento específico de erros
    if (error?.code === 'ECONNREFUSED' || error?.message?.includes('ECONNREFUSED')) {
      throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão com a internet.');
    }

    if (error?.status === 401 || error?.message?.includes('401')) {
      throw new Error('Chave de API inválida ou expirada. Entre em contato com o administrador.');
    }

    if (error?.status === 429 || error?.message?.includes('429')) {
      throw new Error('Muitas requisições. Aguarde um momento e tente novamente.');
    }

    if (error?.status >= 500 || error?.message?.includes('500')) {
      throw new Error('O servidor de IA está temporariamente indisponível. Tente novamente em alguns instantes.');
    }

    if (error?.name === 'AbortError') {
      throw new Error('A resposta levou muito tempo. Tente novamente.');
    }

    // Erro genérico com contexto
    throw new Error(
      'Desculpe, ocorreu um problema ao consultar o mentor. Tente novamente em alguns instantes.'
    );
  }
}
