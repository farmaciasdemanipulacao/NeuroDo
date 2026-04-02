'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Rocket, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { useCollection, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { Project } from '@/lib/types';

export function ProjectOverview() {
  const { user } = useUser();
  const firestore = useFirestore();

  const projectsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'users', user.uid, 'projects'));
  }, [user, firestore]);

  const { data: projects, isLoading } = useCollection<Project>(projectsQuery);

  const [featuredProjectId, setFeaturedProjectId] = useState<string | null>(null);

  const featuredProject = useMemo(() => {
    if (!projects || projects.length === 0) return null;
    if (featuredProjectId) {
      return projects.find(p => p.id === featuredProjectId) ?? projects[0];
    }
    // Default to first active project
    return projects.find(p => p.status === 'active') ?? projects[0];
  }, [projects, featuredProjectId]);

  const otherProjects = useMemo(() => {
    if (!projects || !featuredProject) return [];
    return projects.filter(p => p.id !== featuredProject.id);
  }, [projects, featuredProject]);

  if (isLoading) {
    return (
      <div className="grid gap-6">
        <Card className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </Card>
      </div>
    );
  }

  if (!featuredProject) {
    return (
      <div className="grid gap-6">
        <Card className="flex items-center justify-center h-48">
          <p className="text-muted-foreground text-sm">Nenhum projeto encontrado. Popule os dados iniciais no Painel.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <Card className="flex flex-col col-span-1 md:col-span-2 lg:col-span-3">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className={cn("p-2 rounded-lg", featuredProject.tailwindColor ? `bg-${featuredProject.tailwindColor}/20` : 'bg-primary/20')}>
              <Rocket className={cn("h-6 w-6", featuredProject.tailwindColor ? `text-${featuredProject.tailwindColor}` : 'text-primary')} />
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
            <Progress
              value={featuredProject.progress ?? 0}
              className="h-2"
              style={{ '--tw-bg-primary': featuredProject.color } as any}
            />
          </div>
          {featuredProject.goals && featuredProject.goals.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Metas Principais</p>
              <ul className="space-y-2">
                {featuredProject.goals.slice(0, 2).map((goal, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    <span>{goal}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button variant="outline">Ver Detalhes do Projeto</Button>
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
                  <Rocket className={cn("h-5 w-5", project.tailwindColor ? `text-${project.tailwindColor}` : 'text-primary')} />
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

