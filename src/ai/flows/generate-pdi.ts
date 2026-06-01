'use server';

/**
 * @fileOverview Generates a Personal Development Plan (PDI) for a team member.
 * This flow acts as an AI career coach, analyzing a team member's profile
 * and suggesting concrete development actions aligned with project goals.
 * It is a "pure" function that receives context and returns Markdown text.
 * It also saves the generated PDI to a history collection.
 */

import OpenAI from 'openai';
import { z } from 'zod';
import { getAdminFirestore } from '@/firebase/admin-init';


// --- OpenAI Client Configuration ---
const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.NEURODO_MODEL || 'gpt-4o-mini';

let openai: OpenAI | null = null;
let initError: string | null = null;

if (!apiKey) {
  initError = 'A variável de ambiente OPENAI_API_KEY não está definida.';
} else {
  openai = new OpenAI({ apiKey });
}

// --- System Prompt for PDI Generation ---
const SYSTEM_PROMPT = `Você é um Sócio-Diretor de RH e Coach de Carreira especialista em desenvolver talentos em startups de alto crescimento, especialmente para um CEO com TDAH (Gustavo). Sua função é criar um Plano de Desenvolvimento Individual (PDI) conciso e acionável para um membro da equipe.

OBJETIVO: Com base no perfil e nas funções do membro da equipe, gere de 3 a 5 pontos de desenvolvimento que alinhem o crescimento pessoal do indivíduo com as metas dos projetos da empresa (ENVOX, FARMÁCIAS, GERAÇÃO PJ, INFLUENCERS).

REGRAS DE GERAÇÃO:
1.  **SEJA ACIONÁVEL**: As sugestões devem ser ações concretas (cursos, livros, tarefas específicas), não conceitos vagos.
2.  **CONECTE COM O NEGÓCIO**: Cada ponto de desenvolvimento DEVE mostrar como ele impacta positivamente um projeto ou meta da empresa.
3.  **BASEADO EM DADOS**: Suas sugestões devem derivar logicamente do perfil comportamental e das funções atuais da pessoa.
4.  **FORMATO ESTRITO**: Formate a saída como um texto Markdown. Para cada ponto, use o seguinte template:
    "**Habilidade a Desenvolver:** [Nome da Habilidade]\\n**Ação Sugerida:** [Descrição da ação, curso, livro, etc.]\\n**Conexão com o Projeto:** [Como isso ajuda a empresa/projeto]"
5.  **FOCO E CONCISÃO**: Limite-se a 3-5 pontos para não sobrecarregar.

EXEMPLO DE OUTPUT PARA UM PONTO:
"**Habilidade a Desenvolver:** Comunicação de Dados para Liderança
**Ação Sugerida:** Fazer o curso 'Data Storytelling for Business' no Coursera e ser responsável por preparar e apresentar o próximo relatório de métricas do projeto ENVOX.
**Conexão com o Projeto:** Ajudará a traduzir os resultados das campanhas de tráfego em insights claros para a tomada de decisão estratégica no ENVOX."`;


// --- Input/Output Schemas ---
const GeneratePDIInputSchema = z.object({
  contextPrompt: z.string().describe('The context of the team member, including role, tasks, and behavioral profile.'),
  memberId: z.string(),
  userId: z.string(),
});
export type GeneratePDIInput = z.infer<typeof GeneratePDIInputSchema>;

const GeneratePDIOutputSchema = z.object({
  pdi: z.string().describe('The generated Personal Development Plan in Markdown format.'),
});

export type GeneratePDIOutput = 
  | { pdi: string; error?: never; errorCode?: never }
  | { pdi?: never; error: string; errorCode: string };


// --- Main Function ---
export async function generatePDI(input: GeneratePDIInput): Promise<GeneratePDIOutput> {
  const requestId = `pdi-${Date.now()}`;
  console.log(`[GeneratePDI:${requestId}] Iniciando. OpenAI pronto: ${!!openai}`);

  if (!openai || initError) {
    const msg = initError || 'OpenAI não inicializado por motivo desconhecido.';
    console.error(`[GeneratePDI:${requestId}] Erro de configuração:`, msg);
    return { error: `Configuração do servidor: ${msg}`, errorCode: 'INIT_ERROR' };
  }

  const validatedInput = GeneratePDIInputSchema.safeParse(input);
  if (!validatedInput.success) {
    console.warn(`[GeneratePDI:${requestId}] Entrada inválida:`, validatedInput.error.message);
    return { error: 'Dados do membro inválidos.', errorCode: 'VALIDATION_ERROR' };
  }

  const { contextPrompt, memberId, userId } = validatedInput.data;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    console.log(`[GeneratePDI:${requestId}] Chamando OpenAI.`);

    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: contextPrompt }
      ],
      temperature: 0.5,
      max_tokens: 800,
    });

    clearTimeout(timeoutId);
    
    const pdiText = response.choices[0]?.message?.content;
    if (!pdiText || pdiText.trim() === '') {
      console.warn(`[GeneratePDI:${requestId}] OpenAI retornou conteúdo vazio.`);
      return { error: 'A IA não gerou um PDI. Tente novamente.', errorCode: 'EMPTY_RESPONSE' };
    }

    const trimmedPdi = pdiText.trim();

    // Save to history (non-blocking)
    try {
        const firestore = getAdminFirestore();
        const historyRef = firestore.collection('pdi_history');
        await historyRef.add({
            userId,
            memberId,
            generatedAt: new Date().toISOString(),
            pdiContent: trimmedPdi,
        });
        console.log(`[GeneratePDI:${requestId}] PDI salvo no Firestore.`);
    } catch (dbError: any) {
        console.warn(`[GeneratePDI:${requestId}] Falha ao salvar PDI no Firestore:`, dbError?.message);
        // Não relança porque o PDI foi gerado com sucesso
    }
    
    console.log(`[GeneratePDI:${requestId}] Sucesso. Tamanho: ${trimmedPdi.length} chars`);
    return { pdi: trimmedPdi };

  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error?.name === 'AbortError') {
      console.error(`[GeneratePDI:${requestId}] Timeout (30s).`);
      return { error: 'A geração de PDI demorou demais. Tente novamente.', errorCode: 'TIMEOUT' };
    }

    const status = error?.status ?? error?.response?.status;
    console.error(`[GeneratePDI:${requestId}] Erro OpenAI. Status: ${status}. Mensagem: ${error?.message}`);

    if (status === 401) {
      return { error: 'OPENAI_API_KEY inválida ou expirada.', errorCode: 'INVALID_API_KEY' };
    }
    if (status === 429) {
      return { error: 'Limite de requisições OpenAI atingido. Aguarde um momento.', errorCode: 'RATE_LIMIT' };
    }
    if (status === 500 || status === 503) {
      return { error: 'Servidores da OpenAI indisponíveis. Tente em alguns instantes.', errorCode: 'OPENAI_SERVER_ERROR' };
    }

    return {
      error: `Erro ao gerar PDI (${error?.message ?? 'desconhecido'}). Verifique os logs.`,
      errorCode: 'UNKNOWN_ERROR',
    };
  }
}
