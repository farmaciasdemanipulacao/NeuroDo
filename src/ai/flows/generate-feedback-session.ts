'use server';

/**
 * @fileOverview Generates a personalized feedback session script.
 * This flow acts as an expert HR Director and communication coach, creating a script
 * tailored to the employee's behavioral profile using the SBI (Situation-Behavior-Impact) method.
 * It also saves the generated script to a history collection.
 */

import OpenAI from 'openai';
import { z } from 'zod';
import { 
    GenerateFeedbackSessionInputSchema, 
    type GenerateFeedbackSessionInput, 
    GenerateFeedbackSessionOutputSchema, 
    type GenerateFeedbackSessionOutput 
} from '@/lib/types';
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

// --- System Prompt for Feedback Session Generation ---
const SYSTEM_PROMPT = `Você é uma Diretora de RH e coach de comunicação, especialista em liderança empática e comunicação não-violenta (CNV). Sua missão é criar um roteiro para uma sessão de feedback para Gustavo, um CEO com TDAH, conversar com um de seus colaboradores.

REGRAS DE OURO:
1.  **PERSONALIZE COM BASE NO PERFIL (OBRIGATÓRIO)**: Você DEVE usar o perfil comportamental fornecido para adaptar o tom.
    - Se o perfil é 'direto e orientado a dados', seja objetivo. Ex: "Vamos olhar os fatos..."
    - Se o perfil 'valoriza harmonia', comece reforçando a segurança. Ex: "Primeiro, quero dizer que esta conversa é sobre crescimento, e valorizo muito sua contribuição."
    - Se o perfil é 'criativo e precisa de autonomia', enquadre o feedback como um desafio. Ex: "Tenho um desafio pra você que vai exigir sua criatividade..."
2.  **USE A TÉCNICA SBI (Situação-Comportamento-Impacto)**: Estruture os pontos de elogio e desenvolvimento da seguinte forma:
    - **Situação**: "Na semana passada, durante a apresentação para o cliente X..."
    - **Comportamento**: "...notei que você usou os dados do relatório para construir uma narrativa clara..."
    - **Impacto**: "...e o impacto foi que o cliente se sentiu muito mais seguro para fechar o contrato."
3.  **FOCO NO FUTURO, NÃO NA CULPA**: O ponto de melhoria não é uma crítica. É um convite ao desenvolvimento, conectando-o a metas futuras. Use frases como "Como podemos, juntos, garantir que..." ou "Uma área que podemos desenvolver para você atingir a meta X é...".
4.  **ROTEIRO, NÃO RESUMO**: Sua saída devem ser frases sugeridas, um roteiro semi-pronto que o gestor possa adaptar, não uma lista de dicas.
5.  **OUTPUT ESTRITAMENTE JSON**: Sua resposta DEVE ser um objeto JSON válido, com os campos "opening", "praisePoints", "developmentPoints", "nextSteps", "closing", e nada mais.`;


// --- Main Function ---
export async function generateFeedbackSession(input: GenerateFeedbackSessionInput & { memberId: string, userId: string }): Promise<GenerateFeedbackSessionOutput> {
  if (!openai || initError) {
    throw new Error(`Server Configuration Error: ${initError}`);
  }

  const validatedInput = GenerateFeedbackSessionInputSchema.extend({
      memberId: z.string(),
      userId: z.string(),
  }).safeParse(input);

  if (!validatedInput.success) {
    throw new Error(`Invalid input: ${validatedInput.error.message}`);
  }

  const { collaboratorName, behavioralProfile, positivePoint, improvementPoint, relatedGoal, memberId, userId } = validatedInput.data;

  const userPrompt = `
    Gere um roteiro de feedback para Gustavo conversar com **${collaboratorName}**.

    **Contexto:**
    - **Perfil Comportamental de ${collaboratorName}:** "${behavioralProfile}"
    - **Ponto Positivo a ser Elogiado:** "${positivePoint}"
    - **Ponto de Melhoria:** "${improvementPoint}"
    - **Meta de Negócio Relacionada:** "${relatedGoal}"

    Lembre-se de seguir TODAS as regras do sistema, especialmente a personalização baseada no perfil e a estrutura SBI.
  `;

  try {
    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });

    const rawOutput = response.choices[0]?.message?.content;
    if (!rawOutput) {
      throw new Error("A API da OpenAI não retornou conteúdo.");
    }
    
    const validationResult = GenerateFeedbackSessionOutputSchema.safeParse(JSON.parse(rawOutput));
    
    if (!validationResult.success) {
        console.error("OpenAI output validation failed", validationResult.error.flatten());
        console.log("Raw AI Output that failed:", rawOutput);
        throw new Error("A resposta da IA não seguiu o formato JSON esperado.");
    }

    const generatedScript = validationResult.data;

    // Save to history
    try {
        const firestore = getAdminFirestore();
        const historyRef = firestore.collection('feedback_sessions');
        await historyRef.add({
            userId,
            memberId,
            generatedAt: new Date().toISOString(),
            script: generatedScript,
        });
    } catch (dbError) {
        console.error("Failed to save feedback session to history:", dbError);
        // We don't re-throw here, as the primary function (generating the script) succeeded.
        // We just log the error.
    }
    
    return generatedScript;

  } catch (error: any) {
    console.error("Erro ao gerar roteiro de feedback:", error);
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
       throw new Error(`Falha na análise do roteiro: A resposta da IA não era um JSON válido ou não seguiu o schema: ${error.message}`);
    }
    throw new Error(`Falha na geração do roteiro: ${error.message}`);
  }
}
