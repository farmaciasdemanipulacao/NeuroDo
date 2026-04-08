'use client';

import { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

// Captura erros fora do root layout (incluindo ChunkLoadError no nível de webpack)
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isChunkError =
    error?.name === 'ChunkLoadError' ||
    error?.message?.includes('Loading chunk') ||
    error?.message?.includes('failed.');

  useEffect(() => {
    if (isChunkError) {
      window.location.reload();
    }
  }, [isChunkError]);

  return (
    <html lang="pt-BR">
      <body
        style={{
          background: '#0A0A0F',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: '16px',
          fontFamily: 'sans-serif',
          textAlign: 'center',
          padding: '32px',
        }}
      >
        <div style={{ fontSize: '2.5rem' }}>🔄</div>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Nova versão disponível</h1>
        <p style={{ color: '#9CA3AF', fontSize: '0.875rem', maxWidth: '320px' }}>
          O NeuroDO foi atualizado. Recarregando...
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: '8px',
            padding: '8px 20px',
            borderRadius: '8px',
            border: '1px solid #22C55E',
            background: 'transparent',
            color: '#22C55E',
            cursor: 'pointer',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          Recarregar agora
        </button>
      </body>
    </html>
  );
}
