# Setup Atual do MentorDo

Documento refeito a partir do código atual em `2026-04-21`.

## O que é o MentorDo hoje

No código atual, "MentorDo" não é um único módulo. É um conjunto de fluxos OpenAI usados em áreas diferentes do app:

- chat contextual
- mentor de projetos
- sugestões de tarefa
- análise de energia
- revisão noturna
- breakdown de milestone
- questionário de perfil
- feedback
- PDI

Todos os fluxos ativos usam `OpenAI` diretamente. O app não usa Vector Store no fluxo atual.

## Variáveis de ambiente obrigatórias

```env
OPENAI_API_KEY=sk-...
NEURODO_MODEL=gpt-4o-mini
```

## Variáveis complementares

Necessárias para os fluxos que usam Firebase Admin no servidor.

```env
FIREBASE_SERVICE_ACCOUNT_KEY={...json...}
FIREBASE_PROJECT_ID=...
```

Firebase client do app:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

## Endpoint de saúde

O projeto expõe:

```txt
GET /api/mentor-health
```

Ele:

- verifica se `OPENAI_API_KEY` existe
- tenta listar modelos da OpenAI
- retorna `ok`, `model` e erros conhecidos

## Fluxos de IA ativos

### Chat

Arquivo:

- `src/ai/flows/chat-with-mentor.ts`

Usado em:

- `src/components/dashboard/ai-mentor-chat.tsx`

Comportamento atual:

- usa `OPENAI_API_KEY`
- usa `NEURODO_MODEL` ou `gpt-4o-mini`
- timeout de `30s`
- retry no frontend para alguns erros
- não persiste histórico no Firestore

Contexto real enviado ao chat:

- `users/{uid}/mentorDo/profile`
- milestones ativos
- sumário de `timesheets`

### Mentor de projetos

Arquivo:

- `src/ai/flows/mentor-projects.ts`

Usado em:

- `mentor-projects.tsx`
- `mentor-sos-button.tsx`

Modos:

- `lost`
- `celebrate`
- `strategic`

Entradas principais:

- lista de projetos
- estabilidade dos projetos
- quantidade de projetos de execução
- receita estimada

### Sugestões de tarefa

Arquivo:

- `src/ai/flows/provide-context-aware-assistance.ts`

Usado em:

- `task-suggestions.tsx`

Observação:

- a UI atual ainda usa projeto estático de `src/lib/data.ts` para compor o pedido

### Revisão noturna

Arquivo:

- `src/ai/flows/generate-nightly-review.ts`

Usado em:

- `evening-review-form.tsx`

Saída:

- análise do dia
- padrão de energia
- até 3 tarefas sugeridas para amanhã
- nota motivacional

### Energia

Arquivo:

- `src/ai/flows/analyze-energy-patterns.ts`

Usado em:

- `energy-dashboard.tsx`

### Roadmap

Arquivo:

- `src/ai/flows/breakdown-milestone.ts`

Usado em:

- `roadmap-view.tsx`
- `milestone-detail-view.tsx`

### Equipe

Arquivos:

- `conduct-profile-interview.ts`
- `generate-behavioral-profile.ts`
- `generate-feedback-session.ts`
- `generate-pdi.ts`
- `generate-text-flow.ts`

Usados em:

- questionário público
- perfil do membro
- feedback
- PDI
- assistências no formulário da equipe

## Fontes de contexto do MentorDo

### Fonte usada pelo chat flutuante

```txt
users/{uid}/mentorDo/profile
```

### Fonte usada pela página Sobre Mim

```txt
users/{uid}/profile/mentordo
```

## Inconsistência importante

Hoje existem duas fontes de perfil para o MentorDo.

Impacto:

- a página `Sobre Mim` não atualiza automaticamente o contexto que o chat usa
- o app ainda não tem uma única fonte de verdade para contexto pessoal da IA

## Configuração admin atual

A tela:

```txt
/dashboard/admin/mentor-do
```

grava em:

```txt
mentorDoConfig/default
```

Campos salvos:

- `defaultPrompt`
- `defaultModel`
- `welcomeMessage`
- `helpContacts`

## Limitação importante

Os fluxos atuais não leem `mentorDoConfig/default`.

Na prática:

- a tela admin existe
- mas os prompts usados pela IA continuam hardcoded nos arquivos dos flows

## Troubleshooting real

### 1. Verificar health endpoint

```bash
curl http://localhost:3000/api/mentor-health
```

### 2. Verificar variáveis no servidor

Se `OPENAI_API_KEY` faltar, os fluxos falham em tempo de execução.

### 3. Verificar timeout no chat

O chat do MentorDo usa timeout de `30s`.

Erros tratados:

- `INIT_ERROR`
- `VALIDATION_ERROR`
- `EMPTY_MESSAGE`
- `TIMEOUT`
- `INVALID_API_KEY`
- `RATE_LIMIT`
- `OPENAI_SERVER_ERROR`
- `UNKNOWN_ERROR`

### 4. Verificar histórico de feedback/PDI

Hoje existe divergência de leitura/escrita:

- escrita pelo servidor em coleções top-level
- leitura da UI em subcoleções do usuário

Se o histórico “sumir”, esse é o primeiro ponto para checar.

## O que não está implementado no fluxo atual

- Vector Store
- embeddings
- leitura da configuração admin pelos flows
- persistência do histórico do chat do MentorDo
- fonte única de perfil do usuário
