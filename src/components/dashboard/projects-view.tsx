'use client';

import { useState, useMemo } from 'react';
import { useProjects } from '@/hooks/use-projects';
import { ProjectFormDialog } from '@/components/dashboard/project-form-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Plus,
  MoreVertical,
  Pencil,
  Pause,
  Play,
  Trash2,
  Undo2,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  FolderKanban,
  AlertTriangle,
  Loader2,
  History,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ManagedProject, ProjectCategory, ManagedProjectStatus } from '@/lib/types';
import { ProjectIcon } from './project-icon';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ── Constantes ────────────────────────────────────────────────────────────────

const MAX_EXECUTION = 3;
const MAX_OVERSIGHT = 5;
const MAX_PERSONAL = 3;

const categoryConfig: Record<ProjectCategory, { label: string; emoji: string; max: number; description: string }> = {
  execution: { label: 'Execução', emoji: '🚀', max: MAX_EXECUTION, description: 'Projetos que você opera diretamente' },
  oversight: { label: 'Acompanhamento', emoji: '👁', max: MAX_OVERSIGHT, description: 'Projetos onde você delega e acompanha' },
  personal: { label: 'Pessoal', emoji: '🌱', max: MAX_PERSONAL, description: 'Vida pessoal, saúde, família' },
};

const valueTypeBadge: Record<string, string> = {
  financial: 'text-green-400 border-green-400/30 bg-green-400/10',
  amplifier: 'text-blue-400 border-blue-400/30 bg-blue-400/10',
  personal: 'text-pink-400 border-pink-400/30 bg-pink-400/10',
  experimental: 'text-amber-400 border-amber-400/30 bg-amber-400/10',
};

const valueTypeLabel: Record<string, string> = {
  financial: '💰 Financeiro',
  amplifier: '📣 Amplificador',
  personal: '❤️ Pessoal',
  experimental: '🧪 Experimental',
};

const ownerRoleLabel: Record<string, string> = {
  leader: 'Líder',
  trainer: 'Treinador',
  consultant: 'Consultor',
  away: 'Ausente',
};

// ── Sub-componentes ────────────────────────────────────────────────────────────

function SlotBadge({ used, max }: { used: number; max: number }) {
  const remaining = max - used;
  const color =
    remaining === 0
      ? 'text-red-400 border-red-400/30 bg-red-400/10'
      : remaining === 1
        ? 'text-amber-400 border-amber-400/30 bg-amber-400/10'
        : 'text-green-400 border-green-400/30 bg-green-400/10';
  return (
    <Badge variant="outline" className={color}>
      {used}/{max} slots
    </Badge>
  );
}

