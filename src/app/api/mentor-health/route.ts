import { NextResponse } from 'next/server';
import OpenAI from 'openai';

/**
 * GET /api/mentor-health
 * Diagnóstico público da configuração do MentorDo.
 * Não expõe a chave — só confirma se está presente e se a conexão funciona.
 */
export async function GET() {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.NEURODO_MODEL || 'gpt-4o-mini';

  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        errorCode: 'MISSING_API_KEY',
        error: 'OPENAI_API_KEY não está definida nas variáveis de ambiente do Vercel.',
        model,
        tip: 'Acesse Vercel → Project → Settings → Environment Variables e adicione OPENAI_API_KEY.',
      },
      { status: 500 }
    );
  }

  try {
    const openai = new OpenAI({ apiKey });
    // Teste mínimo: lista modelos (não gera tokens, só valida a chave)
    await openai.models.list();

    return NextResponse.json({
      ok: true,
      model,
      apiKeyPrefix: apiKey.slice(0, 7) + '…',
      message: 'Configuração OK. OpenAI acessível.',
    });
  } catch (error: any) {
    const status = error?.status ?? error?.response?.status;
    return NextResponse.json(
      {
        ok: false,
        errorCode: status === 401 ? 'INVALID_API_KEY' : 'CONNECTION_ERROR',
        error: error?.message ?? 'Erro desconhecido ao conectar na OpenAI.',
        status,
        model,
        apiKeyPrefix: apiKey.slice(0, 7) + '…',
      },
      { status: 500 }
    );
  }
}
