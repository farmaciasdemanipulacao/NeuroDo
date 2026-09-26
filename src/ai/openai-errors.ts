export type OpenAIErrorCode =
  | 'NO_CREDITS'
  | 'INVALID_API_KEY'
  | 'RATE_LIMIT'
  | 'OPENAI_SERVER_ERROR'
  | 'TIMEOUT'
  | 'OPENAI_ERROR';

export type ClassifiedOpenAIError = {
  error: string;
  errorCode: OpenAIErrorCode;
  retryAfterMs?: number;
  status?: number;
};

export const NO_CREDITS_MESSAGE =
  'A IA do NeuroDO está temporariamente sem créditos. O restante do sistema continua funcionando normalmente.';

function collectErrorText(error: any): string {
  return [
    error?.message,
    error?.code,
    error?.type,
    error?.error?.message,
    error?.error?.code,
    error?.error?.type,
    error?.response?.body?.error?.message,
    error?.response?.body?.error?.code,
    error?.response?.body?.error?.type,
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase())
    .join(' ');
}

function getRetryAfterMs(error: any): number | undefined {
  try {
    const headers = error?.response?.headers ?? error?.headers;
    const raw =
      (typeof headers?.get === 'function' && headers.get('retry-after')) ||
      headers?.['retry-after'] ||
      headers?.['Retry-After'] ||
      error?.retry_after;

    if (raw == null) return undefined;

    const seconds = Number.parseInt(String(raw), 10);
    if (!Number.isNaN(seconds)) return Math.max(0, seconds * 1000);

    const retryAt = Date.parse(String(raw));
    if (!Number.isNaN(retryAt)) return Math.max(0, retryAt - Date.now());
  } catch {
    // Sem Retry-After legível: segue sem sugestão de espera.
  }

  return undefined;
}

export function classifyOpenAIError(error: unknown): ClassifiedOpenAIError {
  const candidate = error as any;
  const status = candidate?.status ?? candidate?.response?.status;
  const text = collectErrorText(candidate);

  const isAbort =
    candidate?.name === 'AbortError' ||
    candidate?.name === 'APIUserAbortError' ||
    text.includes('request was aborted') ||
    text.includes('aborted');

  if (isAbort) {
    return {
      error: 'A IA demorou mais do que o limite esperado para responder. Tente novamente.',
      errorCode: 'TIMEOUT',
      status,
    };
  }

  if (status === 401 || text.includes('invalid_api_key') || text.includes('incorrect api key')) {
    return {
      error: 'A chave da API de IA está inválida ou expirada. O administrador precisa revisar a configuração.',
      errorCode: 'INVALID_API_KEY',
      status,
    };
  }

  const noCreditsMarkers = [
    'credit_balance_exhausted',
    'insufficient_quota',
    'billing_hard_limit_reached',
    'no credits remaining',
    'not enough credits',
    'exceeded your current quota',
    'quota exceeded',
  ];

  if (noCreditsMarkers.some((marker) => text.includes(marker))) {
    return {
      error: NO_CREDITS_MESSAGE,
      errorCode: 'NO_CREDITS',
      status,
    };
  }

  if (status === 429) {
    return {
      error: 'A IA recebeu muitas solicitações em pouco tempo. Aguarde um momento e tente novamente.',
      errorCode: 'RATE_LIMIT',
      retryAfterMs: getRetryAfterMs(candidate),
      status,
    };
  }

  if ([500, 502, 503, 504].includes(status)) {
    return {
      error: 'O serviço de IA está temporariamente indisponível. Tente novamente em alguns instantes.',
      errorCode: 'OPENAI_SERVER_ERROR',
      status,
    };
  }

  return {
    error: 'Não foi possível concluir a solicitação de IA agora. Tente novamente em alguns instantes.',
    errorCode: 'OPENAI_ERROR',
    status,
  };
}

export async function withOpenAITimeout<T>(
  request: (signal: AbortSignal) => Promise<T>,
  timeoutMs = 30_000
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await request(controller.signal);
  } finally {
    clearTimeout(timeoutId);
  }
}
