# CLAUDE.md — NeuroDO

> **Leia este arquivo inteiro antes de qualquer ação.** Ele é o contexto permanente do projeto. Sem ele você opera às cegas.

---

## 1. Visão e Missão

**NeuroDO** é o "Sistema Operacional para o Empreendedor Neurodivergente".

- **O que é:** App web (PWA-ready) de produtividade, gestão de metas, delegação, gamificação e mentoria por IA — projetado especificamente para cérebros com TDAH, superdotação e autismo leve.
- **Para quem:** Persona central é o próprio criador: um CEO neurodivergente (TDAH percentil 99) que gerencia 5 projetos simultâneos e precisa de estrutura externa para compensar déficits de função executiva, autorregulação e atenção sustentada.
- **Problema que resolve:** Ferramentas de produtividade genéricas ignoram que cérebros neurodivergentes prosperam com novidade, feedback visual imediato e gamificação — e travam com monotonia, longas listas e ausência de recompensa. O NeuroDO adapta a experiência à energia do usuário, filtra distrações ("Shiny Object Filter"), e transforma progresso em dopamina estruturada.
- **Filosofia central:** "Done > Perfect". MVP funcional sempre. Nunca reimplementar o que já existe.

---

## 2. Contexto do Criador

**Gustavo Braga de Camargo**, 37 anos, CEO da Envox (agência de publicidade com 11 anos), baseado em Curitiba-PR.

- **Diagnóstico:** TDAH percentil 99, Função Executiva percentil 99, Autorregulação percentil 99, Autocontrole percentil 90. Laudo clínico confirma dificuldades significativas em planejamento, organização, flexibilidade cognitiva e inibição de impulsos.
- **Perfil comportamental (Sólides):** Alto Comunicador (C) — assertivo, iniciativo, comunicativo, otimista, senso de urgência. Baixo Planejador — impaciente, rápido, orientado a ação.
- **Como trabalha:** Energia cresce pela manhã (hiperfoco 9h-12h), pico no final da tarde (16h-18h), queda à noite. Máximo 2 reuniões/dia. Tarefas chunked em blocos de 25-50min. 4 jantares/semana com família (inegociável). Exercício 3x/semana (inegociável).
- **Como programa:** 100% via IA (Replit Agent, Claude Code, Windsurf). Tem base em PHP/MySQL/HTML mas não está atualizado em stacks modernos. Nunca forneça código direto — sempre prompts ou instruções para a IA executar.
- **Filtro anti-distração:** Toda nova ideia passa pelo teste: (1) Resolve problema dos 5 projetos? (2) Gera receita até Dez/26? Se não → "Banco de Ideias 2027".

---

## 3. Projetos Ativos e Objetivos 2026

O NeuroDO é a ferramenta pessoal de Gustavo para gerenciar seu ecossistema de 5 projetos. A meta guia é **R$30.000/mês líquido PF em Dezembro 2026** (intermediária: R$20.000/mês até Julho 2026).

| Projeto | O que é | Meta Dez/26 | Status |
|---------|---------|-------------|--------|
| **Envox** | Agência de publicidade/marca (11 anos). Base de caixa. | R$12k líquido PF, 25 clientes, churn <5% | Operacional. Bia treinando p/ assumir comercial. |
| **Farmácias de Manipulação** | SaaS/marketplace B2B conectando clientes a farmácias de manipulação. Veículo de crescimento #1. | R$15k líquido PF, 50+ farmácias pagantes | Tech v0.9 (95% pronto). Falta Asaas split, reviews UI, segurança. Lançamento v1.0 público previsto. |
| **Geração PJ** | Podcast de empreendedorismo + documentário "Bolsonaro Antes do Mito". | 50 episódios, 10k+ downloads/mês | Ativo, baixa manutenção. 2 eps/mês. Isa edita. |
| **Felizmente** | Projeto de neurodiversidade (conteúdo, comunidade). | 100k seguidores | **PAUSADO até Jul/26.** Retomar só se sobrar energia. |
| **Influencers/Atletas** | Gestão de creators e atletas (ex: Elizeu Capoeira, UFC). | 3-5 atletas, 1 case destaque, R$3k líquido | Early stage, baixa demanda do Gus. |

**Sinergia:** Felizmente (audiência) → Geração PJ (autoridade) → Farmácias + Envox (conversão) → Influencers (amplificação) → Loop recomeça.

---

