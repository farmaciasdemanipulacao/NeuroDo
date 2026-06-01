"use client";

import React, { useState, useEffect, useContext } from "react";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { useToast } from "@/hooks/use-toast";
import { FirebaseContext } from "@/firebase/provider";

// Simple synchronous string hash (FNV-1a 32-bit) — works in browser and server
function hashString(s: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return ("00000000" + (h >>> 0).toString(16)).slice(-8);
}

/**
 * FirebaseErrorListener centraliza a captura de erros de Firebase (emitter e contexto)
 * e registra um "digest" no console para facilitar o rastreamento do erro 500 do SSR.
 */
export function FirebaseErrorListener() {
  const { toast } = useToast();
  const ctx = useContext(FirebaseContext);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const handleError = (err: FirestorePermissionError) => setError(err);
    errorEmitter.on("permission-error", handleError);
    return () => errorEmitter.off("permission-error", handleError);
  }, []);

  useEffect(() => {
    if (ctx?.userError) setError(ctx.userError as Error);
  }, [ctx?.userError]);

  if (error) {
    const payload = `${error.message}\n${error.stack ?? ""}`;
    const digest = hashString(payload);
    try {
      console.error(`[Firebase Listener] Digest: ${digest}`, error);
      toast({ variant: "destructive", title: `Erro de Firebase (Digest ${digest})`, description: error.message });
    } catch (e) {
      console.error("[Firebase Listener] Falha ao mostrar toast:", e);
    }

    // Throw to let Next.js capture the error in its error boundary and surface the digest.
    throw error;
  }

  return null;
}
