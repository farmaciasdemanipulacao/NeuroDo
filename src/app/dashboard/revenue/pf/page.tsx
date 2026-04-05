import { RevenueTracker } from '@/components/dashboard/revenue-tracker';
import { HelpButton } from '@/components/ui/help-button';
import { helpContent } from '@/lib/help-content';

export default function RevenuePFPage() {
  return (
    <div className="flex-1 space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Receitas PF — Distribuição por Projeto</h1>
        <HelpButton
          title="Como usar Receitas PF"
          content={helpContent.revenuePF ?? helpContent.revenue ?? 'Registre a receita mensal de cada projeto e acompanhe seu progresso em direção às metas.'}
        />
      </div>
      <p className="text-muted-foreground">
        Quanto cada projeto distribui para você como Pessoa Física mensalmente.
      </p>
      <RevenueTracker />
    </div>
  );
}
