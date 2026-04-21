# NeuroDo

Aplicação `Next.js 15` para produtividade, gestão pessoal e operação de projetos com suporte de IA, focada no contexto de um empreendedor neurodivergente.

Este README foi reescrito a partir do código atual do repositório em `2026-04-21`. A fonte de verdade aqui é o código, não a documentação antiga.

## Stack atual

- `Next.js 15.5.9`
- `React 19`
- `TypeScript`
- `Firebase Auth + Firestore`
- `OpenAI` via Server Actions
- `Tailwind CSS + shadcn/ui + Radix`

## O que existe hoje no código

- Dashboard principal com plano do dia, meta principal, widgets de projetos, streak e XP
- CRUD de tarefas, metas, documentos, delegações, equipe, marcos de roadmap e projetos
- Timer de foco com persistência local e histórico em `focus_sessions`
- Timer de tarefa com estado sincronizado no Firestore
- Check-in de energia + dashboard analítico de energia
- Revisão noturna com geração de tarefas para o dia seguinte
- Receitas `PF` e `PJ` por mês
- MentorDo:
  - chat contextual
  - mentor de projetos
  - sugestões de tarefas
  - análise de energia
  - breakdown de milestones
  - questionário comportamental
  - geração de feedback e PDI
- Área admin para configuração do MentorDo e página de validação do Firestore

## Rotas principais

- Públicas:
  - `/login`
  - `/q/[questionnaireId]`
  - `/api/mentor-health`
- Dashboard:
  - `/dashboard`
  - `/dashboard/plan`
  - `/dashboard/projects`
  - `/dashboard/delegations`
  - `/dashboard/team`
  - `/dashboard/mentor`
  - `/dashboard/goals`
  - `/dashboard/focus`
  - `/dashboard/documents`
  - `/dashboard/roadmap`
  - `/dashboard/metrics`
  - `/dashboard/energy`
  - `/dashboard/review`
  - `/dashboard/revenue/pf`
  - `/dashboard/revenue/pj`
  - `/dashboard/settings`
  - `/dashboard/settings/sobre-mim`
  - `/dashboard/reports/energy`
  - `/dashboard/reports/productivity`
  - `/dashboard/reports/gamification`
  - `/dashboard/admin`
  - `/dashboard/admin/mentor-do`
  - `/dashboard/validar`

## Variáveis de ambiente

### Firebase client

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

### OpenAI

```env
OPENAI_API_KEY=
NEURODO_MODEL=gpt-4o-mini
```

### Firebase Admin

Necessárias para os fluxos que usam Admin SDK no servidor, principalmente histórico de feedback e PDI.

```env
FIREBASE_SERVICE_ACCOUNT_KEY=
FIREBASE_PROJECT_ID=
```

## Scripts

```bash
npm install
npm run dev
npm run build
npm run start
npm run typecheck
npm run lint
```

## Estado técnico verificado

- `npm run typecheck`: falha hoje com `51` erros
- `npm run lint`: falha hoje por problema de configuração em `.eslintrc.json`
- `next.config.ts` está configurado para ignorar erros de TypeScript e ESLint no build:
  - `typescript.ignoreBuildErrors = true`
  - `eslint.ignoreDuringBuilds = true`

## Inconsistências atuais relevantes

- Há dois perfis de MentorDo no Firestore:
  - `users/{uid}/mentorDo/profile`
  - `users/{uid}/profile/mentordo`
- O chat do MentorDo usa `users/{uid}/mentorDo/profile`, mas a tela `Sobre Mim` grava em `users/{uid}/profile/mentordo`
- O admin do MentorDo salva `mentorDoConfig/default`, mas os fluxos atuais não leem essa configuração
- Parte da UI ainda depende de dados legados/estáticos em `src/lib/data.ts`
- `IdeaCatcher` classifica a ideia com IA, mas ainda não persiste no Firestore
- Relatórios de energia e gamificação ainda estão parciais/placeholder

## Documentação complementar

- [Status do projeto](docs/project-status.md)
- [Blueprint técnico atual](docs/blueprint.md)
- [Setup real do MentorDo](docs/AI_MENTOR_SETUP.md)
- [Guia de validação](docs/TESTANDO.md)
