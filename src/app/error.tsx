"use client";

// FNV-1a 32-bit — leve e determinístico, compatível com a implementação client-side
function hashString(s: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return ("00000000" + (h >>> 0).toString(16)).slice(-8);
}

export default function AppError({ error }: { error: Error & { digest?: string } }) {
  const payload = `${error?.message ?? ''}\n${error?.stack ?? ''}`;
  const digest = hashString(payload);

  // Log completo no servidor — ficará visível nos logs do Vercel / terminal.
  // eslint-disable-next-line no-console
  console.error(`[Server Error] Digest: ${digest}`, error);

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
        <div style={{ fontSize: '2.5rem' }}>⚠️</div>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Ocorreu um erro</h1>
        <p style={{ color: '#9CA3AF', fontSize: '0.875rem', maxWidth: '420px' }}>
          Ocorreu um erro ao renderizar esta página. Consulte os logs do servidor
          e procure pelo digest abaixo para obter a stack completa.
        </p>
        <p style={{ color: '#F87171', fontFamily: 'monospace' }}>Digest: {digest}</p>
      </body>
    </html>
  );
}