## 4. Modelo de Negócio do NeuroDO

O NeuroDO é, por enquanto, uma ferramenta **interna e pessoal** do Gustavo — seu "segundo cérebro" para gerir os 5 projetos e manter foco.

- **Monetização futura (pós-2026):** Potencial SaaS para empreendedores neurodivergentes (freemium + premium com IA avançada). Não é prioridade agora.
- **Valor imediato:** Reduz a carga cognitiva do CEO, filtra distrações, estrutura rotina, e aumenta a probabilidade de atingir a meta de R$30k/mês.
- **Público-alvo futuro:** Empreendedores e líderes diagnosticados com TDAH, autismo leve ou superdotação que precisam de ferramentas adaptadas.

---

## 5. Stack Técnica

```
Framework:    Next.js 15.5.9 + React 19 (App Router)
Auth & DB:    Firebase 11.9.1 (Auth + Firestore) + Firebase Admin 12.2.0
AI/LLM:       OpenAI 4.53.2 (principal) + Genkit/Google GenAI 1.5.1 (secundário)
UI:           Radix UI + Tailwind CSS 3.4.1 + Lucide Icons
Forms:        React Hook Form 7.54.2 + Zod 3.24.2
Charts:       Recharts 2.15.1
Deploy:       Vercel (front) + Firebase Admin (servidor)
Idioma UI:    Português (pt-BR) em toda a interface, prompts e outputs
```

**Modelo de IA padrão:** `gpt-4o-mini` (configurável via env var `NEURODO_MODEL`). Nunca hardcode modelos.

---

## 6. Estrutura do Repositório

```
src/
├── app/                    # Rotas Next.js (App Router)
│   ├── dashboard/          # Todas as páginas autenticadas
│   ├── login/              # Autenticação
│   └── q/[id]/             # Questionários de perfil de time (página pública)
├── components/
│   ├── ui/                 # 35+ componentes Radix (Button, Card, Dialog, etc.)
│   └── dashboard/          # 37+ componentes de domínio (TaskForm, GoalsView, Logo, etc.)
├── ai/flows/               # 9 Server Actions de IA (OpenAI)
│   ├── classify-and-route-idea.ts    # Filtro "Shiny Object"
│   ├── conduct-profile-interview.ts  # Entrevista comportamental via chat
│   ├── generate-behavioral-profile.ts # Gera perfil DISC/MBTI/Eneagrama
│   ├── generate-feedback-session.ts  # Roteiro de feedback SBI
│   ├── generate-pdi.ts              # Plano de Desenvolvimento Individual
│   ├── breakdown-milestone.ts       # Breakdown de milestones via IA
│   └── ...                          # Outros flows
├── firebase/               # Config, hooks, provider, admin, non-blocking-updates
├── context/                # AppProvider (timer, energia, gamificação)
├── hooks/                  # Custom hooks (useGoals, useApp, useCollection, etc.)
└── lib/
    ├── types.ts            # 20+ interfaces TypeScript do domínio
    ├── utils.ts            # Utilitários gerais
    ├── data.ts             # Dados de seed/referência
    └── help-content.ts     # Textos de ajuda contextual por página
```

---

## 7. Features Já Implementadas (NÃO reimplementar)

### Core & Estrutura
- Autenticação Firebase (Auth anônima + roles admin/user + regras de segurança Firestore)
- Layout Dashboard completo (Sidebar, Header, área principal)
- Seed script destrutivo para dados de teste (`/src/lib/seed.ts`)
- Non-blocking updates para UX fluida (`src/firebase/non-blocking-updates.tsx`)

### Módulos de Produtividade
- **Plano do Dia:** CRUD tarefas, agrupadas por período (Manhã/Tarde/Noite), MIT (Tarefa Mais Importante)
- **Delegações:** CRUD, vincula tarefa→membro, automação "passar bastão" + "cobrar entrega", urgência dinâmica por cor (verde→amarelo→vermelho)
- **Pirâmide de Metas:** CRUD hierárquico (Anual/Trimestral/Mensal/Semanal/Diária), barras de progresso
- **Roadmap:** CRUD marcos (milestones), timeline agrupada por projeto
- **Documentos (Base de Conhecimento):** CRUD (Playbook, Estratégia, Processo, Checklist)

