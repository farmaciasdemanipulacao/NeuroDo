# 🧪 TESTANDO.md — Guia de Validação Firestore (NeuroDO)

> **Para o Gustavo:** 5 micro-passos, sem enrolação. Verde = passou. Vermelho = tem bug. Simples assim.

---

## Por que isso importa

Depois da migração, **nenhum dado importante deve viver só na memória do browser**. Se você recarregar a página ou abrir em outro dispositivo, tudo tem que estar lá — vindo direto do Firestore.

---

## Micro-Passo 1 — Diagnóstico automático (30 segundos)

**Acesse:** `/dashboard/validar` (produção: `https://neuro-do.vercel.app/dashboard/validar`)

A página **Validar Firestore** carrega em tempo real e mostra:

| Check | O que verifica |
|-------|---------------|
| ✅ Autenticação Firebase | Usuário logado e UID reconhecido |
| ✅ user_stats | Nível, XP e streak vindo do Firestore |
| ✅ Preferências | Tema e timer padrão persistidos |
| ✅ Coleção de Tarefas | Tarefas acessíveis em tempo real |
| ✅ Coleção de Revisões | Última revisão noturna registrada |

Clique em **"Testar Gravação"** — o botão cria, lê e apaga um documento de teste no Firestore. Se der `✅ Gravou → leu → apagou com sucesso`, o ciclo de leitura/escrita está 100%.

**Resultado esperado:** 5 checks verdes + teste de gravação OK.

---

## Micro-Passo 2 — Dashboard de Métricas (1 minuto)

**Acesse:** `/dashboard/metrics`

1. Complete uma tarefa em `/dashboard/plan`.
2. Volte para Métricas — o gráfico dos **últimos 7 dias** deve atualizar.
3. Recarregue a página (F5 ou Ctrl+R).

**Critério de aprovação:** O número de tarefas no gráfico permanece igual após o reload.  
**Onde olhar se falhar:** `src/components/dashboard/metrics-chart.tsx` → hook `useUserStats()`.

---

## Micro-Passo 3 — Revisão Noturna (2 minutos)

**Acesse:** `/dashboard/review`

1. Preencha a revisão e clique em **Salvar Revisão**.
2. Abra o **Firebase Console** → Firestore → `users/{seu-uid}/reviews/`.
3. Deve aparecer um documento com a data de hoje (ex: `2026-04-02`).
4. Recarregue o app e acesse `/dashboard/validar` — **Coleção de Revisões** deve mostrar a data da revisão que você acabou de salvar.

**Critério de aprovação:** Documento existe no Firestore e persiste após reload.  
**Onde olhar se falhar:** `src/components/dashboard/evening-review-form.tsx` → linha com `setDoc(..., 'reviews', ...)`.

---

## Micro-Passo 4 — Configurações e Preferências (1 minuto)

**Acesse:** `/dashboard/settings`

1. Troque o **Tema Visual** para "Hiperfoco".
2. Troque o **Timer Padrão** para "Sprint — 15 min".
3. Recarregue a página (F5).
4. As configurações **devem permanecer** sem precisar selecionar de novo.
5. Confirme também via `/dashboard/validar` → **Preferências**: deve mostrar `Tema: hyperfocus · Timer: sprint`.

**Critério de aprovação:** Preferências persistem entre reloads.  
**Onde olhar se falhar:** `src/hooks/use-preferences.ts` → função `updatePreferences()`.

---

## Micro-Passo 5 — Teste de Resiliência (modo offline)

> **Objetivo:** confirmar UX non-blocking — o app não trava se o Firebase ficar offline momentaneamente.

1. No Chrome DevTools → aba **Network** → selecione `Offline`.
2. Tente fazer qualquer ação no app (ex: marcar uma tarefa, trocar tema).
3. A UI deve **não travar** — pode mostrar um indicador de carregamento ou optimistic update.
4. Reconecte (Network → `Online`).
5. Os dados devem **sincronizar automaticamente** com o Firestore.

**Critério de aprovação:** App não congela offline; dados sincronizam ao voltar online.  
**Onde olhar se falhar:** `src/firebase/non-blocking-updates.tsx` — pattern de optimistic update.

---

## 🔍 Atalhos de Diagnóstico

| Sintoma | O que verificar |
|---------|----------------|
| Check vermelho em `/validar` | Regras de segurança Firestore — Firebase Console → Rules |
| Dados somem após F5 | Componente usando `useState` sem hook Firestore → grep `useState` no componente |
| Erro 403 no console | Usuário não autenticado ou regra bloqueando — checar `isAdmin` / `uid` nas Rules |
| Revisões = 0 no validar | Normal se nunca fez Revisão Noturna — faça uma primeiro |
| XP zerado após login | Rode o seed em `/dashboard/admin` para recriar `user_stats` |

---

## 📁 Arquivos-chave para debug

```
src/hooks/use-user-stats.ts       → lê /users/{uid}/user_stats/data
src/hooks/use-preferences.ts      → lê/grava /users/{uid}/preferences/data
src/components/dashboard/
  evening-review-form.tsx         → salva /users/{uid}/reviews/{date}
  metrics-chart.tsx               → lê tasks + user_stats em tempo real
  firestore-validator.tsx         → diagnóstico completo em tempo real
src/firebase/non-blocking-updates.tsx → UX optimistic (anti-freeze)
```

---

> **Resumo executivo:** Se os 5 checks da página `/dashboard/validar` estiverem verdes e o Teste de Gravação passar, a migração está completa. Qualquer vermelho = tem arquivo específico para debugar. Sem mistério.
