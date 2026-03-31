'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartTooltip, ChartTooltipContent, ChartContainer } from '@/components/ui/chart';
import { achievements } from '@/lib/data';

const chartData = [
  { date: 'S1', tasks: 4 },
  { date: 'S2', tasks: 3 },
  { date: 'S3', tasks: 8 },
  { date: 'S4', tasks: 5 },
  { date: 'S5', tasks: 6 },
  { date: 'S6', tasks: 9 },
  { date: 'S7', tasks: 7 },
];

const chartConfig = {
  tasks: {
    label: "Tarefas Concluídas",
    color: "hsl(var(--primary))",
  },
};

export function MetricsChart() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
        <CardHeader>
            <CardTitle>Progresso Semanal</CardTitle>
            <CardDescription>Tarefas concluídas nas últimas 7 semanas.</CardDescription>
        </CardHeader>
        <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <ResponsiveContainer>
                <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: -10 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                    dataKey="date"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                />
                <YAxis />
                <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                />
                <Bar dataKey="tasks" fill="var(--color-tasks)" radius={4} />
                </BarChart>
            </ResponsiveContainer>
            </ChartContainer>
        </CardContent>
        </Card>
        <Card className="lg:col-span-3">
            <CardHeader>
                <CardTitle>Conquistas</CardTitle>
                <CardDescription>Celebrando seus marcos e vitórias.</CardDescription>
            </CardHeader>
            <CardContent>
                <ul className="space-y-4">
                    {achievements.map((ach) => (
                        <li key={ach.id} className="flex items-start gap-4">
                            <div className="p-2 bg-accent/20 rounded-full">
                                <span className="text-accent text-lg">🏆</span>
                            </div>
                            <div>
                                <p className="font-semibold">{ach.title}</p>
                                <p className="text-sm text-muted-foreground">{ach.description}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    </div>
  );
}
