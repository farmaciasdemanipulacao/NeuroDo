'use client';

import { useEffect } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isChunkError =
    error?.name === 'ChunkLoadError' ||
    error?.message?.includes('Loading chunk') ||
    error?.message?.includes('ChunkLoadError');

  useEffect(() => {
    // ChunkLoadError geralmente é resolvido com reload — fazer automaticamente após 1s
    if (isChunkError) {
      const timer = setTimeout(() => {
        window.location.reload();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isChunkError]);

  if (isChunkError) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center p-8">
        <RefreshCw className="h-10 w-10 text-primary animate-spin" />
        <div>
          <h2 className="text-lg font-semibold text-foreground">Nova versão disponível</h2>
          <p className="text-sm text-muted-foreground mt-1">
            O NeuroDO foi atualizado. Recarregando automaticamente...
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Recarregar agora
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center p-8">
      <AlertTriangle className="h-10 w-10 text-destructive" />
      <div>
        <h2 className="text-lg font-semibold text-foreground">Algo deu errado</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          Ocorreu um erro inesperado. Tente novamente ou recarregue a página.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <pre className="mt-3 text-xs text-left bg-muted rounded p-3 max-w-lg overflow-auto">
            {error.message}
          </pre>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={reset} className="gap-2">
          Tentar novamente
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.location.reload()}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Recarregar
        </Button>
      </div>
    </div>
  );
}
