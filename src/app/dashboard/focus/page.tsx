import { FocusTimer } from '@/components/dashboard/focus-timer';
import { HelpButton } from '@/components/ui/help-button';
import { helpContent } from '@/lib/help-content';

export default function FocusPage() {
  return (
    <div className="flex-1">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Sessão de Foco</h1>
          <HelpButton title="Como usar a Sessão de Foco" content={helpContent.focusTimer} />
        </div>
      </div>
      <div className="flex justify-center">
        <FocusTimer />
      </div>
    </div>
  );
}
