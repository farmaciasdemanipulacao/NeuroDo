import { RevenueTracker } from '@/components/dashboard/revenue-tracker';
import { HelpButton } from '@/components/ui/help-button';
import { helpContent } from '@/lib/help-content';

export default function RevenuePage() {
  return (
    <div className="flex-1 space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Painel de Receita</h1>
        <HelpButton
          title="Como usar o Painel de Receita"
          content={helpContent.revenue ?? 'Registre a receita mensal de cada projeto e acompanhe seu progresso em direção às metas.'}
        />
      </div>
      <p className="text-muted-foreground">
        Acompanhe a receita por projeto e visualize o progresso rumo às metas de R$20k e R$30k.
      </p>
      <RevenueTracker />
    </div>
  );
}
