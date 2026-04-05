'use client';

import { z } from 'zod';

export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  createdAt: string | { toDate: () => Date };
  updatedAt: string | { toDate: () => Date };
}

export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  tailwindColor: string;
  progress: number;
  goals: string[];
  status: 'active' | 'paused' | 'archived';
  targetRevenue?: number;
  currentRevenue?: number;
  createdAt?: string | { toDate: () => Date };
  updatedAt?: string | { toDate: () => Date };
}

export type TaskTimeOfDay = 'Manhã' | 'Tarde' | 'Noite';
export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskType = 'Operacional' | 'Tático' | 'Estratégico';

export interface Task {
  id: string;
  userId: string;
  content: string;
  projectId?: string;
  completed: boolean;
  completedAt?: string | null;
  isMIT: boolean;
  priority: TaskPriority;
  type: TaskType;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: TaskTimeOfDay;
  specificTime?: string;
  order?: number;
  estimatedMinutes: number;
  actualMinutes?: number;
  linkedGoalId?: string;
  linkedMilestoneId?: string;
  goalIncrementValue?: number;
  linkedDocumentIds?: string[];
  createdAt?: string | { toDate: () => Date };
  updatedAt?: string | { toDate: () => Date };
  delegatedTo?: string;
}

export interface Subtask {
  id: string;
  title: string;
  description?: string;
  estimatedMinutes: number;
  energyRequired: number;
  suggestedWeek?: number;
  status: 'template' | 'scheduled' | 'completed';
  linkedTaskId?: string;
  order: number;
  createdAt?: string | { toDate: () => Date };
  updatedAt?: string | { toDate: () => Date };
}


export interface Idea {
  id:string;
  userId: string;
  content: string;
  bucket: '2027' | string; // project ID or '2027'
}

export interface UserStats {
    id: string; // Should be user.uid
    userId: string;
    level: number;
    totalXP: number;
    nextLevelXP?: number;
    currentStreak: number;
    longestStreak: number;
    tasksCompleted: number;
    focusSessions: number;
    achievementsUnlocked: string[]; // array of achievement IDs
    lastActivityDate?: string | { toDate: () => Date };
    activeDelegations?: number;
    updatedAt?: string | { toDate: () => Date };
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  date: string;
}

export type DocumentType = 'Playbook' | 'Planejamento' | 'Estratégia' | 'Processo' | 'Referência' | 'Checklist';

export interface Document {
  id: string;
  userId: string;
  title: string;
  type: DocumentType;
  content: string;
  projectId?: string;
  isPinned: boolean;
  createdAt: string | { toDate: () => Date };
  updatedAt: string | { toDate: () => Date };
}

export type MilestoneStatus = 'Não Iniciado' | 'Em Progresso' | 'Concluído' | 'Atrasado';

export interface RoadmapMilestone {
  id: string;
  userId: string;
  title: string;
  description?: string;
  projectId: string;
  startDate: string | { toDate: () => Date };
  endDate: string | { toDate: () => Date };
  status: MilestoneStatus;
  progress: number;
  dependsOn?: string;
  linkedGoalId?: string;
}

export type GoalType = 'yearly' | 'quarterly' | 'monthly' | 'weekly';
export type GoalStatus = 'active' | 'completed' | 'paused';

export interface Goal {
  id: string;
  userId: string;
  projectId?: string;
  title: string;
  description: string;
  type: GoalType;
  targetValue: number;
  currentValue: number;
  unit: 'currency' | 'number' | 'percentage';
  startDate: string | { toDate: () => Date };
  endDate: string | { toDate: () => Date };
  status: GoalStatus;
  progress: number;
  parentGoalId?: string;
  targetRevenue?: number;
  currentRevenue?: number;
  createdAt?: string | { toDate: () => Date };
  updatedAt?: string | { toDate: () => Date };
}

export type DelegationTaskStatus = "Pendente" | "Em Progresso" | "Aguardando Resposta" | "Concluída" | "Atrasada";
export type DelegationPriority = "Alta" | "Média" | "Baixa";

export interface Delegation {
    id: string;
    userId: string;
    taskTitle: string;
    taskDescription: string;
    delegatedTo: string; // team member id
    delegatedToContact?: string;
    delegatedAt: string | { toDate: () => Date };
    dueDate: string | { toDate: () => Date };
    followUpDates?: (string | { toDate: () => Date })[];
    lastFollowUp?: string | { toDate: () => Date };
    followUpCount?: number;
    status: DelegationTaskStatus;
    notes?: string;
    projectId?: string;
    goalId?: string;
    priority: DelegationPriority;
    createdAt: string | { toDate: () => Date };
    completedAt?: string | { toDate: () => Date } | null;
}

export type RelationshipType = 'Profissional' | 'Amigo(a)' | 'Cônjuge' | 'Pai/Mãe' | 'Irmão/Irmã' | 'Mentor(a)' | 'Outro';

export interface TeamMember {
  id: string;
  userId: string;
  name: string;
  role: string;
  email?: string;
  relationshipType: RelationshipType;
  birthDate?: string; // YYYY-MM-DD
  avatarUrl?: string;
  profileResults?: string; // Textarea for personality test results
  mainTasks: string; // Key responsibilities, can be AI-generated
  observations?: string; // Important notes for interaction, can be AI-generated
  profileQuestionnaireId?: string;
  pdi?: string; // Personal Development Plan
}

