# Guia Atual de Validação do NeuroDo

Baseado no código atual em `2026-04-21`.

## Objetivo

Validar o estado real do projeto em três camadas:

1. infraestrutura local
2. persistência Firebase
3. fluxos principais do produto

## 1. Checagens locais

### Instalação e execução

```bash
npm install
npm run dev
```

### TypeScript

```bash
npm run typecheck
```

Estado atual esperado:

- o comando falha hoje com `51` erros

### Lint

```bash
npm run lint
```

Estado atual esperado:

- o comando falha hoje por problema de configuração em `.eslintrc.json`
- o erro aparece antes de lintar o código

## 2. Validar Firebase no app

### Página de diagnóstico

Acesse:

```txt
/dashboard/validar
```

Ela verifica:

- autenticação
- `user_stats`
- `preferences`
- coleção de `tasks`
- coleção de `reviews`
- teste real de gravação/leitura/remoção

### Resultado bom

- checks verdes
- teste de gravação funcionando

## 3. Validar login

### Fluxos existentes

- login por e-mail/senha
- cadastro por e-mail/senha
- login com Google

### O que verificar

- ao logar, o app redireciona para `/dashboard`
- ao criar conta, `seedNewUserData` cria:
  - `users/{uid}`
  - `users/{uid}/pdi_history`
  - `users/{uid}/mentorDo/profile`

## 4. Validar tarefas e plano do dia

### Teste mínimo

1. criar uma tarefa em `/dashboard/plan`
2. marcar como concluída
3. confirmar alteração em:
   - `users/{uid}/tasks`
   - `users/{uid}/user_stats/data`

### O que o código faz

- atualiza `completed` e `completedAt`
- soma XP
- incrementa `tasksCompleted`
- pode avançar meta vinculada

## 5. Validar revisão noturna

### Teste mínimo

1. acesse `/dashboard/review`
2. gere análise com IA
3. salve a revisão

### O que deve acontecer

- grava documento em `users/{uid}/reviews/{YYYY-MM-DD}`
- cria tasks para amanhã em `users/{uid}/tasks`

## 6. Validar energia

### Check-in

Abra o modal de energia no header.

O que deve gravar:

- `users/{uid}/energy_checkins/{date-hour-minute}`

Se houver medicações em `Sobre Mim`, o modal também grava:

- `medicationsTaken`

### Dashboard de energia

Em `/dashboard/energy`, verificar:

- leitura de `reviews`
- leitura de `energy_checkins`
- análise com IA

## 7. Validar foco

### Timer de foco

Em `/dashboard/focus`, verificar:

- timer funciona
- sessão concluída grava em `users/{uid}/focus_sessions`

### Timer de tarefa

No plano do dia:

- iniciar timer de tarefa
- pausar/retomar
- parar

O estado ativo deve aparecer em:

- `users/{uid}/active_task_timer/current`

Ao finalizar com registro:

- grava em `users/{uid}/timesheets`

## 8. Validar equipe e IA de gestão

### Fluxo completo

1. criar membro em `/dashboard/team`
2. abrir o perfil do membro
3. gerar link do questionário
4. responder em `/q/[questionnaireId]`
5. confirmar geração de perfil comportamental

### O que deve existir

- `profile_questionnaires/{id}`
- atualização do membro em `users/{uid}/team/{memberId}`

### Feedback e PDI

Também testar:

- gerar feedback
- gerar PDI

Observação importante:

- hoje existe divergência entre onde o backend salva histórico e onde a UI lê

## 9. Validar receitas

### PF

Em `/dashboard/revenue/pf`:

- salvar valores do mês
- verificar documento em `users/{uid}/revenue/{YYYY-MM}`

### PJ

Em `/dashboard/revenue/pj`:

- salvar bruto/despesas/líquido
- verificar documento em `users/{uid}/revenue_pj/{YYYY-MM}`

## 10. Validar MentorDo

### Health check

```txt
/api/mentor-health
```

### Chat

No dashboard:

- abrir chat flutuante
- enviar mensagem
- confirmar resposta da IA

### Mentor de projetos

Em `/dashboard/projects`:

- testar:
  - `Estou Perdido`
  - `Comemorar Conquista`
  - `Visão da Semana`

## 11. Itens que não devem surpreender no estado atual

### Comportamentos conhecidos

- `typecheck` falha
- `lint` falha
- build ignora erros de lint e tipo
- `IdeaCatcher` ainda não persiste ideias
- relatório de energia é parcial
- relatório de gamificação é placeholder
- link de gamificação na sidebar está desalinhado com a rota real

## 12. Ordem recomendada de diagnóstico

Se algo parecer quebrado, siga esta sequência:

1. `/api/mentor-health`
2. `/dashboard/validar`
3. login
4. tarefas
5. revisão noturna
6. energia
7. equipe
8. receitas
9. IA
