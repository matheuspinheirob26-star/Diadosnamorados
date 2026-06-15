/**
 * api-mock.ts
 * Helpers para interceptar chamadas às Edge Functions via page.route()
 * Permite testes determinísticos sem depender do Supabase staging.
 */
import { Page, Route } from '@playwright/test';

const FUNCTIONS_URL_PATTERN = /\/functions\/v1\//;

/** Interceptar edge function e retornar resposta mockada */
export async function mockEdgeFunction(
  page: Page,
  functionName: string,
  responseBody: object,
  statusCode = 200
): Promise<void> {
  await page.route(`**/functions/v1/${functionName}`, async (route: Route) => {
    await route.fulfill({
      status: statusCode,
      contentType: 'application/json',
      body: JSON.stringify(responseBody),
    });
  });
}

/** Mock: CSRF rejeitado (403) */
export async function mockCsrfRejected(page: Page, functionName: string): Promise<void> {
  await page.route(`**/functions/v1/${functionName}`, async (route: Route) => {
    const req = route.request();
    const csrfToken = req.headers()['x-csrf-token'];
    
    if (!csrfToken || csrfToken === 'invalid') {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Token CSRF inválido ou ausente.' }),
      });
    } else {
      await route.continue();
    }
  });
}

/** Mock: Rate limit atingido (429) */
export async function mockRateLimited(page: Page, functionName: string): Promise<void> {
  let callCount = 0;
  const threshold = 5;
  
  await page.route(`**/functions/v1/${functionName}`, async (route: Route) => {
    callCount++;
    if (callCount > threshold) {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Taxa de requisições excedida. Tente novamente em 60 segundos.',
          retryAfter: 60,
        }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    }
  });
}

/** Mock: Manage-LGPD Export bem sucedido */
export async function mockLgpdExportSuccess(page: Page, email: string): Promise<void> {
  await mockEdgeFunction(page, 'manage-lgpd', {
    exported_at: new Date().toISOString(),
    customer_email: email,
    data: {
      orders: [
        { id: 'order-001', total: 299, status: 'paid', customer_email: email },
      ],
      leads: [{ id: 'lead-001', email, name: 'Cliente Teste' }],
      chat_leads: [],
    },
  });
}

/** Mock: Double Approvals — lista de pendentes */
export async function mockApprovalsListSuccess(page: Page): Promise<void> {
  await mockEdgeFunction(page, 'manage-approvals', {
    approvals: [
      {
        id: 'approval-e2e-001',
        target_type: 'user_roles_promote',
        target_id: 'user-e2e-001',
        status: 'pending',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 3600_000).toISOString(),
        payload: { role: 'admin' },
      },
    ],
  });
}

/** Mock: Manage-Users listar operadores */
export async function mockUsersListSuccess(page: Page): Promise<void> {
  await mockEdgeFunction(page, 'manage-users', {
    users: [
      {
        id: 'user-e2e-001',
        email: 'operador@staging.amour.com',
        role: 'manager',
        status: 'ativo',
        name: 'Operador Teste',
      },
    ],
  });
}

/** Mock: Webhook com assinatura válida */
export async function mockWebhookValid(page: Page): Promise<void> {
  await mockEdgeFunction(page, 'webhooks-payments', {
    received: true,
    eventType: 'payment.approved',
    transactionId: 'pi_test_E2E_001',
  });
}

/** Mock: Webhook com assinatura inválida */
export async function mockWebhookInvalid(page: Page): Promise<void> {
  await mockEdgeFunction(page, 'webhooks-payments', {
    error: 'Assinatura Stripe inválida.',
  }, 401);
}

/** Mock: Production Readiness — PASS */
export async function mockProductionReadinessPass(page: Page): Promise<void> {
  await mockEdgeFunction(page, 'production-readiness', {
    status: 'PASS',
    score: 100,
    checks: [
      { name: 'MFA Compliance Check', status: 'PASS', message: 'Todos os admins têm MFA.' },
      { name: 'RLS Audit Check', status: 'PASS', message: 'RLS habilitado em todas as tabelas.' },
      { name: 'Secrets Age Audit', status: 'PASS', message: 'Secrets dentro da validade.' },
      { name: 'Disaster Recovery Check', status: 'PASS', message: 'Backup verificado nas últimas 24h.' },
      { name: 'Provider SLA Health Check', status: 'PASS', message: 'Todos os provedores operando.' },
      { name: 'Break-Glass Super Admins', status: 'PASS', message: '2+ super admins ativos.' },
    ],
  });
}

/** Mock: Production Readiness — FAIL */
export async function mockProductionReadinessFail(page: Page, reason: string): Promise<void> {
  await mockEdgeFunction(page, 'production-readiness', {
    status: 'FAIL',
    score: 45,
    checks: [
      { name: 'MFA Compliance Check', status: 'FAIL', message: reason },
      { name: 'RLS Audit Check', status: 'PASS', message: 'RLS OK.' },
      { name: 'Break-Glass Super Admins', status: 'FAIL', message: 'Menos de 2 Super Admins ativos.' },
    ],
  });
}
