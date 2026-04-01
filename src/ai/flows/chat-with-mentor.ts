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

if (!apiKey) {
  initError = 'A variável de ambiente OPENAI_API_KEY não está definida.';
} else {
  openai = new OpenAI({ apiKey });
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
  if (!openai || initError) {
    console.error('Erro de inicialização do OpenAI:', initError);
    throw new Error(`Erro de configuração do servidor: ${initError}`);
  }

  const validatedInput = ChatWithMentorInputSchema.safeParse(input);
  if (!validatedInput.success || !validatedInput.data.message.trim()) {
    console.warn('Entrada inválida para chatWithMentor:', validatedInput.error);
    throw new Error('A mensagem não pode estar vazia.');
  }

  const { message, history = [] } = validatedInput.data;

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.map((msg) => ({ role: msg.role as 'user' | 'assistant', content: msg.content })),
    { role: 'user', content: message },
  ];

  try {
    const request = {
      model,
      messages,
      temperature: 0.5,
      max_tokens: 512,
    };

    if (vectorStoreId) {
      // Para usar file_search, seria necessário usar assistants API, mas aqui vamos simplificar
      // Por enquanto, removendo o vector store para focar no chat básico
    }

    const response = await openai.chat.completions.create(request);

    const responseMessage = response.choices[0]?.message?.content?.trim();

    if (!responseMessage) {
      console.warn('A IA não retornou uma resposta de texto válida.', response);
      return {
        response: 'Parece que não consegui formular uma resposta. Poderia tentar de outra forma?',
      };
    }

    const parsed = ChatWithMentorOutputSchema.safeParse({ response: responseMessage });
    if (!parsed.success) {
      console.warn('Validação de saída do mentor falhou:', parsed.error);
      return { response: responseMessage };
    }

    return parsed.data;
  } catch (error: any) {
    console.error('Erro na comunicação com a API da OpenAI:', error);
    throw new Error(`Desculpe, tive um problema técnico momentâneo. Detalhes: ${error?.message ?? error}`);
  }
}
