# Status Atual do Projeto: NeuroDo

Atualizado em `2026-04-21`, com base no código atual do repositório.

## Fonte de verdade

Este documento foi montado a partir de:

- inspeção do código em `src/`
- rotas reais do `App Router`
- hooks e coleções do Firestore
- fluxos de IA ativos
- checagens locais com `npm run typecheck` e `npm run lint`

## Resumo executivo

O projeto já funciona como um dashboard operacional relativamente amplo para:

- organizar execução diária
- acompanhar metas e projetos
- gerir equipe, delegações e documentos
- usar IA como suporte de foco, revisão e gestão

Ao mesmo tempo, o código está em fase híbrida:

- parte do app está bem conectada ao Firestore
- parte ainda usa modelos legados/estáticos
- existem inconsistências entre caminhos de dados, tipos e integrações

## Stack confirmada no código

- `Next.js 15.5.9`
- `React 19.2.1`
- `TypeScript`
- `Firebase Auth`
- `Firestore`
- `OpenAI` via Server Actions
- `Tailwind CSS`
- `shadcn/ui`, `Radix UI`, `Recharts`, `react-hook-form`, `zod`

Observação:

- `genkit` e `@genkit-ai/google-genai` estão instalados, mas a camada ativa de IA no app atual usa `OpenAI` diretamente

## Mapa funcional real

### Acesso e shell

- `/` redireciona para `/dashboard`
- `/login` já implementa:
  - login por e-mail/senha
  - cadastro por e-mail/senha
  - login com Google
- o dashboard exige autenticação no `layout.tsx`

### Dashboard principal

Em `/dashboard`, o código renderiza:

- meta principal de receita
- streak
- XP
- plano do dia
- sugestões do MentorDo
- visão geral de projetos
- estabilidade dos projetos
- slots de execução
- papel do dono
- receita estimada por projetos
- botão de seed de dados

### Tarefas e execução

Em `/dashboard/plan`:

- CRUD de tarefas
- agrupamento por `Manhã`, `Tarde`, `Noite`
- MIT
- vínculo com projeto/meta/milestone
- incremento automático de meta ao concluir tarefa
- reordenação
- exclusão
- registro de tempo por tarefa

Coleções usadas:

- `users/{uid}/tasks`
- `users/{uid}/timesheets`
- `users/{uid}/active_task_timer/current`
- `users/{uid}/user_stats/data`

### Metas

Em `/dashboard/goals`:

- CRUD de metas
- tipos: `yearly`, `quarterly`, `monthly`, `weekly`
- hierarquia por `parentGoalId`
- vínculo opcional com projeto
- widget de milestones vinculadas
- avanço rápido por dialog no dashboard

Coleção:

- `users/{uid}/goals`

### Projetos

Em `/dashboard/projects`:

- CRUD de projetos gerenciados
- categorias:
  - `execution`
  - `oversight`
  - `personal`
- controle de prioridade
- owner role
- estimativa de receita
- changelog por projeto
- exclusão agendada e cancelamento
- mentor de projetos com IA

Coleção:

- `users/{uid}/projects`

### Roadmap

Em `/dashboard/roadmap` e `/dashboard/roadmap/[milestoneId]`:

- CRUD de milestones
- progresso
- vínculo opcional com meta
- subtarefas por milestone
- geração de checklist com IA
- criação de task a partir de subtask
- tela de detalhe do milestone

Coleções:

- `users/{uid}/milestones`
- `users/{uid}/milestones/{milestoneId}/subtasks`

### Delegações

Em `/dashboard/delegations`:

- CRUD de delegações
- associação com membro da equipe
- status e prioridade
- vínculo com projeto/meta
- leitura visual de urgência por data

Coleção:

- `users/{uid}/delegations`

Observação:

- a automação citada na doc antiga de criar tarefas automáticas de follow-up não aparece no código atual

### Equipe

Em `/dashboard/team` e `/dashboard/team/[memberId]`:

- CRUD de membros da equipe
- perfil individual
- questionário público com IA
- geração de perfil comportamental
- geração de feedback com IA
- geração de PDI com IA

Coleções lidas pela UI:

- `users/{uid}/team`
- `users/{uid}/feedback_sessions`
- `users/{uid}/pdi_history`
- `profile_questionnaires`

Observação importante:

- os fluxos `generate-feedback-session` e `generate-pdi` salvam histórico em coleções top-level:
  - `feedback_sessions`
  - `pdi_history`
