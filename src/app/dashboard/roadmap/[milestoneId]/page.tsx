import { MilestoneDetailView } from '@/components/dashboard/milestone-detail-view';

export default async function MilestoneDetailPage({ params }: { params: Promise<{ milestoneId: string }> }) {
  const { milestoneId } = await params;
  return (
    <div className="flex-1 space-y-6">
      <MilestoneDetailView milestoneId={milestoneId} />
    </div>
  );
}
