# Guia de Deploy Seguro para Produção: Amour & Co.

Este guia descreve os procedimentos necessários para implantar as atualizações críticas de segurança e conformidade de banco de dados na loja Amour & Co., garantindo que a transição ocorra de forma segura e sem interrupções.

---

## 1. Execução do Script de Migração SQL no Supabase

Para ativar o Row Level Security (RLS), as funções reutilizáveis, os triggers de auditoria e as novas tabelas de segurança, execute o script de migração:

1. Acesse o **[Supabase Dashboard](https://supabase.com/dashboard/)** e entre no seu projeto correspondente.
2. No menu lateral esquerdo, clique em **SQL Editor** (ícone de terminal com `SQL`).
3. Clique em **New query** para abrir uma aba em branco.
4. Copie todo o conteúdo do arquivo local **[20260614000000_security_fixes.sql](file:///c:/Users/glaub/OneDrive/Área de Trabalho/loja dos dias dos namorados/supabase/migrations/20260614000000_security_fixes.sql)**.
5. Cole o código no painel do editor do Supabase.
6. Clique no botão **Run** (ou pressione `Ctrl + Enter` / `Cmd + Enter`) no canto inferior direito do painel.
7. Certifique-se de que a mensagem retornada no console seja `Success. No rows returned` ou similar.

---

## 2. Criação de Usuários no Supabase Auth

Como a autenticação mockada local foi desativada, cada administrador e gerente precisa ter uma conta legítima de usuário no Supabase:

1. No painel do seu projeto no Supabase, clique em **Authentication** (ícone de chave no menu lateral).
2. Clique na aba **Users**.
3. Clique em **Add user** e selecione a opção **Create user**.
4. Insira os dados do administrador:
   - **Email:** `admin@amour.com` (ou o e-mail real do administrador).
   - **Password:** Escolha uma senha segura e forte.
   - **Auto-confirm User?** Certifique-se de que esta opção esteja **marcada** para que o usuário não precise confirmar o cadastro por e-mail antes do primeiro login.
5. Clique em **Save**.
6. Repita o processo para os gerentes ou atendentes do chat (ex: e-mail do gerente com a role correspondente).
7. Copie o **User ID (UUID)** gerado pelo Supabase para cada um dos usuários criados (você precisará deles no próximo passo).

---

## 3. Vinculação de Usuários às Roles de Segurança

As permissões do banco e das Edge Functions são baseadas na tabela `user_roles`. Execute o comando abaixo no **SQL Editor** substituindo os UUIDs de exemplo pelos IDs copiados no passo anterior:

```sql
-- Limpa vínculos antigos para segurança
TRUNCATE TABLE public.user_roles;

-- Vincular Administrador Principal (Super Admin)
INSERT INTO public.user_roles (user_id, role)
VALUES ('INSIRA_AQUI_O_UUID_DO_ADMIN', 'super_admin');

-- Vincular Gerente de Loja (Manager)
INSERT INTO public.user_roles (user_id, role)
VALUES ('INSIRA_AQUI_O_UUID_DO_GERENTE', 'manager');

-- Vincular Atendentes de Suporte (Support)
-- INSERT INTO public.user_roles (user_id, role) VALUES ('UUID_DO_SUPORTE', 'support');
```

---

## 4. Deploy das Supabase Edge Functions

Abra o terminal do seu sistema operacional na pasta raiz do projeto (`loja dos dias dos namorados`) e certifique-se de estar logado na Supabase CLI (`supabase login`). Em seguida, execute o comando de deploy para as Edge Functions modificadas:

```bash
# 1. Deploy da função de chat da IA (JWT Obrigatório para admin)
supabase functions deploy chat-concierge --no-verify-jwt

# 2. Deploy da função de processamento de pagamentos (Validação interna)
supabase functions deploy process-payment --no-verify-jwt

# 3. Deploy da função de consulta de status de Pix
supabase functions deploy payment-status --no-verify-jwt

# 4. Deploy do unificador de webhooks com verificação criptográfica (Stripe / Mercado Pago)
supabase functions deploy webhooks-payments --no-verify-jwt
```
> [!NOTE]
> A flag `--no-verify-jwt` na linha de comando é necessária para permitir que as Edge Functions recebam tráfego público e requisições de webhooks externos (como notificações do Stripe e Mercado Pago) ou chamadas de clientes anônimos em checkout. A validação do JWT administrativo é feita via código internamente pelo middleware seguro nas rotas necessárias.

---

## 5. Configuração das Variáveis de Ambiente no Supabase (Secrets)

Para que os pagamentos e a inteligência artificial funcionem em modo produção segura, configure as chaves secretas no painel do Supabase.

Acesse o terminal do projeto e defina os segredos utilizando o comando `supabase secrets set`:

```bash
# Configuração da chave de Inteligência Artificial
supabase secrets set GEMINI_API_KEY="sua_chave_do_gemini"

# Configurações do Stripe
supabase secrets set STRIPE_SECRET_KEY="sk_live_..."
supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_..."

# Configurações do Mercado Pago
supabase secrets set MP_ACCESS_TOKEN="APP_USR-..."
supabase secrets set MP_WEBHOOK_SECRET="seu_token_mp_webhook"

# Configurações de outros Gateways (caso implementado no futuro)
supabase secrets set PAGARME_API_KEY="ak_live_..."
supabase secrets set EFI_CLIENT_ID="client_id_efi"
supabase secrets set EFI_CLIENT_SECRET="client_secret_efi"
supabase secrets set ASAAS_API_KEY="api_key_asaas"
```

---

## 6. Checklist de Homologação Pós-Deploy

Após concluir o deploy do SQL, das Edge Functions e do frontend, execute o seguinte roteiro de testes:

- [ ] **Login Admin Real:** Acesse `/admin/login`, insira as credenciais do administrador criadas no passo 2 e certifique-se de que a sessão abre normalmente.
- [ ] **Bloqueio de Usuários sem Role:** Crie um usuário no Supabase Auth que **não** esteja inserido na tabela `user_roles`. Tente realizar o login com ele na tela administrativa e certifique-se de que o sistema bloqueia o acesso com o erro: *"Acesso negado: você não tem permissão para acessar o painel administrativo"*.
- [ ] **Teste de Bloqueio RLS em Produtos:** Abra o console do navegador e tente atualizar um preço de produto de forma anônima. O Supabase deve retornar um erro de violação de RLS:
  ```javascript
  await supabase.from('products').update({ price: 0.01 }).eq('id', 'kit-namorados-premium');
  // Deve falhar ou atualizar 0 linhas
  ```
- [ ] **Teste de Bloqueio RLS em Pedidos:** No console do navegador, tente puxar todos os pedidos anonimamente:
  ```javascript
  const { data } = await supabase.from('orders').select('*');
  // data deve retornar vazio ou erro
  ```
- [ ] **Teste de Bloqueio RLS em Leads:** Tente buscar os contatos dos leads anonimamente:
  ```javascript
  const { data } = await supabase.from('leads').select('*');
  // data deve retornar vazio
  ```
- [ ] **Chat de IA Ativo:** Abra o widget de chat do Concierge de IA na vitrine e envie uma mensagem. Certifique-se de que ele responde fluentemente com base nos produtos cadastrados e que a chamada não expõe a chave de API no console.
- [ ] **Rejeição de Webhooks Falsos:** Envie uma chamada HTTP POST de teste diretamente à URL pública da Edge Function `webhooks-payments` simulando a aprovação de uma transação sem passar a assinatura criptográfica Stripe-Signature ou sem o ID de transação legítimo no Mercado Pago. O servidor deve responder com erro `401 Unauthorized` ou `400 Bad Request`.
- [ ] **Pagamento Sandbox:** Realize um pedido de teste no checkout em modo Pix de teste ou Cartão Sandbox e confirme se a transação é criada na tabela `transactions`.
- [ ] **Monitoramento de Auditoria:** Vá até a aba **Logs do Sistema** no painel administrativo e certifique-se de que os logs de login, alteração de gateways ou triggers de alteração de preço de produtos estão aparecendo e que o botão "Ver Detalhes" exibe a comparação JSON lado a lado.

---

## 7. Plano de Rollback de Emergência

Caso ocorra alguma falha crítica durante o deploy ou se alguma funcionalidade for interrompida, siga os passos abaixo para reverter a aplicação a um estado de contingência seguro. **Nunca reabra brechas desativando políticas ou restaurando credenciais hardcoded.**

### Passo A: Criar Backup antes da Migração (Prevenção)
Antes de rodar qualquer alteração no banco de dados no passo 1, certifique-se de gerar um backup da estrutura de banco e dados atual.
- **Via Supabase Dashboard:** Acesse *Database > Backups* e crie um snapshot manual.
- **Via Supabase CLI:** Execute o comando no seu terminal:
  ```bash
  supabase db dump --data-only > backup_dados_producao.sql
  ```

### Passo B: Aplicar Migração Reversa de Contingência (Down Migration)
Se alguma política de RLS bloquear as vendas ou a navegação do cliente e for necessário restaurar as permissões básicas:
1. **NÃO DESATIVE O RLS GLOBALMENTE** (comando `DISABLE ROW LEVEL SECURITY` está terminantemente proibido nas tabelas principais).
2. O RLS só pode ser relaxado temporariamente em tabelas isoladas se for estritamente necessário para depuração pontual, devendo ser reativado imediatamente.
3. Copie o script contido em **[20260614000000_security_fixes_down.sql](file:///c:/Users/glaub/OneDrive/Área de Trabalho/loja dos dias dos namorados/supabase/migrations/20260614000000_security_fixes_down.sql)**.
4. Execute-o no **SQL Editor** do Supabase. Esse script remove as restrições complexas e triggers, mas **mantém políticas de contingência seguras ativas**, evitando o vazamento público de pedidos ou leads.

### Passo C: Reversão de Código Frontend
Caso o fluxo visual ou os scripts do frontend quebrem:
1. **NUNCA RESTAURE CREDENCIAIS HARDCODED** ou reversões que reativem o botão de acesso administrativo mockado de demonstração.
2. A reversão por Git (`git checkout`) deve se limitar a arquivos de layout visual do frontend. O arquivo `src/context/AuthContext.tsx` deve permanecer integrado com o Supabase Auth.

### Passo D: Reversão de Edge Functions
Se os endpoints de pagamento ou chat falharem:
1. **NUNCA DEPLOIE VERSÕES SEM AUTENTICAÇÃO.**
2. Restaure o código da última versão estável a partir do repositório Git.
3. Execute o comando de deploy correspondente na CLI do Supabase para sobregravar as funções problemáticas com as assinaturas e checagens ativas.

### Passo E: Checklist de Validação Pós-Rollback
Logo após aplicar qualquer rollback emergencial, garanta que a segurança básica permanece de pé:
- [ ] O RLS continua ativo nas tabelas principais (tente acessar `/orders` anonimamente e certifique-se de que é bloqueado).
- [ ] O login admin continua exigindo a autenticação no Supabase Auth (e-mail/senha).
- [ ] O botão "Acesso Rápido Admin de Testes" continua removido da tela de login.
- [ ] A chave da API do Gemini continua oculta e não é exposta a visitantes anônimos.
- [ ] As assinaturas dos webhooks de pagamentos continuam sendo exigidas.
