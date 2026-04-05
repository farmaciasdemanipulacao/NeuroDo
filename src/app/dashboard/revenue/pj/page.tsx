import { PJRevenueTracker } from '@/components/dashboard/pj-revenue-tracker';
import { HelpButton } from '@/components/ui/help-button';
import { helpContent } from '@/lib/help-content';

export default function RevenuePJPage() {
  return (
    <div className="flex-1 space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Receitas PJ — Projetos</h1>
        <HelpButton
          title="Como usar Receitas PJ"
          content={helpContent.revenuePJ ?? 'Registre o faturamento bruto e custos de cada projeto (PJ). O sistema calcula automaticamente o lucro líquido e mostra qual projeto mais contribui para o ecossistema.'}
        />
      </div>
      <p className="text-muted-foreground">
        Faturamento e margem de lucro de cada empresa/projeto do ecossistema.
      </p>
      <PJRevenueTracker />
    </div>
  );
}
