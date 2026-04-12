"use client";

import React from 'react';
import { usePathname } from 'next/navigation';

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="py-6 max-w-5xl mx-auto px-4">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Veja análises sobre Energia, Produtividade, Foco, Métricas e Gamificação.</p>
        <p className="mt-2 text-xs text-muted-foreground">{pathname.includes('productivity') ? 'Produtividade — Quanto tempo você investiu em cada tarefa, meta e projeto?' : ''}</p>
      </header>
      <main>
        {children}
      </main>
    </div>
  );
}
