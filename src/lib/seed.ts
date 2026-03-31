'use client';
import {
  collection,
  doc,
  writeBatch,
  getDocs,
  query,
  Firestore,
} from 'firebase/firestore';
import type { Task, Goal, Document, UserStats, TeamMember, Project, RoadmapMilestone } from '@/lib/types';

export const seedDatabase = async (firestore: Firestore, userId: string): Promise<boolean> => {
  // 1. Check if data already exists by looking for projects.
  const projectsCheckRef = collection(firestore, `users/${userId}/projects`);
  const projectsSnapshot = await getDocs(query(projectsCheckRef));
  if (!projectsSnapshot.empty) {
    console.log('Dados já existem. O processo de popular o banco de dados foi ignorado.');
    return false; // Indicate that seeding was skipped
  }
  
  // If we reach here, it means the database is empty for this user.
  console.log('Banco de dados vazio. Iniciando o processo de popular o banco de dados...');
  const creationBatch = writeBatch(firestore);
  const now = new Date();

  // 2. User Stats
  const userStatsRef = doc(firestore, 'users', userId, 'user_stats', 'data');
  const userStatsData: Omit<UserStats, 'id'> = {
    userId: userId,
    level: 1,
    totalXP: 0,
    currentStreak: 5,
    longestStreak: 5,
    tasksCompleted: 0,
    focusSessions: 0,
    achievementsUnlocked: [],
    lastActivityDate: now.toISOString(),
    activeDelegations: 0,
    updatedAt: now.toISOString(),
  };
  creationBatch.set(userStatsRef, userStatsData);
  
  // 3. Projects
  console.log('🚀 Criando projects...');
  const projectsToCreate: Partial<Project>[] = [
      { id: 'ENVOX', name: 'Envox', description: 'Agência de marketing (11 anos, base estável)', color: '#3B82F6', tailwindColor: 'project-envox', status: 'active', targetRevenue: 12000 },
      { id: 'FARMACIAS', name: 'Farmácias de Manipulação', description: 'Marketplace B2B2C (veículo de crescimento)', color: '#8B5CF6', tailwindColor: 'project-farmacias', status: 'active', targetRevenue: 15000 },
      { id: 'GERACAO_PJ', name: 'Geração PJ', description: 'Podcast empreendedorismo (autoridade)', color: '#F97316', tailwindColor: 'project-geracao-pj', status: 'active' },
      { id: 'FELIZMENTE', name: 'Felizmente', description: 'Neurodiversidade e bem-estar (pausado até Jun/26)', color: '#EC4899', tailwindColor: 'project-felizmente', status: 'paused' },
      { id: 'INFLUENCERS', name: 'Influencers', description: 'Gestão atletas/creators', color: '#14B8A6', tailwindColor: 'project-influencers', status: 'active', targetRevenue: 3000 },
  ];
  for (const project of projectsToCreate) {
      const projectRef = doc(firestore, 'users', userId, 'projects', project.id!);
      creationBatch.set(projectRef, { ...project, userId, createdAt: now.toISOString(), updatedAt: now.toISOString(), progress: 0, goals: [], currentRevenue: 0 });
  }
  console.log(`✅ Projects criados: ${projectsToCreate.length}`);

  // 4. Goals
  console.log('📊 Criando goals...');
  const goalsMap = new Map<string, string>();
  const goalsToCreate = [
      { key: 'MAIN', title: 'Meta 2026: R$30.000/mês líquido PF', description: 'Receita mensal líquida pessoa física até dezembro de 2026', type: 'yearly', targetValue: 30000, unit: 'currency', endDate: new Date('2026-12-01') },
      { key: 'FARMACIAS', title: 'Farmácias: R$15k/mês', description: '50+ farmácias pagantes até dezembro', projectId: 'FARMACIAS', targetValue: 15000, unit: 'currency', type: 'yearly', endDate: new Date('2026-12-01') },
      { key: 'ENVOX', title: 'Envox: R$12k/mês', description: '25 clientes com <5% churn', projectId: 'ENVOX', targetValue: 12000, unit: 'currency', type: 'yearly', endDate: new Date('2026-12-01') },
      { key: 'INFLUENCERS', title: 'Influencers: R$3k/mês', description: '3-5 atletas gerenciados', projectId: 'INFLUENCERS', targetValue: 3000, unit: 'currency', type: 'yearly', endDate: new Date('2026-12-01') },
      { key: 'JULY', title: 'Meta Julho 2026: R$20k/mês', description: 'Meta intermediária antes da final', type: 'monthly', targetValue: 20000, unit: 'currency', endDate: new Date('2026-07-01') },
  ];
  
  for (const goal of goalsToCreate) {
      const newGoalRef = doc(collection(firestore, 'users', userId, 'goals'));
      const goalData: Partial<Goal> = {
          userId,
          title: goal.title,
          description: goal.description,
          type: goal.type as Goal['type'],
          targetValue: goal.targetValue,
          currentValue: 0,
          unit: goal.unit as Goal['unit'],
          endDate: goal.endDate.toISOString(),
          projectId: goal.projectId || '',
          status: 'active',
          progress: 0,
          startDate: now.toISOString(),
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
      };
      if (goal.unit === 'currency') {
        goalData.targetRevenue = goal.targetValue;
        goalData.currentRevenue = 0;
      }
      creationBatch.set(newGoalRef, goalData);
      goalsMap.set(goal.key, newGoalRef.id);
  }
  console.log(`✅ Goals criados: ${goalsMap.size}`);

  // 5. Milestones
  console.log('🗺️ Criando milestones...');
  const milestonesToCreate = [
      { title: 'Farmácias v1.0 Launch', projectId: 'FARMACIAS', linkedGoalId: goalsMap.get('FARMACIAS'), endDate: new Date('2026-02-15'), status: 'Em Progresso' },
      { title: '10 farmácias pagantes', projectId: 'FARMACIAS', linkedGoalId: goalsMap.get('FARMACIAS'), endDate: new Date('2026-03-31'), status: 'Não Iniciado' },
      { title: '20 farmácias pagantes', projectId: 'FARMACIAS', linkedGoalId: goalsMap.get('FARMACIAS'), endDate: new Date('2026-06-30'), status: 'Não Iniciado' },
      { title: '50 farmácias pagantes', projectId: 'FARMACIAS', linkedGoalId: goalsMap.get('FARMACIAS'), endDate: new Date('2026-12-01'), status: 'Não Iniciado' },
      { title: 'Déficit zero Envox', projectId: 'ENVOX', linkedGoalId: goalsMap.get('ENVOX'), endDate: new Date('2026-01-31'), status: 'Em Progresso' },
      { title: 'Bia vendendo 70% sozinha', projectId: 'ENVOX', linkedGoalId: goalsMap.get('ENVOX'), endDate: new Date('2026-03-31'), status: 'Não Iniciado' },
      { title: '25 clientes Envox', projectId: 'ENVOX', linkedGoalId: goalsMap.get('ENVOX'), endDate: new Date('2026-12-01'), status: 'Não Iniciado' },
      { title: '50 episódios Geração PJ', projectId: 'GERACAO_PJ', endDate: new Date('2026-12-31'), status: 'Em Progresso' },
      { title: '10k downloads/mês', projectId: 'GERACAO_PJ', endDate: new Date('2026-12-31'), status: 'Não Iniciado' },
      { title: '3-5 atletas gerenciados', projectId: 'INFLUENCERS', linkedGoalId: goalsMap.get('INFLUENCERS'), endDate: new Date('2026-06-30'), status: 'Não Iniciado' },
      { title: '1 case de destaque', projectId: 'INFLUENCERS', linkedGoalId: goalsMap.get('INFLUENCERS'), endDate: new Date('2026-12-31'), status: 'Não Iniciado' },
      { title: 'Retomar Felizmente', projectId: 'FELIZMENTE', endDate: new Date('2026-06-01'), status: 'Não Iniciado' },
      { title: '100k seguidores Felizmente', projectId: 'FELIZMENTE', endDate: new Date('2026-12-31'), status: 'Não Iniciado' },
  ];
  for (const milestone of milestonesToCreate) {
      const newMilestoneRef = doc(collection(firestore, 'users', userId, 'milestones'));
      const milestoneData: Partial<RoadmapMilestone> = {
          ...milestone,
          userId,
          startDate: now.toISOString(),
          endDate: milestone.endDate.toISOString(),
          status: milestone.status as RoadmapMilestone['status'],
          progress: milestone.status === 'Em Progresso' ? Math.floor(Math.random() * 50) + 10 : 0,
      };
      creationBatch.set(newMilestoneRef, milestoneData);
  }
  console.log(`✅ Milestones criados: ${milestonesToCreate.length}`);

  // 6. Tasks
  const taskGoalId = goalsMap.get('MAIN');
  const sampleTasks = [
      { title: 'Resolver bug split Asaas no Farmácias', projectId: 'FARMACIAS', linkedGoalId: goalsMap.get('FARMACIAS'), priority: 'high', scheduledTime: 'Manhã', estimatedMinutes: 90, isMIT: true, type: 'Operacional', goalIncrementValue: 500 },
      { title: 'Ligar para 3 leads antigos Envox', projectId: 'ENVOX', linkedGoalId: goalsMap.get('ENVOX'), priority: 'high', scheduledTime: 'Manhã', estimatedMinutes: 50, isMIT: true, type: 'Tático', goalIncrementValue: 1000 },
      { title: 'Gravar episódio Geração PJ', projectId: 'GERACAO_PJ', priority: 'medium', scheduledTime: 'Tarde', estimatedMinutes: 120, isMIT: false, type: 'Tático' },
      { title: 'Review semanal NeuroDO', priority: 'medium', scheduledTime: 'Noite', estimatedMinutes: 25, isMIT: false, type: 'Operacional' },
  ];
  for (const task of sampleTasks) {
      const newTaskRef = doc(collection(firestore, 'users', userId, 'tasks'));
      creationBatch.set(newTaskRef, {
          ...task,
          userId,
          completed: false,
          scheduledDate: now.toISOString().split('T')[0],
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          order: Date.now() + Math.random(),
      });
  }
  
  // Commit all creations
  try {
      await creationBatch.commit();
      console.log('✅ Seed completo. Novos dados populados com sucesso!');
      console.log(`Resumo: Projects: ${projectsToCreate.length}, Goals: ${goalsMap.size}, Milestones: ${milestonesToCreate.length}`);
      return true;
  } catch (error) {
      console.error('❌ Erro ao popular novos dados:', error);
      return false;
  }
};
