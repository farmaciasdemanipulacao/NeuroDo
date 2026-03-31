import { EveningReviewForm } from '@/components/dashboard/evening-review-form';
import { HelpButton } from '@/components/ui/help-button';
import { helpContent } from '@/lib/help-content';

export default function ReviewPage() {
  return (
    <div className="flex-1">
       <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Revisão Noturna</h1>
          <HelpButton title="Como usar a Revisão Noturna" content={helpContent.eveningReview} />
        </div>
      </div>
      <p className="text-muted-foreground -mt-4 mb-6">Um ritual noturno para encerramento e preparação para o dia seguinte.</p>
      <EveningReviewForm />
    </div>
  );
}
