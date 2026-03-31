'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { projects } from '@/lib/data';
import { cn } from '@/lib/utils';
import { Rocket, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/button';

export function ProjectOverview() {
  const [featuredProject, setFeaturedProject] = useState(projects[2]);

  const otherProjects = projects.filter(p => p.id !== featuredProject.id);

  return (
    <div className="grid gap-6">
      <Card className="flex flex-col col-span-1 md:col-span-2 lg:col-span-3">
        <CardHeader>
          <div className="flex items-center gap-4">
             <div className={cn("p-2 rounded-lg", `bg-${featuredProject.tailwindColor}/20`)}>
                <Rocket className={cn("h-6 w-6", `text-${featuredProject.tailwindColor}`)} />
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
                <p className="text-sm font-bold">{featuredProject.progress}%</p>
              </div>
              <Progress value={featuredProject.progress} className="h-2" style={{'--tw-bg-primary': featuredProject.color} as React.CSSProperties} />
            </div>
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
        </CardContent>
        <CardFooter>
            <Button variant="outline">Ver Detalhes do Projeto</Button>
        </CardFooter>
      </Card>
      
      <div className="col-span-1 md:col-span-2 lg:col-span-3 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {otherProjects.map(project => (
          <Card 
            key={project.id} 
            className="hover:bg-muted/50 cursor-pointer transition-colors flex flex-col justify-between"
            onClick={() => setFeaturedProject(project)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base font-semibold">{project.name}</CardTitle>
                <Rocket className={cn("h-5 w-5", `text-${project.tailwindColor}`)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">{project.progress}% completo</div>
              <Progress value={project.progress} className="h-1 mt-1" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
