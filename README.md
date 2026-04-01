# NeuroDo

Aplicação Next.js para gestão pessoal e produtividade com IA integrada.

## Configuração

### Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto com as seguintes variáveis:

```env
# OpenAI API Key (obrigatória para o chat do mentor IA)
OPENAI_API_KEY=your_openai_api_key_here

# Vector Store ID do OpenAI (opcional, para contexto avançado)
NEURODO_VECTOR_STORE_ID=your_vector_store_id_here

# Modelo do OpenAI (opcional, padrão: gpt-4o-mini)
NEURODO_MODEL=gpt-4o-mini
```

### Instalação e Execução

```bash
npm install
npm run dev
```

### Build

```bash
npm run build
npm start
```

## Funcionalidades

- Dashboard pessoal com métricas e metas
- Chat com Mentor IA para apoio e orientação
- Gestão de delegações e tarefas
- Sistema de feedback e avaliações
