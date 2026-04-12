"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Zap } from 'lucide-react';

export default function EnergyReportPage() {
  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Energia</CardTitle>
          <CardDescription>
            Como está seu nível de energia ao longo dos dias?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <h3 className="font-semibold mb-2">O que é este relatório?</h3>
            <p className="text-sm text-muted-foreground">
              Aqui você acompanha seus check-ins de energia, identificando padrões de alta e baixa energia ao longo do tempo. Use esses dados para planejar tarefas importantes nos seus melhores horários.
            </p>
          </div>
          <div className="mt-8 text-muted-foreground text-sm">
            (Gráficos e dados reais de energia serão exibidos aqui.)
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
