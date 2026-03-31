# Documento de Status do Projeto: NeuroDO

**Última Atualização:** 25 de Julho de 2024

Este documento serve como um resumo abrangente do estado atual do aplicativo NeuroDO. O objetivo é fornecer um "mapa da situação" para qualquer membro da equipe ou IA colaboradora (como o Claude) para entender rapidamente o que foi construído, o que está por vir e os princípios que guiam o desenvolvimento.

---

## 1. Visão Geral e Filosofia do Projeto

**NeuroDO** é um "Sistema Operacional para o Empreendedor Neurodivergente". Ele não é apenas uma ferramenta de produtividade, mas um parceiro de gestão projetado especificamente para cérebros que prosperam com novidade, contexto visual e gamificação, enquanto lutam contra a monotonia e a sobrecarga de informações.

As diretrizes principais que governam o desenvolvimento são:

- **Especialista em Neurodiversidade:** O sistema deve atuar como um especialista em TDAH, superdotação e autismo leve, com foco em maximizar o desempenho e o bem-estar. As funcionalidades devem ser projetadas para apoiar, e não para combater, as características desses perfis.
- **Sistema Adaptativo:** Para combater o tédio e a necessidade constante de novidade, o sistema deve ser capaz de mudar sua aparência (temas), sua estrutura (layouts de dashboard) e suas regras (gamificação por temporadas).
- **Delegação como Pilar:** O sistema deve ativamente incentivar e facilitar a delegação de tarefas, pois este é o caminho principal para o crescimento do CEO.
- **Feedback Visual e Imediato:** O progresso e a urgência devem ser comunicados visualmente sempre que possível (ex: barras de progresso, cores de urgência dinâmicas).

---

## 2. Funcionalidades Implementadas e Funcionando

### **Core & Estrutura**
- **Autenticação Anônima:** Os usuários podem começar a usar o app imediatamente com uma conta anônima criada em segundo plano.
- **Layout do Dashboard:** A estrutura principal com Sidebar (navegação), Header e área de conteúdo principal está totalmente funcional.
- **Banco de Dados (Seed):** Um script (`/src/lib/seed.ts`) permite popular o banco de dados com dados de teste realistas, incluindo tarefas, metas e equipe com fotos. O script é destrutivo, garantindo um ambiente limpo a cada execução.
- **Backend & Segurança:** Firestore está configurado com regras de segurança que garantem que cada usuário só possa acessar e modificar seus próprios dados.

### **Módulos de Produtividade**
- **Plano do Dia (Tarefas):**
  - CRUD (Criar, Ler, Atualizar, Excluir) completo para tarefas diárias.
  - As tarefas são exibidas agrupadas por período (Manhã, Tarde, Noite).
  - Funcionalidade de "Tarefa Mais Importante" (MIT).
- **Delegações:**
  - CRUD completo para delegações, vinculando uma tarefa a um membro da equipe.
  - **Automação de Gestão:** Ao delegar, o sistema cria automaticamente tarefas de "passar o bastão" e "cobrar entrega" para o gestor.
  - **Urgência Dinâmica por Cor:** Os cards de delegação mudam a cor da borda com base na proximidade do prazo, usando um degradê de verde (seguro) para amarelo (atenção) e vermelho (urgente/atrasado), com opacidade variável.
- **Pirâmide de Metas:**
  - CRUD completo para metas, permitindo a criação de uma hierarquia (Anual, Trimestral, Mensal, etc.).
  - Acompanhamento de progresso com barras visuais.
- **Roadmap de Projetos:**
  - CRUD completo para marcos (milestones) de projetos.
  - Visualização em formato de linha do tempo, agrupada por projeto.
- **Documentos (Base de Conhecimento):**
  - CRUD completo para documentos como Playbooks, Estratégias e Processos.

### **Módulos de Pessoas (CRM Pessoal)**
- **Central de Relacionamentos (Equipe):**
  - CRUD completo para perfis de membros da equipe, amigos, mentores, etc.
  - Página de perfil detalhada para cada pessoa.
- **IA para Gestão de Pessoas:**
  - **Questionário de Perfil Comportamental:** Uma página pública (`/q/[id]`) onde um membro da equipe responde a uma entrevista conduzida por IA para gerar seu perfil.
  - **Geração de Roteiro de Feedback:** Uma ferramenta que usa IA para criar um script de feedback personalizado com base no perfil do colaborador, usando a técnica SBI (Situação-Comportamento-Impacto).
  - **Geração de PDI (Plano de Desenvolvimento Individual):** Uma IA que analisa o perfil e as funções de uma pessoa para sugerir um plano de desenvolvimento acionável.

### **IA & Gamificação**
- **Chat com Mentor IA:** Um chat flutuante para conversas e orientações rápidas.
- **Captura Rápida de Ideias:** Uma ferramenta para anotar ideias rapidamente, onde a IA classifica e decide se a ideia é relevante para os projetos atuais ou se deve ser arquivada.
- **Gamificação Básica:**
  - Sistema de XP ao completar tarefas.
  - Níveis de usuário baseados no XP acumulado.
  - Contador de "sequência" (dias consecutivos de progresso).

---

## 3. Funcionalidades Planejadas (A Implementar)

### **Estratégia Principal: O Sistema Adaptativo**
Esta é a próxima grande iniciativa para combater o tédio e manter o engajamento.
- **Nível 1 (Próximo Passo): Temas Visuais Dinâmicos:** Implementar um seletor de temas (ex: Hiperfoco, Criativo) que altera o esquema de cores e a aparência geral do app.
- **Nível 2: "Perspectivas" de Dashboard:** Criar layouts de dashboard alternativos (ex: "Visão de CEO", "Visão de Execução") que reorganizam os componentes para focar em diferentes tipos de informação.
- **Nível 3: Gamificação Avançada:** Introduzir "Temporadas" (ciclos trimestrais com novas metas e temas), desafios semanais gerados pela IA e conquistas secretas para criar recompensas variáveis e inesperadas.

### **Conexão de Dados no Frontend**
Muitos componentes do frontend ainda usam dados estáticos de teste.
- **Conectar o Dashboard:** O widget "Metas do Dia" e a "Visão Geral do Projeto" precisam buscar dados do Firestore em tempo real.
- **Conectar a Página de Métricas:** A página de "Métricas & Conquistas" precisa ser conectada às coleções `user_stats` e `achievements` do Firestore.
- **Salvar Revisão Noturna:** O formulário de Revisão Noturna precisa salvar as respostas em uma nova coleção `reviews` no Firestore.

### **Melhorias de IA**
- **Contexto de Projetos no Chat:** O Mentor IA precisa de acesso em tempo real aos documentos, metas e tarefas do usuário para fornecer conselhos mais profundos e contextualizados.
- **Inteligência Proativa:** A IA poderia, por exemplo, sugerir a criação de um "Playbook" ao detectar uma tarefa que foi executada manualmente várias vezes.

### **Finalização de Funcionalidades Core**
- **Autenticação Completa:** Implementar fluxos de cadastro e login com E-mail/Senha e provedores sociais (Google), além da funcionalidade de Logout.
- **Notificações:** Criar um sistema de notificações para lembretes de tarefas, follow-ups de delegação e conquistas desbloqueadas.
