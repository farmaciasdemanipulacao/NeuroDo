'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Rocket, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Project } from '@/lib/types';

const statusLabel: Record<string, string> = {
  active: 'Em dia',
  paused: 'Pausado',
  archived: 'Arquivado',
};

export function ProjectOverview() {
  const { user } = useUser();
  const firestore = useFirestore();

  const projectsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'users', user.uid, 'projects'),
      where('status', '!=', 'archived')
    );
  }, [firestore, user]);

  const { data: projects, isLoading } = useCollection<Project>(projectsQuery);

  const sortedProjects = useMemo(() => {
    if (!projects) return [];
    return [...projects].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [projects]);

  const [featuredProjectId, setFeaturedProjectId] = useState<string | null>(null);

  const featuredProject = useMemo(() => {
    if (!sortedProjects.length) return null;
    return sortedProjects.find(p => p.id === featuredProjectId) ?? sortedProjects[0];
  }, [sortedProjects, featuredProjectId]);

  const otherProjects = useMemo(
    () => sortedProjects.filter(p => p.id !== featuredProject?.id),
    [sortedProjects, featuredProject]
  );

  if (isLoading) {
    return (
      <Card className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  if (!featuredProject) {
    return (
      <Card className="flex items-center justify-center min-h-[200px]">
        <p className="text-sm text-muted-foreground">Nenhum projeto ativo encontrado.</p>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      <Card className="flex flex-col col-span-1 md:col-span-2 lg:col-span-3">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className={cn('p-2 rounded-lg', `bg-[${featuredProject.color}]/20`)}>
              <Rocket className="h-6 w-6" style={{ color: featuredProject.color }} />
            </div>
            <div>
              <CardTitle className="text-2xl">{featuredProject.name}</CardTitle>
              <CardDescription>{featuredProject.description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-grow space-y-4">
          <div>
            <div className="mb-2 flex justify-between items-baseline">
              <p className="text-sm font-medium">Progresso</p>
              <p className="text-sm font-bold">{featuredProject.progress ?? 0}%</p>
            </div>
            <Progress value={featuredProject.progress ?? 0} className="h-2" />
          </div>
          {featuredProject.goals && featuredProject.goals.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Metas Principais</p>
              <ul className="space-y-2">
                {featuredProject.goals.slice(0, 2).map(goal => (
                  <li key={goal} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    <span>{goal}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            Status: {statusLabel[featuredProject.status] ?? featuredProject.status}
          </div>
        </CardFooter>
      </Card>

      {otherProjects.length > 0 && (
        <div className="col-span-1 md:col-span-2 lg:col-span-3 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {otherProjects.map(project => (
            <Card
              key={project.id}
              className="hover:bg-muted/50 cursor-pointer transition-colors flex flex-col justify-between"
              onClick={() => setFeaturedProjectId(project.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base font-semibold">{project.name}</CardTitle>
                  <Rocket className="h-5 w-5" style={{ color: project.color }} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">{project.progress ?? 0}% completo</div>
                <Progress value={project.progress ?? 0} className="h-1 mt-1" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
