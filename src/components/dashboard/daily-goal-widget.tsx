'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Target, Loader2, Calendar } from "lucide-react";
import type { Task } from "@/lib/types";
import { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { useSharedTasks } from '@/context/dashboard-data-provider';


export function DailyGoalWidget() {
    const { data: tasks, isLoading } = useSharedTasks();

    const mitTasks = useMemo(() => {
        if (!tasks) return [];
        const todayStr = new Date().toISOString().split('T')[0];
        return tasks
            .filter(task => task.isMIT && task.scheduledDate && task.scheduledDate.startsWith(todayStr))
            .sort((a, b) => (a.completed ? 1 : -1) - (b.completed ? 1 : -1) || (a.content || '').localeCompare(b.content || ''))
            .slice(0, 3);
    }, [tasks]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary"/>
                    Metas Mais Importantes
                </CardTitle>
                <CardDescription>Suas 3 prioridades (MITs) para hoje.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex items-center justify-center h-[100px]">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : mitTasks.length === 0 ? (
                     <div className="text-center text-sm text-muted-foreground h-[100px] flex flex-col justify-center items-center">
                        <Calendar className="h-8 w-8 mb-2" />
                        <p>Nenhuma "Tarefa Mais Importante"</p>
                        <p>definida para hoje.</p>
                     </div>
                ) : (
                    <TooltipProvider>
                        <ul className="space-y-3">
                            {mitTasks.map((task) => (
                                <li key={task.id} className="flex items-center gap-3">
                                     <Tooltip>
                                         <TooltipTrigger asChild>
                                             {/* Wrapping div is necessary for TooltipTrigger with asChild to work on a disabled component */}
                                             <div>
                                                 <Checkbox 
                                                     id={`goal-${task.id}`} 
                                                     checked={task.completed} 
                                                     disabled
                                                 />
                                             </div>
                                         </TooltipTrigger>
                                         <TooltipContent>
                                             <p>Conclua no Plano do Dia para ganhar XP</p>
                                         </TooltipContent>
                                     </Tooltip>
                                     <label htmlFor={`goal-${task.id}`} className="text-sm font-medium leading-none text-foreground/80 cursor-not-allowed">
                                        {task.content}
                                     </label>
                                </li>
                            ))}
                        </ul>
                    </TooltipProvider>
                )}
            </CardContent>
        </Card>
    );
}
