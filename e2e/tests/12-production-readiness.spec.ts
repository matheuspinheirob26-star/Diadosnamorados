/**
 * 12-production-readiness.spec.ts
 * Testes da Edge Function production-readiness.
 * Valida PASS, WARNING e FAIL para os diferentes cenários.
 */
import { test, expect, APIRequestContext } from '@playwright/test';
import { AdminPage } from '../pages/AdminPage';
import {
  mockProductionReadinessPass,
  mockProductionReadinessFail,
} from '../helpers/api-mock';

const FUNCTIONS_URL = process.env.SUPABASE_FUNCTIONS_URL || '';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

test.describe('Production Readiness — Auditoria de Prontidão', () => {
  // ── Testes via Mock ───────────────────────────────────────────────────────

  test('deve retornar status PASS com score 100 (mock)', async ({ page }) => {
    await page.goto('/');
    await mockProductionReadinessPass(page);
    
    const result = await page.evaluate(async ({ url, anon }) => {
      const baseUrl = url || window.location.origin;
      const res = await fetch(`${baseUrl}/functions/v1/production-readiness`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'apikey': anon },
      });
      return { status: res.status, body: await res.json() };
    }, { url: FUNCTIONS_URL, anon: ANON_KEY });
    
    expect(result.status).toBe(200);
    expect(result.body.status).toBe('PASS');
    expect(result.body.score).toBe(100);
    expect(result.body.checks).toHaveLength(6);
    expect(result.body.checks.every((c: any) => c.status === 'PASS')).toBe(true);
  });

  test('deve retornar status FAIL com score baixo (mock)', async ({ page }) => {
    await page.goto('/');
    await mockProductionReadinessFail(page, 'Menos de 2 super_admins ativos.');
    
    const result = await page.evaluate(async ({ url, anon }) => {
      const baseUrl = url || window.location.origin;
      const res = await fetch(`${baseUrl}/functions/v1/production-readiness`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'apikey': anon },
      });
      return { status: res.status, body: await res.json() };
    }, { url: FUNCTIONS_URL, anon: ANON_KEY });
    
    expect(result.status).toBe(200);
    expect(result.body.status).toBe('FAIL');
    expect(result.body.score).toBeLessThan(70);
    
    const failChecks = result.body.checks.filter((c: any) => c.status === 'FAIL');
    expect(failChecks.length).toBeGreaterThan(0);
  });

  test('deve retornar WARNING quando secret próximo de expirar (mock)', async ({ page }) => {
    await page.goto('/');
    
    await page.route('**/functions/v1/production-readiness', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          status: 'WARNING',
          score: 85,
          checks: [
            { name: 'MFA Compliance Check', status: 'PASS', message: 'OK' },
            { name: 'RLS Audit Check', status: 'PASS', message: 'OK' },
            { name: 'Secrets Age Audit', status: 'WARNING', message: 'gemini_api_key precisa de rotação.' },
            { name: 'Disaster Recovery Check', status: 'PASS', message: 'OK' },
            { name: 'Provider SLA Health Check', status: 'PASS', message: 'OK' },
            { name: 'Break-Glass Super Admins', status: 'PASS', message: 'OK' },
          ],
        }),
      });
    });
    
    const result = await page.evaluate(async ({ url, anon }) => {
      const baseUrl = url || window.location.origin;
      const res = await fetch(`${baseUrl}/functions/v1/production-readiness`, {
        method: 'GET',
        headers: { 'apikey': anon },
      });
      return await res.json();
    }, { url: FUNCTIONS_URL, anon: ANON_KEY });
    
    expect(result.status).toBe('WARNING');
    
    const secretsCheck = result.checks.find((c: any) => c.name === 'Secrets Age Audit');
    expect(secretsCheck?.status).toBe('WARNING');
  });

  test('deve ter FAIL em Break-Glass quando menos de 2 super_admins (mock)', async ({ page }) => {
    await page.goto('/');
    
    await page.route('**/functions/v1/production-readiness', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          status: 'FAIL',
          score: 60,
          checks: [
            { name: 'MFA Compliance Check', status: 'PASS', message: 'OK' },
            { name: 'RLS Audit Check', status: 'PASS', message: 'OK' },
            { name: 'Secrets Age Audit', status: 'PASS', message: 'OK' },
            { name: 'Disaster Recovery Check', status: 'PASS', message: 'OK' },
            { name: 'Provider SLA Health Check', status: 'PASS', message: 'OK' },
            {
              name: 'Break-Glass Super Admins',
              status: 'FAIL',
              message: 'Menos de 2 Super Admins ativos. Risco operacional para aprovações duplas.',
            },
          ],
        }),
      });
    });
    
    const result = await page.evaluate(async ({ url, anon }) => {
      const baseUrl = url || window.location.origin;
      const res = await fetch(`${baseUrl}/functions/v1/production-readiness`, {
        method: 'GET',
        headers: { 'apikey': anon },
      });
      return await res.json();
    }, { url: FUNCTIONS_URL, anon: ANON_KEY });
    
    const breakGlass = result.checks.find((c: any) => c.name === 'Break-Glass Super Admins');
    expect(breakGlass?.status).toBe('FAIL');
  });

  test('deve ter FAIL em MFA Compliance quando admin sem MFA (mock)', async ({ page }) => {
    await page.goto('/');
    await mockProductionReadinessFail(page, '2 administradores ativos não configuraram MFA/Recovery Codes.');
    
    const result = await page.evaluate(async ({ url, anon }) => {
      const baseUrl = url || window.location.origin;
      const res = await fetch(`${baseUrl}/functions/v1/production-readiness`, {
        method: 'GET',
        headers: { 'apikey': anon },
      });
      return await res.json();
    }, { url: FUNCTIONS_URL, anon: ANON_KEY });
    
    const mfaCheck = result.checks.find((c: any) => c.name === 'MFA Compliance Check');
    expect(mfaCheck?.status).toBe('FAIL');
  });

  test('resposta deve conter campos obrigatórios: status, score, checks (mock)', async ({ page }) => {
    await page.goto('/');
    await mockProductionReadinessPass(page);
    
    const result = await page.evaluate(async ({ url, anon }) => {
      const baseUrl = url || window.location.origin;
      const res = await fetch(`${baseUrl}/functions/v1/production-readiness`, {
        method: 'GET',
        headers: { 'apikey': anon },
      });
      return await res.json();
    }, { url: FUNCTIONS_URL, anon: ANON_KEY });
    
    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('checks');
    expect(Array.isArray(result.checks)).toBe(true);
  });

  // ── Testes Real Staging ───────────────────────────────────────────────────
  
  test('deve retornar resposta válida do endpoint real (staging)', async ({ playwright }) => {
    test.skip(!FUNCTIONS_URL, 'SUPABASE_FUNCTIONS_URL não configurada');
    
    const ctx: APIRequestContext = await playwright.request.newContext({
      baseURL: FUNCTIONS_URL,
      extraHTTPHeaders: {
        'apikey': SERVICE_ROLE_KEY || ANON_KEY,
        'Content-Type': 'application/json',
      },
    });
    
    const response = await ctx.get('/functions/v1/production-readiness');
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('score');
    expect(body).toHaveProperty('checks');
    expect(['PASS', 'WARNING', 'FAIL']).toContain(body.status);
    expect(body.score).toBeGreaterThanOrEqual(0);
    expect(body.score).toBeLessThanOrEqual(100);
    
    await ctx.dispose();
  });

  test('deve verificar saúde na aba Health Monitor do admin', async ({ page }) => {
    test.skip(!process.env.E2E_SUPER_ADMIN_PASSWORD, 'Credenciais E2E não configuradas');
    const adminPage = new AdminPage(page);
    await adminPage.goto();
    await adminPage.navigateToTab('health');
    
    await expect(page.getByText(/saúde|health|sla|monitor/i)).toBeVisible({ timeout: 8_000 });
  });
});