### Módulos de Pessoas
- **Central de Relacionamentos (Equipe):** CRUD perfis, página detalhada por pessoa
- **Questionário de Perfil Comportamental:** Página pública `/q/[id]`, entrevista via IA, gera perfil DISC/MBTI/Eneagrama
- **Geração de Roteiro de Feedback:** IA cria script SBI personalizado ao perfil do colaborador
- **Geração de PDI:** IA analisa perfil + funções → plano de desenvolvimento acionável

### IA & Gamificação
- **Chat com Mentor IA:** Chat flutuante, OpenAI com retry e histórico
- **Captura Rápida de Ideias:** Anota → IA classifica → Projeto relevante ou "Balde 2027"
- **Gamificação:** XP por tarefa (+10), níveis baseados em XP, streak (dias consecutivos)
- **Timer de Foco:** Sprint 15m / Pomodoro 25m / Deep Focus 50m

### Dados & Sync
- Firestore listeners não-bloqueantes (realtime)
- Estrutura: `/users/{userId}/{colecao}/{docId}`

---

## 8. Backlog — Próximos Passos em Prioridade

Ordenados por impacto estratégico no objetivo de R$30k/mês e retenção de uso do Gustavo.

### P0 — Crítico (sem isso o app não entrega valor diário)

1. **Dashboard de Métricas Conectado** (`/dashboard/metrics` — parcialmente implementado)
   - Conectar widgets "Metas do Dia" e "Visão Geral do Projeto" a dados reais do Firestore (hoje usam dados estáticos).
   - Conectar coleções `user_stats` e `achievements`.
   - **Por quê:** Sem métricas reais, Gustavo não tem o feedback visual imediato que seu cérebro TDAH precisa para manter o engajamento. Sem engajamento → abandono do app → volta ao caos.

2. **Revisão Noturna Funcional** (`/dashboard/review` — parcialmente implementado)
   - Salvar respostas ("O que completei?", "Onde travei?", "Top 3 amanhã") em nova coleção `reviews` no Firestore.
   - **Por quê:** É o ritual de fechamento do dia. Sem ele, Gustavo dorme sem clareza do dia seguinte → manhã perdida → cascata de baixa produtividade.

3. **Página de Configurações** (`/dashboard/settings` — incompleta)
   - Preferências do usuário, configurações de notificação, dados do perfil.
   - **Por quê:** Sem settings, cada ajuste requer mexer em código. Bloqueia autonomia.

### P1 — Alta Prioridade (aumenta retenção e uso diário)

4. **Autenticação Completa (Email/Senha + Google)**
   - Substituir autenticação anônima por fluxos reais de cadastro/login com Email/Senha e Google OAuth.
   - Implementar Logout funcional.
   - **Por quê:** Autenticação anônima é para testes. Para uso real diário, Gustavo precisa de persistência garantida entre sessões e dispositivos.

5. **Temas Visuais Dinâmicos (Sistema Adaptativo Nível 1)**
   - Seletor de temas (ex: "Hiperfoco", "Criativo", "Noturno") que altera esquema de cores e aparência.
   - **Por quê:** Cérebro TDAH precisa de novidade visual para não se entediar. Tema estático → app vira "mais um" → abandono. O sistema adaptativo é a arma contra o tédio.

6. **Tracking de Receita por Projeto**
   - Tela para registrar receita mensal de cada um dos 5 projetos (Envox, Farmácias, Influencers, Geração PJ, Felizmente).
   - Progress bar visual mostrando quanto falta para R$20k (Jul/26) e R$30k (Dez/26).
   - **Por quê:** A meta financeira é o norte de tudo. Se Gustavo não vê o progresso financeiro no app que mais usa, o app falha em seu propósito central.

### P2 — Média Prioridade (melhora a experiência)

7. **Contexto de Projetos no Chat do Mentor IA**
   - Injetar metas, tarefas e documentos do usuário como contexto nas chamadas ao Mentor IA.
   - **Por quê:** Hoje o mentor é genérico. Com contexto real ("você tem 3 tarefas atrasadas no Farmácias"), ele vira um parceiro estratégico real.

8. **Notificações e Lembretes**
   - Sistema de notificações para: lembretes de tarefas, follow-ups de delegação, conquistas desbloqueadas, check-in de energia.
   - **Por quê:** TDAH = memória de trabalho fraca. Sem lembretes, tarefas delegadas são esquecidas → follow-ups perdidos → time sem acompanhamento.

### P3 — Desejável (iterar depois)

