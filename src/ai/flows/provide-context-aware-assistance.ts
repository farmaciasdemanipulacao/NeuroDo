'use server';

/**
 * @fileOverview An AI mentor that provides context-aware assistance and task suggestions.
 * This implementation usa a OpenAI Responses API para maior compatibilidade.
 */

import OpenAI from 'openai';
import { z } from 'zod';

const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.NEURODO_MODEL || 'gpt-4o-mini';

let openai: OpenAI | null = null;
let initError: string | null = null;

if (!apiKey) {
  initError = 'A variável de ambiente OPENAI_API_KEY não está definida.';
} else {
  openai = new OpenAI({ apiKey });
}

const SYSTEM_PROMPT = `Você é o "Mentor IA NeuroDO", um mentor pessoal para Gustavo, um CEO neurodivergente (TDAH). Sua missão é ajudá-lo a alcançar R$30.000/mês líquido até 1º de dezembro de 2026, focando nos 5 projetos principais.

OS 5 PROJETOS: ENVOX, FARMÁCIAS, GERAÇÃO PJ, FELIZMENTE (congelado), INFLUENCERS.

REGRAS DE INTERAÇÃO (OBRIGATÓRIAS):
1.  **SEJA DIRETO E ACIONÁVEL**: Forneça respostas claras, calmas e práticas.
2.  **QUEBRE TAREFAS**: Sugira tarefas que possam ser divididas em micro-passos de no máximo 50 min.
3.  **ADAPTE-SE À ENERGIA**: Suas sugestões devem ser adequadas ao nível de energia informado.
4.  **CONTEXTUALIZE**: Relacione suas sugestões aos 5 projetos e à meta de R$30k.
5.  **LINGUAGEM EMPÁTICA**: Nunca use a palavra "falha"; prefira "ajuste de rota".
6.  **FOCO**: Nunca sobrecarregue com mais de 3 itens ou passos por vez.

PROTOCOLO DE ENERGIA:
- Energia 7-10: Sugira tarefas de alto impacto (vendas, estratégia, criatividade).
- Energia 4-6: Sugira tarefas operacionais (emails, revisões, organização).
- Energia 1-3: Sugira tarefas leves ou planejamento (leitura, organização simples).
- Energia 0: "Hoje é dia de manutenção. Descanse, recarregue e cuide de si mesmo."

Seu output DEVE ser um objeto JSON válido, seguindo o schema fornecido, e nada mais.
`;

const ProvideContextAwareAssistanceInputSchema = z.object({
  energyLevel: z.number().describe('The user\'s current energy level (0-10).'),
  project: z.string().describe('The name of the project the user is working on.'),
  prompt: z.string().optional().describe('The specific question ou prompt do usuário.'),
});

export type ProvideContextAwareAssistanceInput = z.infer<typeof ProvideContextAwareAssistanceInputSchema>;

const ProvideContextAwareAssistanceOutputSchema = z.object({
  suggestion: z.string().describe('A task suggestion tailored to the user.'),
  breakdown: z.string().optional().describe('Uma breakdown da tarefa em pequenos passos.'),
  reasoning: z.string().describe('A IA explica o raciocínio por trás da sugestão.'),
});

export type ProvideContextAwareAssistanceOutput = z.infer<typeof ProvideContextAwareAssistanceOutputSchema>;

export async function provideContextAwareAssistance(
  input: ProvideContextAwareAssistanceInput
): Promise<ProvideContextAwareAssistanceOutput> {
  if (!openai || initError) {
    console.error('OpenAI Init Error:', initError);
    throw new Error(`Server Configuration Error: ${initError}`);
  }

  const validatedInput = ProvideContextAwareAssistanceInputSchema.safeParse(input);
  if (!validatedInput.success) {
    throw new Error(`Invalid input: ${validatedInput.error.message}`);
  }

  const { energyLevel, project, prompt } = validatedInput.data;

  const userPrompt = `
    O nível de energia atual do Gustavo é: ${energyLevel}.
    Ele está focado no projeto: ${project}.
    A pergunta/solicitação dele é: "${prompt || 'Nenhum prompt fornecido. Sugira uma tarefa proativamente.'}"

    Baseado em todo o contexto do sistema e nas informações atuais, gere uma sugestão de tarefa (suggestion), uma quebra da tarefa em no máximo 3 passos (breakdown, se aplicável), e a justificativa (reasoning).
    Se o prompt do usuário for uma pergunta, foque em respondê-la dentro das suas diretrizes, e a sugestão pode ser o próximo passo.
    Responda APENAS com o objeto JSON com os campos "suggestion", "breakdown", e "reasoning".
  `;

  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.5,
      max_tokens: 550,
      response_format: { type: 'json_object' },
    });

    const rawOutput = response.choices[0]?.message?.content?.trim();
    if (!rawOutput) {
      throw new Error('A API da OpenAI não retornou conteúdo.');
    }

    let parsedOutput: any = null;

    // 1) JSON direto
    try {
      parsedOutput = JSON.parse(rawOutput);
    } catch {
      // tenta bloco JSON em seguida
    }

    // 2) Extrair bloco JSON entre chaves
    if (!parsedOutput) {
      const match = rawOutput.match(/\{[\s\S]*\}/);
      if (match) {
        try { parsedOutput = JSON.parse(match[0]); } catch { /* continua */ }
      }
    }

    if (!parsedOutput) {
      console.error('[IA Dashboard] Não foi possível parsear o output. Raw:', rawOutput);
      throw new Error('A resposta da IA não era um JSON válido. Tente gerar novamente.');
    }

    // 3) Normalizar nomes de campos alternativos que o modelo pode usar
    if (!parsedOutput.suggestion && parsedOutput.sugestao) parsedOutput.suggestion = parsedOutput.sugestao;
    if (!parsedOutput.suggestion && parsedOutput.tarefa) parsedOutput.suggestion = parsedOutput.tarefa;
    if (!parsedOutput.suggestion && parsedOutput.task) parsedOutput.suggestion = parsedOutput.task;
    if (!parsedOutput.reasoning && parsedOutput.justificativa) parsedOutput.reasoning = parsedOutput.justificativa;
    if (!parsedOutput.reasoning && parsedOutput.reason) parsedOutput.reasoning = parsedOutput.reason;
    if (!parsedOutput.reasoning && parsedOutput.rationale) parsedOutput.reasoning = parsedOutput.rationale;
    if (!parsedOutput.breakdown && parsedOutput.passos) parsedOutput.breakdown = parsedOutput.passos;
    if (!parsedOutput.breakdown && parsedOutput.steps) parsedOutput.breakdown = parsedOutput.steps;
    // Se suggestion for array, pegar primeiro
    if (Array.isArray(parsedOutput.suggestion)) parsedOutput.suggestion = parsedOutput.suggestion[0];

    const validatedOutput = ProvideContextAwareAssistanceOutputSchema.safeParse(parsedOutput);

    if (!validatedOutput.success) {
      console.error('[IA Dashboard] Validação falhou:', validatedOutput.error.format());
      console.error('[IA Dashboard] Parsed object:', JSON.stringify(parsedOutput));
      console.error('[IA Dashboard] Raw output:', rawOutput);
      throw new Error(
        `Formato inesperado na resposta da IA. Campos recebidos: ${Object.keys(parsedOutput).join(', ')}. Tente novamente.`
      );
    }

    return validatedOutput.data;
  } catch (error: any) {
    console.error('Error communicating with OpenAI API:', error);
    throw new Error(`Ocorreu um erro ao se comunicar com o Mentor IA: ${error.message ?? error}`);
  }
}
