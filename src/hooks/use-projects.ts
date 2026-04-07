'use client';

import { useMemo } from 'react';
import {
  useCollection,
  useFirestore,
  useUser,
  useMemoFirebase,
} from '@/firebase';
import {
  collection,
  query,
  orderBy,
  doc,
} from 'firebase/firestore';
import {
  addDocumentNonBlocking,
  setDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/firebase/non-blocking-updates';
import type {
  ManagedProject,
  ManagedProjectStatus,
  ProjectCategory,
  ChangelogEntry,
} from '@/lib/types';

function newChangelogEntry(
  action: ChangelogEntry['action'],
  description: string,
  previousValue?: string,
  newValue?: string
): ChangelogEntry {
  return {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    action,
    description,
    ...(previousValue !== undefined ? { previousValue } : {}),
    ...(newValue !== undefined ? { newValue } : {}),
  };
}

export function useProjects() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const projectsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'users', user.uid, 'projects'),
      orderBy('createdAt', 'desc')
    );
  }, [user, firestore]);

  const { data: projects, isLoading: areProjectsLoading, error } =
    useCollection<ManagedProject>(projectsQuery);

  const isLoading = isUserLoading || areProjectsLoading;

  // Projetos raiz (sem parent)
  const rootProjects = useMemo(
    () => (projects ?? []).filter((p) => !p.parentId),
    [projects]
  );

  // Por categoria
  const executionProjects = useMemo(
    () =>
      (projects ?? [])
        .filter((p) => p.category === 'execution' && p.status === 'active')
        .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99)),
    [projects]
  );

  const oversightProjects = useMemo(
    () =>
      (projects ?? []).filter(
        (p) => p.category === 'oversight' && p.status === 'active'
      ),
    [projects]
  );

  const personalProjects = useMemo(
    () =>
      (projects ?? []).filter(
        (p) => p.category === 'personal' && p.status === 'active'
      ),
    [projects]
  );

  const pausedProjects = useMemo(
    () => (projects ?? []).filter((p) => p.status === 'paused'),
    [projects]
  );

  const activeExecutionCount = executionProjects.length;

  function getSubProjects(parentId: string) {
    return (projects ?? []).filter((p) => p.parentId === parentId);
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  function createProject(
    data: Omit<ManagedProject, 'id' | 'userId' | 'changelog' | 'createdAt' | 'updatedAt' | 'deletionScheduledAt'>
  ) {
    if (!user || !firestore) return;
    const now = new Date().toISOString();
    const colRef = collection(firestore, 'users', user.uid, 'projects');
    const newProject: Omit<ManagedProject, 'id'> = {
      ...data,
      userId: user.uid,
      changelog: [
        newChangelogEntry('created', `Projeto "${data.name}" criado`),
      ],
      deletionScheduledAt: null,
      createdAt: now,
      updatedAt: now,
    };
    addDocumentNonBlocking(colRef, newProject);
  }

  function updateProject(
    projectId: string,
    updates: Partial<Omit<ManagedProject, 'id' | 'userId' | 'changelog' | 'createdAt'>>,
    changelogDescription?: string
  ) {
    if (!user || !firestore) return;
    const project = (projects ?? []).find((p) => p.id === projectId);
    if (!project) return;

    const entry = newChangelogEntry(
      'updated',
      changelogDescription ?? `Projeto atualizado`
    );

    const docRef = doc(firestore, 'users', user.uid, 'projects', projectId);
    updateDocumentNonBlocking(docRef, {
      ...updates,
      changelog: [...(project.changelog ?? []), entry],
      updatedAt: new Date().toISOString(),
    });
  }

  function changeStatus(
    projectId: string,
    newStatus: ManagedProjectStatus,
    reason?: string
  ) {
    if (!user || !firestore) return;
    const project = (projects ?? []).find((p) => p.id === projectId);
    if (!project) return;

    const statusLabels: Record<ManagedProjectStatus, string> = {
      active: 'Ativo',
      paused: 'Pausado',
      completed: 'Concluído',
      pending_deletion: 'Aguardando Exclusão',
    };

    const entry = newChangelogEntry(
      'status_changed',
      reason ?? `Status alterado para "${statusLabels[newStatus]}"`,
      statusLabels[project.status],
      statusLabels[newStatus]
    );

    const docRef = doc(firestore, 'users', user.uid, 'projects', projectId);
    updateDocumentNonBlocking(docRef, {
      status: newStatus,
      changelog: [...(project.changelog ?? []), entry],
      updatedAt: new Date().toISOString(),
    });
  }

  function changeCategory(
    projectId: string,
    newCategory: ProjectCategory,
    reason: string
  ) {
    if (!user || !firestore) return;
    const project = (projects ?? []).find((p) => p.id === projectId);
    if (!project) return;

    const categoryLabels: Record<ProjectCategory, string> = {
      execution: 'Execução',
      oversight: 'Acompanhamento',
      personal: 'Pessoal',
    };

    const entry = newChangelogEntry(
      'category_changed',
      reason,
      categoryLabels[project.category],
      categoryLabels[newCategory]
    );

    const docRef = doc(firestore, 'users', user.uid, 'projects', projectId);
    updateDocumentNonBlocking(docRef, {
      category: newCategory,
      changelog: [...(project.changelog ?? []), entry],
      updatedAt: new Date().toISOString(),
    });
  }

  function reorderPriorities(orderedIds: string[]) {
    if (!user || !firestore) return;
    const now = new Date().toISOString();
    orderedIds.forEach((id, index) => {
      const project = (projects ?? []).find((p) => p.id === id);
      if (!project) return;
      const entry = newChangelogEntry(
        'priority_changed',
        `Prioridade ajustada para ${index + 1}`,
        String(project.priority ?? '—'),
        String(index + 1)
      );
      const docRef = doc(firestore, 'users', user.uid, 'projects', id);
      updateDocumentNonBlocking(docRef, {
        priority: index + 1,
        changelog: [...(project.changelog ?? []), entry],
        updatedAt: now,
      });
    });
  }

  function scheduleDelete(projectId: string) {
    if (!user || !firestore) return;
    const project = (projects ?? []).find((p) => p.id === projectId);
    if (!project) return;

    const deletionAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const entry = newChangelogEntry(
      'deletion_scheduled',
      `Exclusão agendada para ${new Date(deletionAt).toLocaleString('pt-BR')}`
    );

    const docRef = doc(firestore, 'users', user.uid, 'projects', projectId);
    updateDocumentNonBlocking(docRef, {
      status: 'pending_deletion' as ManagedProjectStatus,
      deletionScheduledAt: deletionAt,
      changelog: [...(project.changelog ?? []), entry],
      updatedAt: new Date().toISOString(),
    });
  }

  function cancelDelete(projectId: string) {
    if (!user || !firestore) return;
    const project = (projects ?? []).find((p) => p.id === projectId);
    if (!project) return;

    const entry = newChangelogEntry(
      'deletion_cancelled',
      'Exclusão cancelada — projeto restaurado'
    );

    const docRef = doc(firestore, 'users', user.uid, 'projects', projectId);
    updateDocumentNonBlocking(docRef, {
      status: 'active' as ManagedProjectStatus,
      deletionScheduledAt: null,
      changelog: [...(project.changelog ?? []), entry],
      updatedAt: new Date().toISOString(),
    });
  }

  function deleteProjectNow(projectId: string) {
    if (!user || !firestore) return;
    const docRef = doc(firestore, 'users', user.uid, 'projects', projectId);
    deleteDocumentNonBlocking(docRef);
  }

  return {
    projects,
    rootProjects,
    executionProjects,
    oversightProjects,
    personalProjects,
    pausedProjects,
    activeExecutionCount,
    isLoading,
    error,
    getSubProjects,
    createProject,
    updateProject,
    changeStatus,
    changeCategory,
    reorderPriorities,
    scheduleDelete,
    cancelDelete,
    deleteProjectNow,
  };
}
