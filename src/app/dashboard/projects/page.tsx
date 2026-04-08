import { ProjectsView } from '@/components/dashboard/projects-view';
import { MentorProjects } from '@/components/dashboard/mentor-projects';

export default function ProjectsPage() {
  return (
    <div className="flex-1 space-y-6">
      <MentorProjects />
      <ProjectsView />
    </div>
  );
}