function ChangelogDialog({
  project,
  open,
  onClose,
}: {
  project: ManagedProject;
  open: boolean;
  onClose: () => void;
}) {
  const entries = [...(project.changelog ?? [])].reverse();
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Histórico — {project.name}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-2">
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum registro ainda.</p>
          ) : (
            <ol className="relative border-l border-border/40 ml-2 space-y-4">
              {entries.map((entry) => (
                <li key={entry.id} className="ml-4">
                  <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-background bg-primary/60" />
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(entry.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                  <p className="text-sm mt-0.5">{entry.description}</p>
                  {entry.previousValue && entry.newValue && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {entry.previousValue} → {entry.newValue}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

interface ProjectCardProps {
  project: ManagedProject;
  index: number;
  total: number;
  isExecution: boolean;
  allProjects: ManagedProject[];
  onEdit: (p: ManagedProject) => void;
  onPause: (p: ManagedProject) => void;
  onResume: (p: ManagedProject) => void;
  onScheduleDelete: (p: ManagedProject) => void;
  onCancelDelete: (p: ManagedProject) => void;
  onMoveUp: (p: ManagedProject) => void;
  onMoveDown: (p: ManagedProject) => void;
}

function ProjectCard({
  project,
  index,
  total,
  isExecution,
  allProjects,
  onEdit,
  onPause,
  onResume,
  onScheduleDelete,
  onCancelDelete,
  onMoveUp,
  onMoveDown,
}: ProjectCardProps) {
  const [showLog, setShowLog] = useState(false);
  const isPendingDeletion = project.status === 'pending_deletion';
  const subProjects = allProjects.filter((p) => p.parentId === project.id);

  return (
    <>
      <Card
        className={`transition-all ${
          isPendingDeletion
            ? 'border-red-500/40 bg-red-500/5'
            : 'border-border/40 hover:border-border/70'
        }`}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            {/* Prioridade + info */}
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {isExecution && (
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    disabled={index === 0}
                    onClick={() => onMoveUp(project)}
                  >
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <span className="text-xs font-bold text-muted-foreground">{index + 1}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    disabled={index === total - 1}
                    onClick={() => onMoveDown(project)}
                  >
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div
                    className="flex items-center justify-center w-7 h-7 rounded-md shrink-0"
                    style={{
                      backgroundColor: (project.iconColor ?? '#22C55E') + '22',
                      border: `1px solid ${project.iconColor ?? '#22C55E'}44`,
                    }}
                  >
                    <ProjectIcon icon={project.icon} iconColor={project.iconColor} className="h-4 w-4" />
                  </div>
                  <h3 className="font-semibold text-sm truncate">{project.name}</h3>
                  {isPendingDeletion && (
                    <Badge variant="outline" className="text-red-400 border-red-400/30 bg-red-400/10 shrink-0">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Exclusão agendada
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{project.description}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge variant="outline" className={`text-xs ${valueTypeBadge[project.valueType] ?? ''}`}>
                    {valueTypeLabel[project.valueType]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {ownerRoleLabel[project.ownerRole]}
                    {project.responsibleName ? ` · ${project.responsibleName}` : ''}
                  </span>
                </div>
                {subProjects.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {subProjects.length} sub-projeto{subProjects.length > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>

            {/* Ações */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(project)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowLog(true)}>
                  <History className="h-4 w-4 mr-2" />
                  Histórico
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {isPendingDeletion ? (
                  <DropdownMenuItem onClick={() => onCancelDelete(project)} className="text-green-400">
                    <Undo2 className="h-4 w-4 mr-2" />
                    Cancelar exclusão
                  </DropdownMenuItem>
                ) : project.status === 'active' ? (
                  <DropdownMenuItem onClick={() => onPause(project)}>
                    <Pause className="h-4 w-4 mr-2" />
                    Pausar
                  </DropdownMenuItem>
                ) : project.status === 'paused' ? (
                  <DropdownMenuItem onClick={() => onResume(project)}>
                    <Play className="h-4 w-4 mr-2" />
                    Retomar
                  </DropdownMenuItem>
                ) : null}
                {!isPendingDeletion && (
                  <DropdownMenuItem
                    onClick={() => onScheduleDelete(project)}
                    className="text-red-400"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Agendar exclusão
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      <ChangelogDialog
        project={project}
        open={showLog}
        onClose={() => setShowLog(false)}
      />
    </>
  );
}

// ── Seção de categoria ─────────────────────────────────────────────────────────

interface CategorySectionProps {
  category: ProjectCategory;
  projects: ManagedProject[];
  allProjects: ManagedProject[];
  onAdd: (category: ProjectCategory) => void;
  onEdit: (p: ManagedProject) => void;
  onPause: (p: ManagedProject) => void;
  onResume: (p: ManagedProject) => void;
  onScheduleDelete: (p: ManagedProject) => void;
  onCancelDelete: (p: ManagedProject) => void;
  onMoveUp: (p: ManagedProject) => void;
  onMoveDown: (p: ManagedProject) => void;
}

function CategorySection({
  category,
  projects,
  allProjects,
  onAdd,
  onEdit,
  onPause,
  onResume,
  onScheduleDelete,
  onCancelDelete,
  onMoveUp,
  onMoveDown,
}: CategorySectionProps) {
  const config = categoryConfig[category];
  const atLimit = projects.length >= config.max;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-base">
            {config.emoji} {config.label}
          </h2>
          <SlotBadge used={projects.length} max={config.max} />
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onAdd(category)}
          disabled={atLimit}
          title={atLimit ? `Limite de ${config.max} projetos atingido` : 'Novo projeto'}
        >
          <Plus className="h-4 w-4 mr-1" />
          Novo
        </Button>
      </div>
      <p className="text-xs text-muted-foreground -mt-1">{config.description}</p>

      {projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/40 p-6 text-center">
          <p className="text-sm text-muted-foreground">Nenhum projeto ativo nesta categoria.</p>
          <Button variant="link" size="sm" className="mt-1" onClick={() => onAdd(category)}>
            Adicionar primeiro projeto
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {projects.map((project, idx) => (
            <ProjectCard
              key={project.id}
              project={project}
              index={idx}
              total={projects.length}
              isExecution={category === 'execution'}
              allProjects={allProjects}
              onEdit={onEdit}
              onPause={onPause}
              onResume={onResume}
              onScheduleDelete={onScheduleDelete}
              onCancelDelete={onCancelDelete}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// ── View principal ─────────────────────────────────────────────────────────────

export function ProjectsView() {
  const {
    projects,
    executionProjects,
    oversightProjects,
    personalProjects,
    pausedProjects,
    isLoading,
    createProject,
    updateProject,
    changeStatus,
    scheduleDelete,
    cancelDelete,
    reorderPriorities,
  } = useProjects();

  const { toast } = useToast();

  // Form dialog
  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ManagedProject | null>(null);
  const [defaultCategory, setDefaultCategory] = useState<ProjectCategory>('execution');

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<ManagedProject | null>(null);

  // Pausados collapsible
  const [pausedOpen, setPausedOpen] = useState(false);

  const allProjects = projects ?? [];

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleAdd(category: ProjectCategory) {
    const config = categoryConfig[category];
    const current =
      category === 'execution'
        ? executionProjects.length
        : category === 'oversight'
          ? oversightProjects.length
          : personalProjects.length;

    if (current >= config.max) {
      toast({
        title: 'Limite de projetos atingido',
        description: `Você já tem ${config.max} projetos em "${config.label}". Pause um antes de adicionar novo.`,
        variant: 'destructive',
      });
      return;
    }

    setDefaultCategory(category);
    setEditingProject(null);
    setFormOpen(true);
  }

  function handleEdit(project: ManagedProject) {
    setEditingProject(project);
    setFormOpen(true);
  }

  function handleFormSubmit(
    data: Omit<ManagedProject, 'id' | 'userId' | 'changelog' | 'createdAt' | 'updatedAt' | 'deletionScheduledAt' | 'status' | 'priority'>
  ) {
    if (editingProject) {
      updateProject(
        editingProject.id,
        data,
        `Dados do projeto atualizados`
      );
    } else {
      // Define prioridade inicial como último slot disponível
      const currentExecution = executionProjects.length;
      createProject({
        ...data,
        status: 'active',
        priority: data.category === 'execution' ? currentExecution + 1 : null,
      });
    }
  }

  function handlePause(project: ManagedProject) {
    changeStatus(project.id, 'paused', `Projeto pausado pelo usuário`);
    toast({ title: `"${project.name}" pausado` });
  }

  function handleResume(project: ManagedProject) {
    const cat = project.category;
    const config = categoryConfig[cat];
    const current =
      cat === 'execution'
        ? executionProjects.length
        : cat === 'oversight'
          ? oversightProjects.length
          : personalProjects.length;

    if (current >= config.max) {
      toast({
        title: 'Slot indisponível',
        description: `Limite de ${config.max} em "${config.label}" atingido. Pause outro antes de retomar.`,
        variant: 'destructive',
      });
      return;
    }

    changeStatus(project.id, 'active', `Projeto retomado pelo usuário`);
    toast({ title: `"${project.name}" retomado` });
  }

  function handleScheduleDelete(project: ManagedProject) {
    setDeleteTarget(project);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    scheduleDelete(deleteTarget.id);
    toast({
      title: 'Exclusão agendada',
      description: `"${deleteTarget.name}" será excluído em 48 horas. Você pode cancelar até lá.`,
    });
    setDeleteTarget(null);
  }

  function handleCancelDelete(project: ManagedProject) {
    cancelDelete(project.id);
    toast({ title: `Exclusão de "${project.name}" cancelada` });
  }

  function handleMoveUp(project: ManagedProject) {
    const list = executionProjects;
    const idx = list.findIndex((p) => p.id === project.id);
    if (idx <= 0) return;
    const newOrder = [...list];
    [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
    reorderPriorities(newOrder.map((p) => p.id));
  }

  function handleMoveDown(project: ManagedProject) {
    const list = executionProjects;
    const idx = list.findIndex((p) => p.id === project.id);
    if (idx < 0 || idx >= list.length - 1) return;
    const newOrder = [...list];
    [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
    reorderPriorities(newOrder.map((p) => p.id));
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const sectionProps = {
    allProjects,
    onEdit: handleEdit,
    onPause: handlePause,
    onResume: handleResume,
    onScheduleDelete: handleScheduleDelete,
    onCancelDelete: handleCancelDelete,
    onMoveUp: handleMoveUp,
    onMoveDown: handleMoveDown,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FolderKanban className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Meus Projetos</h1>
            <p className="text-xs text-muted-foreground">
              Gerencie seu portfólio com limites de carga cognitiva
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-muted-foreground">
            {allProjects.filter((p) => p.status === 'active').length} ativos
          </Badge>
        </div>
      </div>

      {/* Seções por categoria */}
      <CategorySection
        category="execution"
        projects={executionProjects}
        onAdd={handleAdd}
        {...sectionProps}
      />

      <CategorySection
        category="oversight"
        projects={oversightProjects}
        onAdd={handleAdd}
        {...sectionProps}
      />

      <CategorySection
        category="personal"
        projects={personalProjects}
        onAdd={handleAdd}
        {...sectionProps}
      />

      {/* Pausados */}
      {pausedProjects.length > 0 && (
        <Collapsible open={pausedOpen} onOpenChange={setPausedOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between text-muted-foreground hover:text-foreground">
              <span className="text-sm font-medium">
                ⏸ Pausados ({pausedProjects.length})
              </span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${pausedOpen ? 'rotate-180' : ''}`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-2">
            {pausedProjects.map((project, idx) => (
              <ProjectCard
                key={project.id}
                project={project}
                index={idx}
                total={pausedProjects.length}
                isExecution={false}
                allProjects={allProjects}
                onEdit={handleEdit}
                onPause={handlePause}
                onResume={handleResume}
                onScheduleDelete={handleScheduleDelete}
                onCancelDelete={handleCancelDelete}
                onMoveUp={() => {}}
                onMoveDown={() => {}}
              />
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Formulário */}
      <ProjectFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        project={editingProject}
        allProjects={allProjects}
        onSubmit={handleFormSubmit}
      />

      {/* Confirmação de exclusão */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Agendar exclusão?</AlertDialogTitle>
            <AlertDialogDescription>
              O projeto <strong>{deleteTarget?.name}</strong> será marcado para exclusão. Você tem{' '}
              <strong>48 horas</strong> para cancelar. Após esse prazo, será excluído permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Agendar exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
