'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useCollection, useUser, useFirestore, useMemoFirebase, deleteDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import type { TeamMember } from '@/lib/types';
import { collection, query, doc } from 'firebase/firestore';
import { PlusCircle, Loader2, Users, Gift, UserCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { TeamMemberForm } from './team-member-form';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { isWithinInterval, addDays, parseISO } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '../ui/badge';
import { HelpButton } from '../ui/help-button';
import { helpContent } from '@/lib/help-content';


export function TeamView() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  const teamQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'users', user.uid, 'team'));
  }, [user, firestore]);

  const { data: team, isLoading: areTeamLoading } = useCollection<TeamMember>(teamQuery);

  const isLoading = isUserLoading || areTeamLoading;

  const upcomingBirthdays = useMemo(() => {
    if (!team) return [];
    const today = new Date();
    // Set hours to 0 to compare dates correctly
    today.setHours(0, 0, 0, 0);
    const nextSevenDays = addDays(today, 7);
    
    return team.filter(member => {
      if (!member.birthDate) return false;
      try {
        const [year, month, day] = member.birthDate.split('-').map(Number);
        // Create date in UTC to avoid timezone issues
        const birthDate = new Date(Date.UTC(today.getUTCFullYear(), month - 1, day));
        
        // Handle cases where the birthday already passed this year
        if (birthDate < today) {
          birthDate.setFullYear(today.getFullYear() + 1);
        }
        
        return isWithinInterval(birthDate, { start: today, end: nextSevenDays });
      } catch (e) {
        console.error("Error parsing birthDate", member.birthDate, e);
        return false;
      }
    });
  }, [team]);

  const handleOpenCreateDialog = () => {
    setEditingMember(null);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingMember(null);
  };

  return (
    <>
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
          <div className="flex-1 flex items-center gap-2">
             <div>
                <h1 className="text-3xl font-bold tracking-tight">Central de Relacionamentos</h1>
                <p className="text-muted-foreground">Gerencie os perfis e interações com as pessoas importantes.</p>
             </div>
             <HelpButton title="A Central de Relacionamentos" content={helpContent.team} />
          </div>
          <Button onClick={handleOpenCreateDialog}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nova Pessoa
          </Button>
        </div>

        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingMember ? `Editar Perfil de ${editingMember.name}` : 'Adicionar Nova Pessoa'}</DialogTitle>
             <DialogDescription>
                Preencha os detalhes abaixo para adicionar ou editar um membro da equipe.
            </DialogDescription>
          </DialogHeader>
          <TeamMemberForm 
            key={editingMember?.id || 'new'}
            teamMember={editingMember}
            onSuccess={handleFormSuccess}
          />
        </DialogContent>
      </Dialog>
      
      {upcomingBirthdays.length > 0 && (
        <Alert className="mb-6 bg-blue-500/10 border-blue-500/30 text-blue-300 [&>svg]:text-blue-400">
          <Gift className="h-4 w-4" />
          <AlertTitle className="font-bold">Aniversariantes à Vista!</AlertTitle>
          <AlertDescription>
            {upcomingBirthdays.map(member => (
              <span key={member.id} className="block">
                {member.name} faz aniversário em {new Date(0, parseInt(member.birthDate!.split('-')[1]) - 1, parseInt(member.birthDate!.split('-')[2])).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}.
              </span>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-24">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && !team?.length && (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <Users className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Nenhuma pessoa cadastrada</h3>
            <p className="mt-1 text-sm text-muted-foreground">Clique em "Nova Pessoa" para começar a montar sua rede.</p>
             <Button onClick={handleOpenCreateDialog} className="mt-4">
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Pessoa
            </Button>
        </div>
      )}

      {!isLoading && team && team.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {team.map((member) => (
            <Link href={`/dashboard/team/${member.id}`} key={member.id} className="group">
                <Card className="flex flex-col transition-all h-full hover:border-primary/50 hover:shadow-lg">
                    <CardHeader className="flex flex-row items-center gap-4">
                    <Avatar className="h-16 w-16">
                        <AvatarImage src={member.avatarUrl} alt={member.name} />
                        <AvatarFallback><UserCircle className="h-10 w-10 text-muted-foreground" /></AvatarFallback>
                    </Avatar>
                    <div>
                        <CardTitle className="text-xl">{member.name}</CardTitle>
                        <CardDescription>{member.role}</CardDescription>
                        <Badge variant="outline" className="mt-2 text-xs">{member.relationshipType}</Badge>
                    </div>
                    </CardHeader>
                    <CardContent className="flex-grow">
                        <p className="text-sm text-muted-foreground line-clamp-2">
                            <span className="font-semibold text-foreground">Principais Tarefas/Funções:</span> {member.mainTasks}
                        </p>
                        {member.profileQuestionnaireId && !member.profileResults && (
                            <Badge variant="secondary" className="mt-3">Questionário Pendente</Badge>
                        )}
                    </CardContent>
                    <CardFooter/>
                </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

    