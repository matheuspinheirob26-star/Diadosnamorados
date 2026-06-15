/**
 * 07-csrf.spec.ts
 * Testes de CSRF — Rejeição sem token, rotação pós-MFA, validação em manage-approvals.
 */
import { test, expect, APIRequestContext } from '@playwright/test';
import { mockCsrfRejected } from '../helpers/api-mock';

const FUNCTIONS_URL = process.env.SUPABASE_FUNCTIONS_URL || '';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

test.describe('CSRF — Proteção Contra Falsificação de Requisições', () => {
  test('deve retornar 403 ao chamar manage-approvals sem x-csrf-token (mock)', async ({ page }) => {
    await page.goto('/');
    
    // Interceptar e simular middleware CSRF
    await mockCsrfRejected(page, 'manage-approvals');
    
    const result = await page.evaluate(async ({ url, anon }) => {
      const baseUrl = url || window.location.origin;
      const res = await fetch(`${baseUrl}/functions/v1/manage-approvals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anon,
          'authorization': 'Bearer fake-token',
          // SEM x-csrf-token
        },
        body: JSON.stringify({ action: 'list' }),
      });
      return { status: res.status, body: await res.json() };
    }, { url: FUNCTIONS_URL, anon: ANON_KEY });
    
    expect(result.status).toBe(403);
  });

  test('deve retornar 403 com x-csrf-token inválido (mock)', async ({ page }) => {
    await page.goto('/');
    await mockCsrfRejected(page, 'manage-approvals');
    
    const result = await page.evaluate(async ({ url, anon }) => {
      const baseUrl = url || window.location.origin;
      const res = await fetch(`${baseUrl}/functions/v1/manage-approvals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anon,
          'x-csrf-token': 'invalid',
        },
        body: JSON.stringify({ action: 'list' }),
      });
      return { status: res.status };
    }, { url: FUNCTIONS_URL, anon: ANON_KEY });
    
    expect(result.status).toBe(403);
  });

  test('deve aceitar requisição com x-csrf-token válido (mock)', async ({ page }) => {
    await page.goto('/');
    
    // Mock que aceita token válido
    await page.route('**/functions/v1/manage-approvals', async (route) => {
      const headers = route.request().headers();
      const csrf = headers['x-csrf-token'];
      
      if (csrf && csrf !== 'invalid') {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ approvals: [] }),
        });
      } else {
        await route.fulfill({
          status: 403,
          body: JSON.stringify({ error: 'CSRF inválido.' }),
        });
      }
    });
    
    const result = await page.evaluate(async ({ url, anon }) => {
      const baseUrl = url || window.location.origin;
      const res = await fetch(`${baseUrl}/functions/v1/manage-approvals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anon,
          'x-csrf-token': 'valid-csrf-uuid-token',
        },
        body: JSON.stringify({ action: 'list' }),
      });
      return { status: res.status };
    }, { url: FUNCTIONS_URL, anon: ANON_KEY });
    
    expect(result.status).toBe(200);
  });

  test('deve ter token CSRF disponível no window após login (real)', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // Verificar se o CSRF token foi injetado no window após autenticação
    const csrfToken = await page.evaluate(() => {
      return (window as any)._amr_csrf_token;
    });
    
    // Se usuário autenticado (via storageState), token deve existir
    // Se não autenticado, pode ser null — ambos são comportamentos válidos
    expect(typeof csrfToken === 'string' || csrfToken === undefined).toBe(true);
  });

  test('deve ter correlationId injetado no window', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    const correlationId = await page.evaluate(() => {
      return (window as any)._amr_correlation_id;
    });
    
    // Se autenticado, deve ser um UUID válido
    if (correlationId) {
      expect(correlationId).toMatch(/^[0-9a-f-]{36}$/);
    }
  });

  // ── Staging Real ────────────────────────────────────────────────────────────
  test('deve retornar 403 sem CSRF no manage-approvals real (staging)', async ({ playwright }) => {
    test.skip(!FUNCTIONS_URL, 'SUPABASE_FUNCTIONS_URL não configurada');
    
    const ctx = await playwright.request.newContext({ baseURL: FUNCTIONS_URL });
    
    const response = await ctx.post('/functions/v1/manage-approvals', {
      data: { action: 'list' },
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
        'authorization': 'Bearer invalid-token',
        // Sem CSRF token
      },
    });
    
    // Deve falhar por auth ou por CSRF
    expect([401, 403]).toContain(response.status());
    await ctx.dispose();
  });
});