- a UI lê em subcoleções do usuário:
  - `users/{uid}/feedback_sessions`
  - `users/{uid}/pdi_history`
- portanto há divergência real entre escrita e leitura do histórico

### Documentos

Em `/dashboard/documents`:

- CRUD de documentos
- tipos:
  - `Playbook`
  - `Planejamento`
  - `Estratégia`
  - `Processo`
  - `Referência`
  - `Checklist`
- filtro por projeto
- filtro por tipo
- pin de documento

Coleção:

- `users/{uid}/documents`

### Receita PF e PJ

Em `/dashboard/revenue/pf`:

- registro mensal de distribuição PF por projeto

Em `/dashboard/revenue/pj`:

- registro mensal de faturamento bruto, despesas e líquido por projeto

Coleções:

- `users/{uid}/revenue`
- `users/{uid}/revenue_pj`

### Energia e revisão

Em `/dashboard/energy`:

- dashboard analítico baseado em revisões e check-ins
- gráfico de padrão por dia
- análise com IA
- integração com medicações do perfil `Sobre Mim`

Em `/dashboard/review`:

- revisão noturna
- geração de análise + tarefas para amanhã com IA
- gravação do review
- criação automática de tasks para o dia seguinte

Coleções:

- `users/{uid}/energy_checkins`
- `users/{uid}/reviews`

### Foco

Em `/dashboard/focus`:

- timer de foco adaptado ao nível de energia
- persistência local
- gravação de histórico
- analytics de foco

Coleção:

- `users/{uid}/focus_sessions`

### Métricas

Em `/dashboard/metrics`:

- KPIs de XP, nível, streak, tarefas e foco
- gráfico de tarefas concluídas
- progresso de metas
- conquistas renderizadas a partir de IDs em `user_stats`

Coleções:

- `users/{uid}/user_stats/data`
- `users/{uid}/tasks`
- `users/{uid}/goals`

### Configurações e perfil

Em `/dashboard/settings`:

- notificações
- timer padrão
- tema visual
- resumo de perfil/nível

Coleção:

- `users/{uid}/preferences/data`

Em `/dashboard/settings/sobre-mim`:

- perfil pessoal para o MentorDo
- cadastro de medicações
- work style, life goals e contexto pessoal

Coleção:

- `users/{uid}/profile/mentordo`

### MentorDo

Em `/dashboard/mentor`:

- formulário legado de perfil do MentorDo

Coleção:

- `users/{uid}/mentorDo/profile`

No shell do dashboard:

- chat flutuante do MentorDo
- botão SOS do mentor de projetos
- mentor de projetos na página `/dashboard/projects`

### Admin e validação

Em `/dashboard/admin`:

- shell administrativo simples
- link para config do MentorDo

Em `/dashboard/admin/mentor-do`:

- salva prompt base, modelo e mensagens em:
  - `mentorDoConfig/default`

Em `/dashboard/validar`:

- diagnóstico de Firestore em tempo real
- teste de escrita/leitura/remoção

## Fluxos de IA realmente usados

### Em produção no app

- `chat-with-mentor.ts`
  - chat do MentorDo
- `mentor-projects.ts`
  - mentor de projetos e SOS
- `provide-context-aware-assistance.ts`
  - sugestões de tarefa no dashboard
- `generate-nightly-review.ts`
  - revisão noturna
- `analyze-energy-patterns.ts`
  - análise do dashboard de energia
- `breakdown-milestone.ts`
  - checklist de milestones
- `conduct-profile-interview.ts`
  - questionário público de equipe
- `generate-behavioral-profile.ts`
  - perfil comportamental
- `generate-feedback-session.ts`
  - roteiro de feedback
- `generate-pdi.ts`
  - PDI
- `generate-text-flow.ts`
  - assistências menores na equipe

### Endpoint auxiliar

- `GET /api/mentor-health`
  - valida `OPENAI_API_KEY`
  - expõe status e modelo configurado

## Mapa real do Firestore

### Documento principal do usuário

- `users/{uid}`

### Subcoleções/documentos usados

