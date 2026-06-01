# Checklist de Deploy — NeuroDO

Este documento lista as variáveis de ambiente mínimas e passos para deploy correto do NeuroDO (ambiente Vercel ou similar).

## Variáveis de ambiente (mínimo necessário)

### Variáveis públicas (prefixo `NEXT_PUBLIC_`) — usadas no cliente
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` (opcional)

> Observação: essas variáveis são necessárias para inicializar o SDK Firebase no cliente. Sem elas, o app não poderá se conectar ao Firestore/Auth e algumas features estarão inativas.

### Variáveis de servidor (secretas)
- `OPENAI_API_KEY` — chave da OpenAI (servidor). Necessária para todos os flows de IA.
- `NEURODO_MODEL` — opcional, modelo padrão para IA (ex: `gpt-4o-mini`).

## Passos locais (desenvolvimento)
1. Crie um arquivo `.env.local` na raiz do projeto.
2. Adicione as variáveis listadas acima (NEXT_PUBLIC_* e OPENAI_API_KEY). Exemplo mínimo:

```
NEXT_PUBLIC_FIREBASE_API_KEY=abc123...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=1:...:web:...
OPENAI_API_KEY=sk-...
NEURODO_MODEL=gpt-4o-mini
```

3. Reinicie o servidor de desenvolvimento: `npm run dev`.
4. Abra `http://localhost:3000` e navegue até `/dashboard`.

## Passos para deploy (Vercel)
1. No painel do Vercel do projeto, vá em *Settings → Environment Variables*.
2. Adicione as variáveis `NEXT_PUBLIC_FIREBASE_*` como **Environment** `Production`, `Preview` e `Development` conforme necessário. Marque-as como públicas (prefixo NEXT_PUBLIC).  
3. Adicione `OPENAI_API_KEY` como variável **Secret** (sem `NEXT_PUBLIC_`), disponível apenas em ambiente de servidor.  
4. (Opcional) Adicione `NEURODO_MODEL` com valor padrão `gpt-4o-mini`.
5. Re-deploy do projeto.

## Verificação pós-deploy
- Verifique logs de inicialização no Vercel (build e runtime) para erros relacionados ao Firebase (`auth/invalid-api-key`) ou OpenAI (`401`/`invalid_api_key`).
- Acesse `/dashboard` e confirme que a página carrega (200). Se retornar 500, verifique os logs e as mensagens de erro (digest) no painel Vercel.

## Notas de resiliência (código)
- O app agora evita crash no SSR caso as variáveis `NEXT_PUBLIC_FIREBASE_*` não estejam definidas; contudo, funcionalidades que dependem do Firestore podem ficar inativas ou apresentar mensagens de erro amigáveis.
- Se ver `Firebase core services not available` nos logs, é sinal de que as variáveis públicas do Firebase não foram definidas.

## Contato e próximos passos
- Se preferir, posso: (a) adicionar checagens mais explícitas e toasts no frontend quando o Firebase estiver ausente, (b) automatizar um script de verificação de variáveis antes do deploy.

---
Gerado automaticamente pelo assistente. Mantê-lo atualizado com quaisquer novas variáveis necessárias no futuro.