export type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export interface ProfileQuestionnaire {
  id: string;
  userId: string;
  teamMemberId: string;
  status: 'pending' | 'completed';
  responses: Record<string, string>;
  generatedProfile?: string;
  createdAt: string | { toDate: () => Date };
  completedAt?: string | { toDate: () => Date } | null;
}

export const BehavioralProfileOutputSchema = z.object({
  profileSummary: z.string().describe('Um resumo de 2-3 frases do perfil da pessoa. Ex: "Orientado a resultados e direto, mas pode precisar de ajuda com o planejamento detalhado."'),
  howToDelegate: z.string().describe('Conselhos práticos sobre como delegar tarefas para essa pessoa. Ex: "Dê o objetivo final e o prazo, mas deixe-a descobrir o como. Forneça todos os dados necessários de uma vez."'),
  howToGiveFeedback: z.string().describe('Instruções sobre a melhor forma de dar feedback. Ex: "Seja direto e objetivo, focando em dados e fatos, não em sentimentos. Faça isso em particular."'),
  motivators: z.string().describe('O que intrinsecamente motiva esta pessoa. Ex: "Autonomia, desafios complexos e reconhecimento por sua expertise técnica."'),
  recognitionSuggestions: z.string().describe('Sugestões concretas de como reconhecer o trabalho desta pessoa. Ex: "Um bônus por performance, a oportunidade de liderar um pequeno projeto, ou um agradecimento público focado no resultado que ela gerou."'),
});
export type BehavioralProfileOutput = z.infer<typeof BehavioralProfileOutputSchema>;

export const GenerateFeedbackSessionInputSchema = z.object({
  collaboratorName: z.string(),
  behavioralProfile: z.string(),
  positivePoint: z.string(),
  improvementPoint: z.string(),
  relatedGoal: z.string(),
});
export type GenerateFeedbackSessionInput = z.infer<typeof GenerateFeedbackSessionInputSchema>;

export const GenerateFeedbackSessionOutputSchema = z.object({
  opening: z.string().describe('Frase de abertura para criar um ambiente seguro e definir o tom da conversa.'),
  praisePoints: z.string().describe('O roteiro para o elogio, usando a técnica SBI.'),
  developmentPoints: z.string().describe('O roteiro para o ponto de melhoria, usando SBI e focando no futuro.'),
  nextSteps: z.string().describe('Sugestão de como definir os próximos passos de forma colaborativa.'),
  closing: z.string().describe('Frase de encerramento para reforçar o apoio e terminar com uma nota positiva.'),
});
export type GenerateFeedbackSessionOutput = z.infer<typeof GenerateFeedbackSessionOutputSchema>;

export interface FeedbackSession {
    id: string;
    userId: string;
    memberId: string;
    generatedAt: string | { toDate: () => Date };
    script: GenerateFeedbackSessionOutput;
}

export interface PDIHistory {
    id: string;
    userId: string;
    memberId: string;
    generatedAt: string | { toDate: () => Date };
    pdiContent: string;
}

export interface MentorDoPreferences {
  responseStyle?: string;
  preferredTone?: string;
  useShortAnswers?: boolean;
  attentionFocus?: string;
}

export interface AddictionInfo {
  name: string;
  frequency?: string;
  currentIntensity?: number;
  willingToChange?: boolean;
  notes?: string;
}

export interface MentorDoProfile {
  id?: string;
  userId: string;
  neurodivergence?: string[];
  medication?: string;
  diagnoses?: string;
  limitingBeliefs?: string;
  challenges?: string;
  preferences?: MentorDoPreferences;
  addictions?: AddictionInfo[];
  lastUpdated?: string | { toDate: () => Date };
}

export interface MentorDoAdminConfig {
  id?: string;
  defaultPrompt?: string;
  defaultModel?: string;
  welcomeMessage?: string;
  helpContacts?: string;
  updatedAt?: string | { toDate: () => Date };
}

export interface AISuggestedTask {
  content: string;
  priority: 'high' | 'medium' | 'low';
  scheduledTime: 'Manhã' | 'Tarde' | 'Noite';
  estimatedMinutes: number;
  reasoning: string;
}

// ── Preferences (persistido em /users/{uid}/preferences/data) ──────────────
export interface Preference {
  userId: string;
  energyLevel: number | null;
  theme: 'default' | 'hyperfocus' | 'creative' | 'night';
  notificationsEnabled: boolean;
  focusTimerDefault: 'sprint' | 'pomodoro' | 'deep';
  updatedAt: string;
}

export interface RevenueEntry {
  projectId: string;
  projectName: string;
  amount: number;
}

export interface MonthlyRevenue {
  id: string; // formato YYYY-MM
  userId: string;
  month: string; // formato YYYY-MM
  entries: RevenueEntry[];
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface NightlyReview {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  energyLevel: number;
  tasksCompleted: number;
  tasksTotal: number;
  tasksSummary: { id: string; content: string; completed: boolean }[];
  aiAnalysis: string;
  aiEnergyPattern: string;
  aiSuggestedTasks: AISuggestedTask[];
  aiMotivationalNote: string;
  createdAt: string; // ISO string
}
