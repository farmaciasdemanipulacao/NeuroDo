import { EnergyDashboard } from '@/components/dashboard/energy-dashboard';
import { HelpButton } from '@/components/ui/help-button';
import { helpContent } from '@/lib/help-content';

export default function EnergyPage() {
  return (
    <div className="flex-1 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Energia &amp; Produtividade</h1>
            <HelpButton title="Como usar o Painel de Energia" content={helpContent.energy} />
          </div>
          <p className="text-muted-foreground mt-1">
            Entenda seus padrões, otimize seus picos, respeite suas quedas.
          </p>
        </div>
      </div>
      <EnergyDashboard />
    </div>
  );
}
