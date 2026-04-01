# Guia de Configuração do Mentor IA

## Visão Geral

O Mentor IA do NeuroDo utiliza a OpenAI API para fornecer orientação personalizada. Este documento detalha a configuração e troubleshooting.

## Configuração Obrigatória

### 1. Variáveis de Ambiente

Adicione ao seu arquivos `.env.local` (local) e a ambiente de produção (Vercel):

```env
# OBRIGATÓRIO - Sua chave de API OpenAI
# Obtenha em: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-...

# OPCIONAL - ID do Vector Store para busca de contexto
NEURODO_VECTOR_STORE_ID=vs-...

# OPCIONAL - Modelo a usar (padrão: gpt-4o-mini)
NEURODO_MODEL=gpt-4o-mini
```

### 2. Configuração na Vercel

1. Acesse o dashboard do Vercel
2. Selecione o projeto NeuroDo
3. Vá para **Settings** → **Environment Variables**
4. Adicione as variáveis acima
5. Clique em **Save** e redeploy

## Troubleshooting

### Erro: "An error occurred in the Server Components render"

**Causa:** Geralmente significa que uma das variáveis de ambiente não está disponível no servidor.

**Solução:**
1. Verifique se `OPENAI_API_KEY` está configurada
2. No Vercel, confirme que a variável está associada aos ambientes corretos (Production, Preview, Development)
3. Redeploie o projeto
4. Aguarde 1-2 minutos para a alteração surtir efeito

### Erro: "A chave de API não está configurada corretamente"

**Causa:** Chave de API inválida, expirada ou não autorizada.

**Solução:**
1. Acesse https://platform.openai.com/api-keys
2. Verifique se a chave ainda existe e está ativa
3. Se necessário, gere uma nova chave
4. Atualize no `.env.local` (local) e na Vercel (produção)
5. Redeploie

### Erro: "Muitas requisições. Aguarde um momento"

**Causa:** Rate limiting da OpenAI (429 error).

**Solução:**
- Aguarde alguns minutos antes de tentar novamente
- Considera fazer upgrade da conta OpenAI para aumentar limites
- Implemente caching de respostas (em versões futuras)

### Erro: "O servidor de IA está temporariamente fora"

**Causa:** Servidor OpenAI indisponível ou erro 500.

**Solução:**
- Verifique o status em https://status.openai.com
- Aguarde alguns minutos
- Tente novamente

### Erro: "A resposta levou muito tempo"

**Causa:** Timeout de 30 segundos na comunicação com OpenAI.

**Solução:**
- Reduzir `max_tokens` no código (atualmente 512)
- Tentar com uma mensagem mais curta
- Verificar sua conexão com a internet
- Aguardar em horários de menor uso da API

## Verificação Local

Para testar localmente:

```bash
# 1. Crie/atualize .env.local
echo "OPENAI_API_KEY=sk-SEU_VALOR_AQUI" > .env.local

# 2. Inicie o servidor
npm run dev

# 3. Abra http://localhost:3000/dashboard
# 4. Teste o chat do Mentor IA

# 5. Verifique logs no console do servidor
# Deve ver logs tipo: "[AI Mentor Request: ...]"
```

## Logs Detalhados

O sistema agora gera logs estruturados. Para DEBUG:

**No Backend (Server Actions):**
```
[AI Mentor Request: mentor-XXX] Iniciando processamento
[AI Mentor Request: mentor-XXX] Enviando para OpenAI
[AI Mentor Success: mentor-XXX] Resposta obtida com sucesso
[AI Mentor Error: mentor-XXX] Erro na API OpenAI
```

**No Frontend (Browser Console):**
```
[Retry 0/3] Erro no chat: ...
[AI Mentor Chat] Erro durante requisição: {...}
```

## Checklist de Verificação

- [ ] `OPENAI_API_KEY` está configurada no `.env.local`
- [ ] A chave é válida em https://platform.openai.com/api-keys
- [ ] Em Produção: variáveis configuradas na Vercel
- [ ] Servidor foi redeploiado após mudanças de variáveis
- [ ] Aguardou 1-2 minutos para refletir as mudanças
- [ ] Console do servidor mostra logs de inicialização sem erro
- [ ] Chat consegue enviar/receber mensagens

## Limitações Conhecidas

- Timeout de 30 segundos para respostas
- Máximo de 512 tokens por resposta
- Histórico não é persistido entre sessões
- Vector Store ainda não integrado totalmente

## Próximas Melhorias

- [ ] Persistência de histórico em Firestore
- [ ] Caching de respostas frequentes
- [ ] Integração completa com Vector Store
- [ ] Suporte a embeddings customizados
- [ ] Rate limiting local para evitar abuse

## Suporte

Se continuar com erros:

1. Verifique todos os pontos acima
2. Consulte logs no Vercel: **Deployments** → select deployment → **Runtime logs**
3. Verifique status da OpenAI em https://status.openai.com
4. Entre em contato com o time de desenvolvimento
