'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { generateText } from '@/ai/flows/generate-text-flow';

export function useGenerateText() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState<string | null>(null);
  const { toast } = useToast();

  const generate = async (prompt: string, onSuccess: (text: string) => void) => {
    setIsGenerating(true);
    setGeneratedText(null);
    try {
      const result = await generateText({ prompt });
      // Remove quotes and markdown characters for cleaner output
      const cleanText = result.text.replace(/["*#]/g, '').trim();
      setGeneratedText(cleanText);
      onSuccess(cleanText);
    } catch (error: any) {
      console.error('Text generation failed:', error);
      toast({
        variant: 'destructive',
        title: 'Erro na Geração de Texto',
        description: error.message || 'Não foi possível obter uma sugestão da IA. Verifique sua conexão e tente novamente.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return { isGenerating, generatedText, generateText: generate };
}
