import { MetricsChart } from '@/components/dashboard/metrics-chart';
import { HelpButton } from '@/components/ui/help-button';
import { helpContent } from '@/lib/help-content';

export default function MetricsPage() {
  return (
    <div className="flex-1 space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Métricas & Conquistas</h1>
        <HelpButton title="Como usar Métricas & Conquistas" content={helpContent.metrics} />
      </div>
      <p className="text-muted-foreground">Acompanhe seu progresso e celebre sua competência.</p>
      <MetricsChart />
    </div>
  );
}
