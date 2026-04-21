import type { Project, Achievement, Document, RoadmapMilestone, Goal } from './types';

const SAMPLE_USER_ID = 'sample-user';

type DailyGoalSample = Omit<Goal, 'type' | 'unit' | 'status'> & {
  type: 'Diária';
  unit: string;
  status: 'Concluído' | 'Em Progresso' | 'Não Iniciado';
};

export const projects: Project[] = [
  {
    id: 'ENVOX',
    name: 'ENVOX',
    description: 'A base de caixa para todas as nossas operações, garantindo estabilidade.',
    color: '#3B82F6',
    tailwindColor: 'project-envox',
    progress: 75,
    goals: ['Aumentar a receita do 3º trimestre em 15%', 'Lançar nova campanha de marketing', 'Otimizar infraestrutura de nuvem'],
    status: 'active',
  },
  {
    id: 'FARMACIAS',
    name: 'FARMÁCIAS',
    description: 'Impulsionando a inovação e o crescimento no setor farmacêutico.',
    color: '#8B5CF6',
    tailwindColor: 'project-farmacias',
    progress: 40,
    goals: ['Finalizar ensaios da fase 2', 'Garantir financiamento Série B', 'Expandir equipe de pesquisa'],
    status: 'active',
  },
  {
    id: 'GERACAO-PJ',
    name: 'GERAÇÃO PJ',
    description: 'Capacitando a próxima geração de empreendedores com energia.',
    color: '#F97316',
    tailwindColor: 'project-geracao-pj',
    progress: 90,
    goals: ['Integrar 1000 novos usuários', 'Lançar a versão 2.0', 'Realizar cúpula anual'],
    status: 'active',
  },
  {
    id: 'FELIZMENTE',
    name: 'FELIZMENTE',
    description: 'Focando em bem-estar e humanizando a saúde mental.',
    color: '#EC4899',
    tailwindColor: 'project-felizmente',
    progress: 60,
    goals: ['Lançar módulo de mindfulness', 'Fazer parceria com 10 novos terapeutas', 'Melhorar o engajamento do usuário em 20%'],
    status: 'active',
  },
  {
    id: 'INFLUENCERS',
    name: 'INFLUENCERS',
    description: 'Construindo conexões e expandindo nosso alcance através de parcerias estratégicas.',
    color: '#14B8A6',
    tailwindColor: 'project-influencers',
    progress: 25,
    goals: ['Identificar 50 parceiros potenciais', 'Assinar 5 novos contratos com influenciadores', 'Desenvolver diretrizes de conteúdo'],
    status: 'active',
  },
];

export const eveningReviewPrompts = {
  accomplished: "O que eu realizei hoje?",
  stuck: "Onde eu travei?",
  tomorrow: "Quais são as minhas 3 principais prioridades para amanhã?"
};

export const achievements: Achievement[] = [
    { id: '1', title: 'Primeira Tarefa Concluída', description: 'Você deu o primeiro passo!', date: '2023-10-01' },
    { id: '2', title: 'Sequência de 5 Dias', description: 'Consistência é a chave. Continue assim!', date: '2023-10-05' },
    { id: '3', title: 'Marco do Projeto', description: 'Você alcançou um grande objetivo em GERAÇÃO PJ.', date: '2023-10-10' },
    { id: '4', title: 'Máquina de Ideias', description: 'Capturou 10 novas ideias.', date: '2023-10-15' },
];


export const documents: Document[] = [
  {
    id: 'doc1',
    userId: SAMPLE_USER_ID,
    title: 'Playbook de Vendas ENVOX',
    type: 'Playbook',
    content: 'Este documento detalha o processo de vendas de ponta a ponta...',
    projectId: 'ENVOX',
    isPinned: true,
    createdAt: '2023-10-01T10:00:00Z',
    updatedAt: '2023-10-15T14:30:00Z',
  },
  {
    id: 'doc2',
    userId: SAMPLE_USER_ID,
    title: 'Estratégia de Lançamento GERAÇÃO PJ v2.0',
    type: 'Estratégia',
    content: 'Plano estratégico para o lançamento da versão 2.0...',
    projectId: 'GERACAO-PJ',
    isPinned: false,
    createdAt: '2023-09-20T09:00:00Z',
    updatedAt: '2023-10-18T11:00:00Z',
  },
  {
    id: 'doc3',
    userId: SAMPLE_USER_ID,
    title: 'Processo de Onboarding de Influenciadores',
    type: 'Processo',
    content: 'Passo a passo para integrar novos influenciadores...',
    projectId: 'INFLUENCERS',
    isPinned: true,
    createdAt: '2023-10-05T16:00:00Z',
    updatedAt: '2023-10-10T09:20:00Z',
  },
];

