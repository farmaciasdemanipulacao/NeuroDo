'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { projects } from '@/lib/data';
import type { Delegation, TeamMember, Goal } from '@/lib/types';
import { PlusCircle, Search, Loader2, AlertTriangle, Check, Bell, Users, Pencil, Target } from 'lucide-react';
import { Badge } from '../ui/badge';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useCollection, useUser, useFirestore, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { cn, getUrgencyColor } from '@/lib/utils';
import { HelpButton } from '../ui/help-button';
import { helpContent } from '@/lib/help-content';
import { DelegationForm } from './delegation-form';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { UserCircle, Trash2 } from 'lucide-react';

const getStatusStyles = (status: Delegation['status']) => {
    switch (status) {
        case 'Atrasada': return 'bg-red-500/20 text-red-400 border-red-500/30';
        case 'Aguardando Resposta': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
        case 'Em Progresso': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
        case 'Concluída': return 'bg-green-500/20 text-green-400 border-green-500/30';
        case 'Pendente':
        default: return 'bg-muted text-muted-foreground border-border';
    }
}

export function DelegationsView() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDelegation, setEditingDelegation] = useState<Delegation | null>(null);

  const delegationsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'users', user.uid, 'delegations'));
  }, [user, firestore]);

  const { data: delegations, isLoading: areDelegationsLoading } = useCollection<Delegation>(delegationsQuery);
  
  const teamQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'users', user.uid, 'team'));
  }, [user, firestore]);
  const { data: teamMembers } = useCollection<TeamMember>(teamQuery);
  
  const goalsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'users', user.uid, 'goals'));
  }, [user, firestore]);
  const { data: goals } = useCollection<Goal>(goalsQuery);

  const isLoading = isUserLoading || areDelegationsLoading;

  const sortedDelegations = useMemo(() => {
      if (!delegations) return [];
      const statusOrder = { 'Atrasada': 1, 'Aguardando Resposta': 2, 'Em Progresso': 3, 'Pendente': 4, 'Concluída': 5 };
      return [...delegations].sort((a, b) => {
          if (a.status === 'Concluída' && b.status !== 'Concluída') return 1;
          if (a.status !== 'Concluída' && b.status === 'Concluída') return -1;
          return statusOrder[a.status] - statusOrder[b.status];
      });
  }, [delegations]);

  const stats = useMemo(() => {
    if (!delegations) return { totalMonth: 0, awaiting: 0, overdue: 0, completedMonth: 0 };
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    return delegations.reduce((acc, del) => {
        const createdAt = (del.createdAt as any)?.toDate ? (del.createdAt as any).toDate() : new Date(del.createdAt as string);
        if (createdAt >= startOfMonth) {
            acc.totalMonth++;
        }
        if (del.status === 'Aguardando Resposta') acc.awaiting++;
        if (del.status === 'Atrasada') acc.overdue++;
        if (del.status === 'Concluída' && createdAt >= startOfMonth) {
            acc.completedMonth++;
        }
        return acc;
    }, { totalMonth: 0, awaiting: 0, overdue: 0, completedMonth: 0 });
  }, [delegations]);
  
  const handleOpenCreateDialog = () => {
    setEditingDelegation(null);
    setIsFormOpen(true);
  };
  
  const handleOpenEditDialog = (delegation: Delegation) => {
    setEditingDelegation(delegation);
    setIsFormOpen(true);
  }

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingDelegation(null);
  };

  const handleDelete = (delegationId: string) => {
    if (!firestore || !user) return;
    deleteDocumentNonBlocking(doc(firestore, 'users', user.uid, 'delegations', delegationId));
    toast({ title: 'Delegação Removida', description: 'A delegação foi excluída com sucesso.'});
  };

  return (
    <>
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
            <div className="flex-1 flex items-center gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Central de Delegações</h1>
                <HelpButton title="Como Usar a Central de Delegações" content={helpContent.delegations} />
            </div>
            <Button onClick={handleOpenCreateDialog}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nova Delegação
            </Button>
        </div>
         <DialogContent className="sm:max-w-xl">
            <DialogHeader>
                <DialogTitle>{editingDelegation ? 'Editar Delegação' : 'Criar Nova Delegação'}</DialogTitle>
            </DialogHeader>
            <DelegationForm 
                key={editingDelegation?.id || 'new'}
                delegation={editingDelegation}
                teamMembers={teamMembers || []}
                goals={goals || []}
                onSuccess={handleFormSuccess}
            />
        </DialogContent>
      </Dialog>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Delegadas no Mês</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{stats.totalMonth}</div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Aguardando Resposta</CardTitle>
                <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className={cn("text-2xl font-bold", stats.awaiting > 0 && "text-amber-500")}>{stats.awaiting}</div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Atrasadas</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className={cn("text-2xl font-bold", stats.overdue > 0 && "text-red-500")}>{stats.overdue}</div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Concluídas no Mês</CardTitle>
                <Check className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-green-500">{stats.completedMonth}</div>
            </CardContent>
        </Card>
      </div>

       {isLoading && (
        <div className="flex items-center justify-center py-24">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && !delegations?.length && (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <Users className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Nenhuma tarefa delegada</h3>
            <p className="mt-1 text-sm text-muted-foreground">Clique em "Nova Delegação" para começar a empoderar sua equipe.</p>
        </div>
      )}
      
      {!isLoading && sortedDelegations.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedDelegations.map(d => {
                  const member = teamMembers?.find(m => m.id === d.delegatedTo);
                  const goal = goals?.find(g => g.id === d.goalId);
                  const dueDate = (d.dueDate as any)?.toDate ? (d.dueDate as any).toDate() : new Date(d.dueDate as string);
                  const urgencyColor = getUrgencyColor(dueDate);
                  const cardStyle = d.status === 'Concluída' ? {} : { borderColor: urgencyColor };

                  return (
                    <Card 
                        key={d.id} 
                        className={cn(
                            "group transition-all hover:shadow-lg flex flex-col",
                            d.status === 'Concluída' && "opacity-50"
                        )}
                        style={cardStyle}
                    >
                        <CardHeader>
                            <CardTitle className="text-lg line-clamp-2">{d.taskTitle}</CardTitle>
                            <CardDescription className="flex items-center gap-2 pt-1">
                                <Avatar className="h-6 w-6">
                                    <AvatarImage src={member?.avatarUrl} />
                                    <AvatarFallback><UserCircle className="h-4 w-4" /></AvatarFallback>
                                </Avatar>
                                <span>Para: {member?.name || d.delegatedTo}</span>
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow space-y-4">
                            <p className="text-sm text-muted-foreground line-clamp-2">{d.taskDescription}</p>
                            {goal && (
                                <div className="flex items-center gap-2 text-xs text-primary/80">
                                    <Target className="h-3 w-3" />
                                    <p className="font-semibold truncate">Meta: {goal.title}</p>
                                </div>
                            )}
                            <div className="flex justify-between items-center text-xs">
                                <Badge variant="outline" className={cn(getStatusStyles(d.status))}>{d.status}</Badge>
                                <p>Prioridade: {d.priority}</p>
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-between items-end">
                            <div>
                                <p className="text-xs text-muted-foreground">Prazo</p>
                                <p className="text-sm font-semibold">{format(dueDate, 'dd MMM, yyyy', { locale: ptBR })}</p>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEditDialog(d)}>
                                    <Pencil className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Excluir Delegação?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                            Tem certeza que deseja excluir a delegação "{d.taskTitle}"? Esta ação é permanente.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDelete(d.id)}>Excluir</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </CardFooter>
                    </Card>
                  )
              })}
          </div>
      )}
    </>
  );
}

    