9. **"Perspectivas" de Dashboard (Sistema Adaptativo Nível 2)**
   - Layouts alternativos ("Visão de CEO", "Visão de Execução") que reorganizam componentes.
   - **Por quê:** Diferentes modos mentais pedem diferentes visualizações.

10. **Gamificação Avançada (Sistema Adaptativo Nível 3)**
    - "Temporadas" trimestrais com novos temas, desafios semanais gerados pela IA, conquistas secretas.
    - **Por quê:** Recompensas variáveis e inesperadas são a forma mais potente de manter engajamento TDAH a longo prazo.

11. **Inteligência Proativa**
    - IA sugere criação de Playbook ao detectar tarefa executada manualmente várias vezes.
    - **Por quê:** Reduz carga cognitiva → mais delegação → mais escala.

---

## 9. Convenções de Código (Obrigatório)

- **Idioma:** Toda UI, feedback, placeholder, toast, e output de IA em **português (pt-BR)**. Sem exceção.
- **AI Flows:** Todos são Server Actions (`'use server'`). Seguir padrão existente em `src/ai/flows/`.
- **Validação:** Input com **Zod** em todas as actions (ver schemas em `src/lib/types.ts`).
- **Firestore:** Estrutura sempre `/users/{userId}/{colecao}/{docId}`.
- **Updates:** Non-blocking (optimistic) para melhor UX — usar padrão de `src/firebase/non-blocking-updates.tsx`.
- **Componentes UI:** Radix + Tailwind **exclusivamente**. NÃO adicionar outras bibliotecas de UI (Material, Ant, Chakra, etc.).
- **Hooks:** Custom hooks para Firebase queries. Nunca usar SDK diretamente nos componentes.
- **Modelo IA:** Configurável via `NEURODO_MODEL` env var. Default: `gpt-4o-mini`. Nunca hardcodar.
- **Tema visual:** Dark mode por padrão. Cores: Primary `#22C55E` (verde vivo), Background `#0A0A0F` (azul-cinza escuro), Accent `#F59E0B` (âmbar).

---

## 10. Regras para o Claude Code

1. **NUNCA reimplementar** features que já existem — verificar `src/ai/flows/`, `src/components/dashboard/` e `src/hooks/` antes de criar algo novo.
2. **Manter todos os textos em pt-BR.** Isso inclui comentários de código voltados ao usuário, mensagens de toast, labels de formulário, e outputs de IA.
3. **Seguir os padrões de Server Actions** para qualquer nova integração com IA — ver `src/ai/flows/classify-and-route-idea.ts` como referência.
4. **Ao criar novos componentes:** verificar se um componente Radix equivalente já existe em `src/components/ui/` antes de criar custom.
5. **Priorizar UX não-bloqueante** (optimistic updates). O usuário não deve esperar spinners para ações simples.
6. **O `NEURODO_MODEL` padrão é `gpt-4o-mini`** — não hardcodar modelos em nenhum flow.
7. **Nunca criar dependências novas** sem verificar se o problema pode ser resolvido com o que já existe (Radix, Tailwind, Lucide, Recharts, Zod, React Hook Form).
8. **Commits devem ser atômicos** — uma feature ou fix por commit, com mensagem descritiva em português.
9. **Testes:** Se existir um padrão de testes no projeto, seguir. Se não, priorizar entrega funcional ("Done > Perfect").
10. **Ao encontrar bugs:** Corrigir na raiz, não patchear com workarounds que criam dívida técnica.

---

## 11. Referência Rápida

| Precisa de... | Vá para... |
|---------------|------------|
| Tipos/interfaces | `src/lib/types.ts` |
| Componentes Radix | `src/components/ui/` |
| Componentes de domínio | `src/components/dashboard/` |
| AI Flows (Server Actions) | `src/ai/flows/` |
| Hooks customizados | `src/hooks/` |
| Config Firebase | `src/firebase/` |
| Dados de seed | `src/lib/data.ts` |
| Textos de ajuda | `src/lib/help-content.ts` |
| Context global (timer, energia, gamificação) | `src/context/app-provider.tsx` |
| Estilos globais | `src/app/globals.css` |

---

> **Lembrete final:** O NeuroDO existe para que Gustavo chegue em 1º de Dezembro de 2026 com R$30k/mês líquido, 5 projetos consolidados, família feliz e 15 dias de férias merecidas. Cada linha de código deve servir a esse objetivo.