export const milestones: RoadmapMilestone[] = [
  {
    id: 'm1',
    userId: SAMPLE_USER_ID,
    title: 'Q4 2024: Lançamento Beta',
    projectId: 'GERACAO-PJ',
    startDate: '2024-10-01',
    endDate: '2024-12-31',
    status: 'Em Progresso',
    progress: 90,
  },
  {
    id: 'm2',
    userId: SAMPLE_USER_ID,
    title: 'Q1 2025: Financiamento Série B',
    projectId: 'FARMACIAS',
    startDate: '2025-01-01',
    endDate: '2025-03-31',
    status: 'Não Iniciado',
    progress: 0,
    dependsOn: 'm3',
  },
  {
    id: 'm3',
    userId: SAMPLE_USER_ID,
    title: 'Q4 2024: Finalizar Ensaios Clínicos',
    projectId: 'FARMACIAS',
    startDate: '2024-10-01',
    endDate: '2024-12-31',
    status: 'Em Progresso',
    progress: 40,
  },
  {
    id: 'm4',
    userId: SAMPLE_USER_ID,
    title: 'Q1 2025: Campanha de Marketing Global',
    projectId: 'ENVOX',
    startDate: '2025-01-15',
    endDate: '2025-03-31',
    status: 'Não Iniciado',
    progress: 0,
  },
];


export const annualGoals: Goal[] = [
  {
    id: 'g-anual-1',
    userId: SAMPLE_USER_ID,
    title: 'Atingir R$30.000/mês de faturamento líquido PF',
    description: 'A grande meta que guia todas as outras, com prazo final em Dezembro de 2026.',
    type: 'yearly',
    targetValue: 30000,
    currentValue: 5000,
    unit: 'currency',
    startDate: '2024-01-01',
    endDate: '2026-12-01',
    status: 'active',
    progress: 17,
  }
];

export const quarterlyGoals: Goal[] = [
  {
    id: 'g-q3-1',
    userId: SAMPLE_USER_ID,
    title: 'Q3 2024: Validar o MVP do Projeto X',
    description: 'Lançar e obter os primeiros 100 usuários pagantes.',
    type: 'quarterly',
    targetValue: 100,
    currentValue: 20,
    unit: 'number',
    startDate: '2024-07-01',
    endDate: '2024-09-30',
    status: 'active',
    progress: 20,
    parentGoalId: 'g-anual-1'
  },
  {
    id: 'g-q3-2',
    userId: SAMPLE_USER_ID,
    title: 'Q3 2024: Dobrar a receita do ENVOX',
    description: 'Foco em aquisição de novos clientes e upsell.',
    type: 'quarterly',
    targetValue: 10000,
    currentValue: 6000,
    unit: 'currency',
    startDate: '2024-07-01',
    endDate: '2024-09-30',
    status: 'active',
    progress: 60,
    parentGoalId: 'g-anual-1'
  },
];

export const monthlyGoals: Goal[] = [
  {
    id: 'g-m7-1',
    userId: SAMPLE_USER_ID,
    title: 'Julho: Finalizar o funil de vendas do Projeto X',
    description: 'Desde a landing page até o checkout funcional.',
    type: 'monthly',
    targetValue: 100,
    currentValue: 80,
    unit: 'percentage',
    startDate: '2024-07-01',
    endDate: '2024-07-31',
    status: 'active',
    progress: 80,
    parentGoalId: 'g-q3-1'
  },
  {
    id: 'g-m7-2',
    userId: SAMPLE_USER_ID,
    title: 'Julho: Aumentar a prospecção do ENVOX em 20%',
    description: 'Aumentar o número de leads qualificados.',
    type: 'monthly',
    targetValue: 120,
    currentValue: 50,
    unit: 'number',
    startDate: '2024-07-01',
    endDate: '2024-07-31',
    status: 'active',
    progress: 42,
    parentGoalId: 'g-q3-2'
  },
];

export const weeklyGoals: Goal[] = [
   {
    id: 'g-w29-1',
    userId: SAMPLE_USER_ID,
    title: 'Semana 29: Testar o checkout',
    description: 'Garantir que os pagamentos sejam processados sem erros.',
    type: 'weekly',
    targetValue: 1,
    currentValue: 0,
    unit: 'number',
    startDate: '2024-07-15',
    endDate: '2024-07-21',
    status: 'active',
    progress: 50,
    parentGoalId: 'g-m7-1'
  },
];

export const dailyGoals: DailyGoalSample[] = [
  {
    id: 'g-d18-1',
    userId: SAMPLE_USER_ID,
    title: 'Revisar a copy da landing page',
    description: '',
    type: 'Diária',
    targetValue: 1,
    currentValue: 1,
    unit: 'revisão',
    startDate: '2024-07-18',
    endDate: '2024-07-18',
    status: 'Concluído',
    progress: 100,
    parentGoalId: 'g-w29-1'
  },
  {
    id: 'g-d18-2',
    userId: SAMPLE_USER_ID,
    title: 'Ligar para 5 novos leads do ENVOX',
    description: '',
    type: 'Diária',
    targetValue: 5,
    currentValue: 2,
    unit: 'ligações',
    startDate: '2024-07-18',
    endDate: '2024-07-18',
    status: 'Em Progresso',
    progress: 40,
    parentGoalId: 'g-m7-2'
  },
  {
    id: 'g-d18-3',
    userId: SAMPLE_USER_ID,
    title: 'Estruturar o doc de estratégia de conteúdo',
    description: '',
    type: 'Diária',
    targetValue: 1,
    currentValue: 0,
    unit: 'documento',
    startDate: '2024-07-18',
    endDate: '2024-07-18',
    status: 'Não Iniciado',
    progress: 0,
    parentGoalId: 'g-w29-1'
  }
];
