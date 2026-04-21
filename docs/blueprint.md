# Blueprint Técnico Atual

Leitura arquitetural do projeto com base no código atual.

## 1. Estrutura de aplicação

### App Router

O app usa `src/app/` com:

- layout raiz em `src/app/layout.tsx`
- dashboard protegido em `src/app/dashboard/layout.tsx`
- páginas modulares por domínio
- rota pública de questionário
- rota de health check da OpenAI

### Providers

Na raiz:

- `FirebaseClientProvider`
- `AppProvider`
- `Toaster`

No dashboard:

- `DashboardDataProvider`
- `SidebarProvider`

## 2. Camada de estado

### FirebaseProvider

Responsável por:

- inicializar Auth e Firestore
- ouvir `onAuthStateChanged`
- hidratar `appUser` via `users/{uid}`
- expor `useUser`, `useFirestore`, `useAuth`

### AppProvider

Responsável por:

- `energyLevel`
- timer de foco
- persistência local do timer
- criação de `focus_sessions`

### DashboardDataProvider

Centraliza listeners compartilhados para:

- `tasks`
- `goals`
- `user_stats`

Objetivo:

- evitar listeners duplicados no dashboard

## 3. Acesso a dados

### Hooks em tempo real

O projeto usa wrappers próprios:

- `useCollection`
- `useDoc`
- `useMemoFirebase`

Eles fazem:

- subscribe em tempo real
- controle de loading
- propagação de erro de permissão

### Escrita

Há duas estratégias:

- escrita direta com `setDoc` e similares
- helpers non-blocking:
  - `setDocumentNonBlocking`
  - `addDocumentNonBlocking`
  - `updateDocumentNonBlocking`
  - `deleteDocumentNonBlocking`

## 4. Domínios principais

### Execução diária

- tasks
- timesheets
- active task timer
- focus sessions

### Planejamento

- goals
- milestones
- subtasks
- reviews

### Gestão

- projects
- delegations
- team
- documents
- revenue

### IA

- chat
- mentor de projetos
- análise de energia
- revisão noturna
- team intelligence

## 5. Camada de IA

Todos os flows em `src/ai/flows/` são `use server`.

Padrão dominante:

- `OpenAI` direto
- prompt fixo no arquivo
- `zod` para input/output
- retorno estruturado ou erro controlado

Não há hoje:

- orquestração central da IA
- config única compartilhada entre flows
- leitura do `mentorDoConfig/default` pelos flows

## 6. Padrões de UX

### Persistência

- Firestore para dados principais
- `localStorage` para estado do timer de foco

### Tempo real

- tarefas, metas, stats, documentos, equipe e outros domínios usam listeners Firestore

### Feedback

- toasts em quase todos os fluxos de escrita
- fallback visual para loading
- error boundaries para problemas Firebase e MentorDo

## 7. Tensões arquiteturais atuais

### Modelo de projeto duplicado

Convivem:

- `Project`
- `ManagedProject`

Consequência:

- parte do app opera em cima do modelo novo
- parte ainda usa legado e `src/lib/data.ts`

### Perfil do MentorDo duplicado

Convivem:

- `users/{uid}/mentorDo/profile`
- `users/{uid}/profile/mentordo`

Consequência:

- contexto pessoal da IA não está consolidado

### Histórico desalinhado

Backend salva em:

- `feedback_sessions`
- `pdi_history`

UI lê em:

- `users/{uid}/feedback_sessions`
- `users/{uid}/pdi_history`

### Build permissivo

`next.config.ts` ignora lint e tipos no build.

Consequência:

- o deploy pode passar sem que a base esteja tecnicamente saudável

## 8. Blueprint real do fluxo de dados

### Exemplo: concluir tarefa

1. UI em `daily-plan-view.tsx`
2. transação no Firestore
3. atualiza:
   - `tasks/{taskId}`
   - `user_stats/data`
   - `goals/{goalId}` se vinculada
4. `DashboardDataProvider` recebe snapshot novo
5. widgets reagem automaticamente

### Exemplo: revisão noturna

1. UI coleta tarefas do dia
2. chama `generate-nightly-review`
3. usuário aceita/edita sugestões
4. salva review em `reviews/{date}`
5. cria tasks de amanhã em `tasks`

### Exemplo: questionário de equipe

1. cria `profile_questionnaires/{id}`
2. membro responde em rota pública
3. IA conduz entrevista
4. IA gera perfil comportamental
5. resultado volta para `team/{memberId}`

## 9. Leitura final

Arquiteturalmente, o projeto já tem um esqueleto forte:

- domínios separados
- camada própria de Firebase
- flows de IA específicos por problema
- dashboard com dados em tempo real

O principal débito técnico hoje não é ausência de arquitetura, e sim falta de consolidação:

- reduzir caminhos duplicados
- eliminar legado estático
- normalizar modelo de dados
- restaurar saúde de tipagem e lint
