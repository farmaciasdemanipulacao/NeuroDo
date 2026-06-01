'use server';

/**
 * @fileOverview MentorDo de Projetos — IA para direcionamento, comemoração e visão estratégica.
 * Três modos: 'lost' (SOS), 'celebrate' (comemoração), 'strategic' (visão semanal).
 */

import OpenAI from 'openai';
import { z } from 'zod';

// --- Configuração OpenAI ---

const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.NEURODO_MODEL || 'gpt-4o-mini';

let openai: OpenAI | null = null;
let initError: string | null = null;

if (!apiKey) {
  initError = 'A variável de ambiente OPENAI_API_KEY não está definida.';
} else {
  openai = new OpenAI({ apiKey });
}

// --- Perfil fixo do usuário (injetado em todos os prompts) ---

const USER_PROFILE = `
Perfil do usuário (Gustavo):
- Empreendedor neurodivergente (TDAH diagnosticado)
- Desatenção percentil 99, função executiva percentil 99 (gravemente comprometido)
- Inteligência acima da média (QI 116), memória de trabalho excepcional (percentil 98)
- Perfil DISC: Alto Comunicador (37%) — entusiasmado, sociável, perde foco fácil, detesta rotina
- CliftonStrengths: Ideativo, Positivo, Inclusão, Futurista, Adaptabilidade
- Crenças limitantes: "preciso agradar", "se errar vou fracassar", "não sou bom o suficiente"
- Ciclo padrão: começa empolgado → frustra → abandona → autocritica
- Pico energia: manhã (9h-12h), segundo pico tarde (16h-18h)
- TOM DE COMUNICAÇÃO: informal, positivo, curto, direto, motivacional. Sem textão. Máximo 150 palavras por resposta. Use emojis com moderação.
`.trim();

// --- Schemas de input/output ---

const ProjectContextSchema = z.object({
  name: z.string(),
  category: z.enum(['execution', 'oversight', 'personal']),
  status: z.string(),
  priority: z.number().nullable(),
  valueType: z.string(),
  ownerRole: z.string(),
  responsibleName: z.string().nullable(),
  estimatedMonthlyRevenue: z.number().optional(),
});

const MentorProjectsInputSchema = z.object({
  mode: z.enum(['lost', 'celebrate', 'strategic']),
  projects: z.array(ProjectContextSchema),
  currentHour: z.number().min(0).max(23),
  stabilityPercent: z.number().min(0).max(100),
  executionCount: z.number().min(0).max(5),
  totalEstimatedRevenue: z.number().optional(),
  celebrationContext: z.string().optional(),
  inactiveMinutes: z.number().optional(),
});

export type MentorProjectsInput = z.infer<typeof MentorProjectsInputSchema>;

const MentorProjectsOutputSchema = z.object({
  message: z.string(),
  suggestedAction: z.string().optional(),
  suggestedProjectFocus: z.string().optional(),
  motivationalQuote: z.string().optional(),
});

export type MentorProjectsOutput = z.infer<typeof MentorProjectsOutputSchema>;

// Resultado discriminado — o Server Action NUNCA lança, sempre retorna ok/error
export type MentorProjectsResult =
  | { ok: true; data: MentorProjectsOutput }
  | { ok: false; error: string };

// --- Helpers de prompt ---

function buildProjectsList(projects: MentorProjectsInput['projects']): string {
  return projects
    .map((p) => {
      const rev = p.estimatedMonthlyRevenue ? ` (R$${p.estimatedMonthlyRevenue.toLocaleString('pt-BR')}/mês)` : '';
      const responsible = p.responsibleName ? ` — responsável: ${p.responsibleName}` : '';
      return `- ${p.name} [${p.category}] | ${p.status} | papel: ${p.ownerRole}${rev}${responsible}`;
    })
    .join('\n');
}

