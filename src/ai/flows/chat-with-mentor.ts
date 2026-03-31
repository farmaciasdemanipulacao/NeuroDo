'use server';

/**
 * @fileOverview Interface para o chat do Mentor IA utilizando a OpenAI Responses API.
 * Este arquivo atua como um Server Action para o frontend do Next.js.
 * Utiliza a API Responses (`responses.create`) para permitir o uso de ferramentas como `file_search` de forma stateless.
 */

import OpenAI from 'openai';
import { z } from 'zod';

// --- Configuração do Cliente OpenAI e Validações de Ambiente ---

const apiKey = process.env.OPENAI_API_KEY;
const vectorStoreId = process.env.NEURODO_VECTOR_STORE_ID;
const model = process.env.NEURODO_MODEL || 'gpt-4o-mini';

let openai: OpenAI | null = null;
let initError: string | null = null;

if (!apiKey) {
  initError = 'A variável de ambiente OPENAI_API_KEY não está definida.';
} else if (!vectorStoreId) {
  initError = 'A variável de ambiente NEURODO_VECTOR_STORE_ID não está definida.';
} else {
  openai = new OpenAI({ apiKey });
}

// --- Definição do System Prompt Centralizado ---

const SYSTEM_PROMPT = `Você é o "Mentor IA NeuroDO", um mentor pessoal para Gustavo, um CEO neurodivergente (TDAH). Sua missão é ajudá-lo a focar, organizar ideias e atingir suas metas.

REGRAS DE INTERAÇÃO (OBRIGATÓRIAS):
1.  **SEJA DIRETO E ACIONÁVEL**: Forneça respostas claras, calmas e práticas.
2.  **FOCO NO PRÓXIMO PASSO**: Quebre tarefas complexas em micro-passos simples.
3.  **LINGUAGEM EMPÁTICA**: Use um tom de apoio. Nunca use a palavra "falha"; prefira "ajuste de rota" ou "aprendizado".
4.  **USE SEU CONHECIMENTO**: Você tem acesso a documentos sobre os projetos e a vida de Gustavo via 'file_search'. Suas respostas DEVEM considerar esse contexto para enriquecer suas respostas. Os projetos principais são: ENVOX, FARMÁCIAS, GERAÇÃO PJ, FELIZMENTE e INFLUENCERS.
5.  **SEJA CONCISO**: Responda de forma curta e direta, sem se alongar.
`;

// --- Definição dos Schemas de Entrada/Saída ---

const ChatMessageSchema = z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
});

const ChatWithMentorInputSchema = z.object({
  message: z.string().describe("A mensagem do usuário para o mentor."),
  history: z.array(ChatMessageSchema).optional().describe("O histórico da conversa para manter o contexto."),
});

export type ChatWithMentorInput = z.infer<typeof ChatWithMentorInputSchema>;

const ChatWithMentorOutputSchema = z.object({
    response: z.string().describe("A resposta do mentor."),
});

export type ChatWithMentorOutput = z.infer<typeof ChatWithMentorOutputSchema>;


/**
 * Função principal para interagir com o Mentor IA usando a API Responses.
 */
export async function chatWithMentor(input: ChatWithMentorInput): Promise<ChatWithMentorOutput> {
  // 1. Validar a inicialização e a entrada
  if (!openai || initError) {
    console.error("Erro de inicialização do OpenAI:", initError);
    throw new Error(`Erro de configuração do servidor: ${initError}`);
  }
  const validatedInput = ChatWithMentorInputSchema.safeParse(input);
  if (!validatedInput.success || !validatedInput.data.message) {
    console.warn("Entrada inválida para chatWithMentor:", validatedInput.error);
    throw new Error("A mensagem não pode estar vazia.");
  }

  const { message, history = [] } = validatedInput.data;

  // Monta o payload para a API, incluindo o System Prompt, o histórico e a nova mensagem
   const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map(msg => ({ role: msg.role, content: msg.content })),
    { role: "user", content: message }
  ];
  
  try {
    // 2. Chamar a API Responses com o payload correto
    const response = await openai.responses.create({
        model: model,
        input: messages,
        // Removido temporariamente para resolver o erro 400. Será reintroduzido.
        // tools: [{ type: "file_search" }],
        // tool_resources: { file_search: { vector_store_ids: [vectorStoreId] } }
    });

    // 3. Extrair a resposta de texto
    const responseMessage = response.output_text;

    if (typeof responseMessage !== 'string' || responseMessage.trim() === '') {
        console.warn("A IA não retornou uma resposta de texto válida.", response);
        return {
            response: "Parece que não consegui formular uma resposta. Poderia tentar de outra forma?",
        };
    }

    return {
        response: responseMessage,
    };

  } catch (error: any) {
    console.error("Erro na comunicação com a API da OpenAI:", error);
    // Retorna um erro mais genérico para o cliente por segurança
    throw new Error(`Desculpe, tive um problema técnico momentâneo. Detalhes: ${error.message}`);
  }
}
