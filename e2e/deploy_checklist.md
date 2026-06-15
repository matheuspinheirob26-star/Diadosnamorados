# Checklist de Deploy para Produção — Amour & Co. v4.2

> Última atualização: 2026-06-14  
> Responsável: _[NOME]_  
> Status: ⬜ Pendente / ✅ Concluído / ❌ Bloqueio

---

## 1. Pré-Deploy — Banco de Dados (Supabase)

### 1.1 Migrations
- [ ] Executar `20260609000000_initial_schema.sql` (base)
- [ ] Executar `20260614000000_security_fixes.sql`
- [ ] Executar `20260614000001_users_and_permissions.sql`
- [ ] Executar `20260614000002_enterprise_security.sql`
- [ ] Executar `20260614000003_enterprise_hardening.sql`
- [ ] Verificar que todas as tabelas novas existem:
  - [ ] `secrets_governance`
  - [ ] `system_backups`
  - [ ] `maintenance_config`
  - [ ] `maintenance_whitelist_ips`
  - [ ] `provider_health_logs`
  - [ ] `lgpd_requests`
  - [ ] `rate_limits`
  - [ ] `mfa_recovery_events`
  - [ ] `double_approvals`
  - [ ] `processed_webhooks`

### 1.2 RLS
- [ ] Confirmar RLS habilitado em **todas** as tabelas críticas
- [ ] Testar acesso anon via Supabase Studio — deve retornar vazio ou 403
- [ ] Confirmar que `is_super_admin()` function existe no banco

### 1.3 Dados Iniciais
- [ ] Criar **ao menos 2 usuários super_admin** no Supabase Auth + `user_roles`
- [ ] Verificar que nenhum usuário tem `deleted_at` preenchido incorretamente
- [ ] Inserir registro inicial em `maintenance_config` (singleton, `is_active = false`)

---

## 2. Edge Functions

### 2.1 Deploy
- [ ] `supabase functions deploy manage-users`
- [ ] `supabase functions deploy manage-approvals`
- [ ] `supabase functions deploy manage-lgpd`
- [ ] `supabase functions deploy emergency-auth`
- [ ] `supabase functions deploy health-check`
- [ ] `supabase functions deploy production-readiness`
- [ ] `supabase functions deploy webhooks-payments`
- [ ] `supabase functions deploy process-payment`
- [ ] `supabase functions deploy payment-status`
- [ ] `supabase functions deploy chat-concierge`

### 2.2 Secrets (Variáveis de Ambiente das Functions)
- [ ] `SUPABASE_URL` — URL do projeto produção
- [ ] `SUPABASE_ANON_KEY` — Chave anônima produção
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — Chave service role (secreta)
- [ ] `STRIPE_WEBHOOK_SECRET` — Secret do webhook Stripe produção
- [ ] `STRIPE_SECRET_KEY` — Chave secreta Stripe
- [ ] `MP_ACCESS_TOKEN` — Token Mercado Pago produção
- [ ] `GEMINI_API_KEY` — API Key do Gemini

### 2.3 Verificação
- [ ] Chamar `production-readiness` em produção após deploy — score deve ser ≥ 90
- [ ] Verificar que `webhooks-payments` responde corretamente ao ping do gateway
- [ ] Confirmar que `manage-approvals` retorna 403 sem CSRF token válido

---

## 3. Frontend (Vercel / CDN)

### 3.1 Build
- [ ] `npm run build` — confirmar 0 erros TypeScript
- [ ] Verificar tamanho do bundle: `dist/assets/index.js` gzip < 300 kB
- [ ] Confirmar que `dist/index.html` contém as meta tags CSP corretas

### 3.2 Variáveis de Ambiente (Vercel)
- [ ] `VITE_SUPABASE_URL` — URL do projeto produção
- [ ] `VITE_SUPABASE_ANON_KEY` — Chave anônima produção
- [ ] `VITE_GEMINI_API_KEY` (se exposta no cliente)