function buildSystemPrompt(mode: MentorProjectsInput['mode']): string {
  switch (mode) {
    case 'lost':
      return `Você é o MentorDo, um mentor de projetos para empreendedores neurodivergentes.
O usuário está se sentindo perdido e sem saber onde focar.

${USER_PROFILE}

REGRAS:
1. Máximo 150 palavras
2. Comece com "🧭 Gus, respira." ou similar (acolhedor, não condescendente)
3. Liste os projetos de EXECUÇÃO ativos com status resumido (1 linha cada)
4. Baseado na hora atual, sugira 1 AÇÃO CONCRETA de 25min (sprint)
5. Termine com uma frase motivacional curta e direta
6. Se hora < 12: priorize projetos que exigem decisão (pico energia manhã)
7. Se hora entre 16 e 18: segundo pico, sugira tarefa criativa
8. Se hora > 20: sugira preparação/planejamento leve para amanhã
9. NUNCA sugira "descanse" durante horário de trabalho — sugira uma ação pequena e alcançável
10. Use pt-BR informal
11. Responda APENAS com objeto JSON com os campos: message, suggestedAction, suggestedProjectFocus, motivationalQuote`;

    case 'celebrate':
      return `Você é o MentorDo celebrando uma conquista do usuário.

${USER_PROFILE}

REGRAS:
1. Máximo 120 palavras
2. Comece com emoji de celebração 🎉🏆🚀
3. Diga EXATAMENTE o que foi conquistado (use o celebrationContext fornecido)
4. Conecte a conquista à META MAIOR (R$30k/mês até Dez/2026)
5. Mostre a consequência positiva REAL e TANGÍVEL dessa conquista
6. Se tiver dados de receita: mostre quanto mais perto está da meta
7. Termine com: "Próximo passo?" (manter momentum)
8. Tom: genuinamente empolgado, não artificial
9. Use pt-BR informal
10. Responda APENAS com objeto JSON com os campos: message, suggestedAction, motivationalQuote`;

    case 'strategic':
      return `Você é o MentorDo fazendo o panorama estratégico semanal dos projetos.

${USER_PROFILE}

REGRAS:
1. Máximo 250 palavras
2. Formate como tabela markdown: Projeto | Saúde | Papel | Ação da semana
3. Saúde: 🟢 No trilho / 🟡 Atenção / 🔴 Crítico (baseado em status e prioridade)
4. Inclua projetos de Acompanhamento e Pessoal de forma mais breve
5. Mostre a estabilidade atual: "🔄 Estabilidade: X%"
6. Se tiver dados de receita: mostre projeção "💰 Projeção: R$X de R$30k"
7. Sugira distribuição de tempo da semana em % por projeto
8. Se estabilidade < 50%: mencione padrão de inquietação detectado
9. Termine com "🎯 Foco da semana: [1 projeto principal]"
10. Use pt-BR informal
11. Responda APENAS com objeto JSON com os campos: message, suggestedProjectFocus, suggestedAction`;
  }
}

function buildUserPrompt(input: MentorProjectsInput): string {
  const projectsList = buildProjectsList(input.projects);
  const revenueInfo = input.totalEstimatedRevenue
    ? `\nReceita mensal estimada total: R$${input.totalEstimatedRevenue.toLocaleString('pt-BR')} de R$30.000 meta`
    : '';
  const inactivityInfo = input.inactiveMinutes
    ? `\nTempo sem atividade registrada: ${input.inactiveMinutes} minutos`
    : '';
  const celebrationInfo = input.celebrationContext
    ? `\nO que foi conquistado: "${input.celebrationContext}"`
    : '';

  return `Hora atual: ${input.currentHour}h
Estabilidade dos projetos: ${input.stabilityPercent}%
Projetos em execução ativos: ${input.executionCount}
${revenueInfo}${inactivityInfo}${celebrationInfo}

Lista de projetos:
${projectsList}

Responda SOMENTE com um objeto JSON válido e nada mais.`;
}

// --- Server Action principal ---

export async function mentorProjects(
  input: MentorProjectsInput
): Promise<MentorProjectsResult> {
  try {
    if (!openai || initError) {
      return { ok: false, error: `Configuração inválida: ${initError ?? 'OpenAI não inicializado.'}` };
    }

    const validated = MentorProjectsInputSchema.safeParse(input);
    if (!validated.success) {
      return { ok: false, error: `Dados inválidos: ${validated.error.message}` };
    }

    const systemPrompt = buildSystemPrompt(validated.data.mode);
    const userPrompt = buildUserPrompt(validated.data);

    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
    });

    const rawOutput = response.choices[0]?.message?.content;
    if (!rawOutput) {
      return { ok: false, error: 'A API não retornou conteúdo. Tente novamente.' };
    }

    const parsed = JSON.parse(rawOutput);
    const outputValidated = MentorProjectsOutputSchema.safeParse(parsed);

    if (!outputValidated.success) {
      // Fallback seguro — usa o texto bruto como mensagem
      return {
        ok: true,
        data: {
          message: rawOutput,
          suggestedAction: undefined,
          suggestedProjectFocus: undefined,
          motivationalQuote: undefined,
        },
      };
    }

    return { ok: true, data: outputValidated.data };
  } catch (err) {
    console.error('[MentorDo] Erro:', err);
    return {
      ok: false,
      error: 'O MentorDo está temporariamente indisponível. Tente novamente em instantes.',
    };
  }
}
