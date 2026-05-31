import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.NEURODO_MODEL || 'gpt-4o-mini';

let openai: OpenAI | null = null;
let initError: string | null = null;

if (!apiKey) {
  initError = 'A variável de ambiente OPENAI_API_KEY não está definida.';
  console.error('[OpenAI Client] ERRO DE CONFIGURAÇÃO:', initError);
} else {
  try {
    openai = new OpenAI({ apiKey });
    console.log('[OpenAI Client] Inicializado com sucesso. Modelo:', model);
  } catch (err: any) {
    initError = `Falha ao inicializar OpenAI: ${err?.message ?? String(err)}`;
    console.error('[OpenAI Client] ERRO DURANTE INICIALIZAÇÃO:', initError);
  }
}

export { openai, initError, model };