- `users/{uid}/tasks`
- `users/{uid}/goals`
- `users/{uid}/projects`
- `users/{uid}/delegations`
- `users/{uid}/team`
- `users/{uid}/documents`
- `users/{uid}/milestones`
- `users/{uid}/milestones/{milestoneId}/subtasks`
- `users/{uid}/reviews`
- `users/{uid}/energy_checkins`
- `users/{uid}/focus_sessions`
- `users/{uid}/timesheets`
- `users/{uid}/revenue`
- `users/{uid}/revenue_pj`
- `users/{uid}/preferences/data`
- `users/{uid}/user_stats/data`
- `users/{uid}/active_task_timer/current`
- `users/{uid}/mentorDo/profile`
- `users/{uid}/profile/mentordo`
- `users/{uid}/feedback_sessions`
- `users/{uid}/pdi_history`

### Coleções/documentos top-level

- `profile_questionnaires`
- `mentorDoConfig/default`
- `feedback_sessions`
- `pdi_history`

## Inconsistências e gaps verificados

### 1. Perfil do MentorDo duplicado

Existem dois caminhos concorrentes:

- `users/{uid}/mentorDo/profile`
- `users/{uid}/profile/mentordo`

Impacto:

- o chat lê um perfil
- a tela `Sobre Mim` grava em outro
- o app hoje não tem uma única fonte de verdade para contexto do MentorDo

### 2. Histórico de feedback/PDI desalinhado

- escrita pelo servidor: coleções top-level
- leitura pela UI: subcoleções do usuário

Impacto:

- histórico pode ser salvo, mas não aparecer onde a interface espera

### 3. Configuração admin do MentorDo não está conectada aos fluxos

- `/dashboard/admin/mentor-do` grava `mentorDoConfig/default`
- os flows atuais usam prompts hardcoded

Impacto:

- a tela admin hoje não controla o comportamento real do MentorDo

### 4. Projeto usa dois modelos de projeto

Modelos coexistindo:

- modelo legado `Project`
- modelo atual `ManagedProject`

Arquivos que ainda dependem de legado/estático:

- `project-overview.tsx`
- `revenue-goal-widget.tsx`
- `task-suggestions.tsx`
- `idea-catcher.tsx`

Impacto:

- parte da experiência usa dados reais
- parte ainda depende de `src/lib/data.ts`

### 5. `IdeaCatcher` não persiste

Hoje ele:

- chama IA
- mostra toast
- faz `console.log`

Mas não grava a ideia em nenhuma coleção

### 6. Relatórios ainda incompletos

- `/dashboard/reports/productivity` tem leitura real de `timesheets`
- `/dashboard/reports/energy` está placeholder
- `/dashboard/reports/gamification` está placeholder

### 7. Link de gamificação quebrado na sidebar

O menu aponta para:

- `/dashboard/gamification`

Mas a rota existente é:

- `/dashboard/reports/gamification`

### 8. `use-file-upload` está quebrado no estado atual

- importa `useStorage` de `@/firebase`
- esse export não existe

### 9. Build configurado para ignorar erros

Em `next.config.ts`:

- `typescript.ignoreBuildErrors = true`
- `eslint.ignoreDuringBuilds = true`

Impacto:

- o app pode buildar mesmo com erros reais de tipagem/lint

## Resultado das checagens locais

### TypeScript

Comando executado:

```bash
npm run typecheck
```

Resultado:

- falha com `51` erros

Principais grupos:

- `39` erros em `src/lib/data.ts`
- incompatibilidades de tipo em:
  - `delegation-form.tsx`
  - `goal-form.tsx`
  - `goals-view.tsx`
  - `energy-dashboard.tsx`
  - `floating-task-timer.tsx`
  - `team/[memberId]/page.tsx`
  - `pj-revenue-tracker.tsx`
  - `ui/calendar.tsx`
  - `use-file-upload.ts`

### Lint

Comando executado:

```bash
npm run lint
```

Resultado:

- falha antes de lintar o código por erro de configuração:
  - `Converting circular structure to JSON`
  - referência a `.eslintrc.json`

Observação adicional:

- `next lint` já aparece como deprecated no Next atual

## Leitura honesta do estado do projeto

O projeto já tem bastante superfície funcional e várias áreas usáveis de verdade. O núcleo de produtividade, gestão e IA existe.

O que falta hoje não é “ideia de produto”. O que falta é consolidar a base técnica:

- unificar fontes de dados legadas e atuais
- corrigir tipagem
- alinhar caminhos de leitura/escrita no Firestore
- ligar configurações admin ao comportamento real da IA
- eliminar placeholders e links quebrados

Se a meta for estabilizar o projeto, o próximo passo mais produtivo é tratar primeiro:

1. tipagem e lint
2. modelo único de projeto
3. fonte única do perfil do MentorDo
4. correção das coleções de histórico de feedback/PDI