### 3.3 Headers de Segurança (vercel.json)
- [ ] `Content-Security-Policy` — verificar que está configurado
- [ ] `Strict-Transport-Security` (HSTS) — max-age ≥ 63072000
- [ ] `X-Frame-Options: DENY`
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] `Permissions-Policy` — camera, mic, geolocation bloqueados

### 3.4 Domínio e SSL
- [ ] Domínio customizado configurado e propagado
- [ ] Certificado SSL válido (Let's Encrypt / Vercel)
- [ ] Redirect HTTP → HTTPS ativo
- [ ] HSTS preload enviado

---

## 4. Segurança

### 4.1 Autenticação e MFA
- [ ] MFA **obrigatório** para super_admin e admin — confirmar na UI
- [ ] Timeout de sessão configurado (8h) — confirmar expiração
- [ ] Codes de recuperação distribuídos para todos os super_admins
- [ ] Emergency Break-Glass Access testado e documentado

### 4.2 CSRF
- [ ] Confirmar que `x-csrf-token` é validado em `manage-approvals` em produção
- [ ] Confirmar rotação de token após MFA completado

### 4.3 Rate Limiting
- [ ] Tabela `rate_limits` com índice composto em `(composite_key, window_start)`
- [ ] Thresholds revisados: ≤ 20 req/min por IP para endpoints críticos

### 4.4 Webhooks
- [ ] Assinatura HMAC verificada para todos os gateways
- [ ] Proteção contra replay attack (janela 5 min)
- [ ] Idempotência via `processed_webhooks` table

---

## 5. Governance e Compliance

### 5.1 LGPD
- [ ] Endpoint `manage-lgpd/export` testado com email real de teste
- [ ] Endpoint `manage-lgpd/anonymize` testado — confirmar que dados não são recuperáveis
- [ ] Auditoria de exportação registrada em `audit_logs`

### 5.2 Double Approvals (2-Man Rule)
- [ ] Regra de auto-aprovação bloqueada no backend
- [ ] Regra de mesmo IP bloqueada (exceto localhost)
- [ ] Expiração de 24h configurada e testada

### 5.3 Secrets Governance
- [ ] Todos os secrets registrados em `secrets_governance`
- [ ] Alertas de rotação configurados (60/90/120 dias)
- [ ] Responsáveis (owners) documentados para cada secret

---

## 6. Monitoramento e Observabilidade

- [ ] Health check endpoint (`/functions/v1/health-check`) respondendo
- [ ] `production-readiness` score ≥ 90 antes do go-live
- [ ] `security_events` table acessível pelo painel de Eventos de Segurança
- [ ] Alerta configurado para eventos CRITICAL (e-mail/Slack/PagerDuty)
- [ ] Backup automático do Supabase habilitado e verificado
- [ ] Registro inicial em `system_backups` confirmado

---

## 7. Testes Finais Pré-Go-Live

- [ ] ✅ Suíte E2E Playwright executada — taxa ≥ 95%
- [ ] ✅ 100% dos testes críticos de segurança passando
- [ ] ✅ Relatório de homologação (`homologation_report.md`) preenchido
- [ ] ✅ Revisão manual do fluxo de login → MFA → dashboard
- [ ] ✅ Revisão manual do fluxo de checkout → pagamento → confirmação
- [ ] ✅ Revisão manual do fluxo LGPD (export + anonymize)
- [ ] ✅ Teste de double approval com 2 administradores reais
- [ ] ✅ Teste de break-glass access documentado

---

## 8. Rollback Plan

- [ ] Snapshot do banco antes do deploy documentado
- [ ] Versão anterior do frontend disponível para rollback no Vercel
- [ ] Migrations de rollback (`*_down.sql`) testadas em staging
- [ ] Responsável pelo rollback identificado e de plantão

---

## Assinaturas de Aprovação

| Papel | Nome | Data | Assinatura |
|-------|------|------|------------|
| CTO / Tech Lead | | | |
| QA / Homologação | | | |
| Operações | | | |

---

**DEPLOY AUTORIZADO:** ⬜ SIM / ⬜ NÃO

*Amour & Co. — Checklist de Deploy v4.2*
