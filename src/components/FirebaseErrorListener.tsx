'use client';

import { useState, useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * An invisible component that listens for globally emitted 'permission-error' events.
 * It throws any received error to be caught by Next.js's global-error.tsx.
 */
export function FirebaseErrorListener() {
  // Use the specific error type for the state for type safety.
  const [error, setError] = useState<FirestorePermissionError | null>(null);

  useEffect(() => {
    // The callback now expects a strongly-typed error, matching the event payload.
    const handleError = (error: FirestorePermissionError) => {
      // Set error in state to trigger a re-render.
      setError(error);
    };

    // The typed emitter will enforce that the callback for 'permission-error'
    // matches the expected payload type (FirestorePermissionError).
    errorEmitter.on('permission-error', handleError);

    // Unsubscribe on unmount to prevent memory leaks.
    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, []);

  // On re-render, if an error exists in state, throw it.
  if (error) {
    throw error;
  }

  // This component renders nothing.
  return null;
}
import React, { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { FirebaseContext } from '@/firebase/provider';
import { createHash } from 'crypto';

export const FirebaseErrorListener: React.FC = () => {
  const { toast } = useToast();
  const ctx = React.useContext(FirebaseContext);

  useEffect(() => {
    if (!ctx) return;
    if (ctx.userError) {
      try {
        const payload = String(ctx.userError.message || '') + '\n' + String(ctx.userError.stack || '');
        const digest = createHash('sha256').update(payload).digest('hex').slice(0, 12);
        console.error(`[Firebase Listener] Digest: ${digest}`, ctx.userError);
        toast({ variant: 'destructive', title: `Erro de Autenticação (Digest ${digest})`, description: ctx.userError.message });
      } catch (logErr) {
        console.error('[Firebase Listener] Falha ao computar digest:', logErr, ctx.userError);
        toast({ variant: 'destructive', title: 'Erro de Autenticação', description: ctx.userError.message });
      }

      // Throw to let the Next.js error boundary capture and display digest in production
      throw ctx.userError;
    }
  }, [ctx, toast]);

  return null;
};
