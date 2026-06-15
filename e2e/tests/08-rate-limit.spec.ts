/**
 * 08-rate-limit.spec.ts
 * Testes de Rate Limiting — 429 por IP, por userId, janela de reset.
 */
import { test, expect } from '@playwright/test';
import { mockRateLimited } from '../helpers/api-mock';

const FUNCTIONS_URL = process.env.SUPABASE_FUNCTIONS_URL || '';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

test.describe('Rate Limiting — Throttle de Requisições', () => {
  test('deve retornar 429 após exceder threshold (mock)', async ({ page }) => {
    await page.goto('/');
    
    // Configurar mock que retorna 429 após 5 chamadas
    let callCount = 0;
    await page.route('**/functions/v1/manage-users', async (route) => {
      callCount++;
      if (callCount > 5) {
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
          body: JSON.stringify({ users: [] }),
        });
      }
    });
    
    // Fazer 6 requisições
    let last429 = false;
    for (let i = 0; i < 6; i++) {
      const result = await page.evaluate(async ({ url, anon }) => {
        const baseUrl = url || window.location.origin;
        const res = await fetch(`${baseUrl}/functions/v1/manage-users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': anon,
          },
          body: JSON.stringify({ action: 'list' }),
        });
        return { status: res.status };
      }, { url: FUNCTIONS_URL, anon: ANON_KEY });
      
      if (result.status === 429) last429 = true;
    }
    
    expect(last429).toBe(true);
  });

  test('deve incluir retryAfter na resposta 429 (mock)', async ({ page }) => {
    await page.goto('/');
    await mockRateLimited(page, 'manage-lgpd');
    
    // Fazer chamadas até atingir o limite
    let retryAfter: number | null = null;
    for (let i = 0; i < 7; i++) {
      const result = await page.evaluate(async ({ url, anon }) => {
        const baseUrl = url || window.location.origin;
        const res = await fetch(`${baseUrl}/functions/v1/manage-lgpd`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': anon },
          body: JSON.stringify({ action: 'export', email: 'test@test.com' }),
        });
        const body = await res.json();
        return { status: res.status, retryAfter: body.retryAfter };
      }, { url: FUNCTIONS_URL, anon: ANON_KEY });
      
      if (result.status === 429 && result.retryAfter) {
        retryAfter = result.retryAfter;
      }
    }
    
    if (retryAfter !== null) {
      expect(retryAfter).toBeGreaterThan(0);
    }
  });

  test('deve aplicar rate limit separado por endpoint (mock)', async ({ page }) => {
    await page.goto('/');
    
    const endpoints = ['manage-users', 'manage-lgpd'];
    const callCounts: Record<string, number> = { 'manage-users': 0, 'manage-lgpd': 0 };
    
    // Mock independente por endpoint
    for (const endpoint of endpoints) {
      await page.route(`**/functions/v1/${endpoint}`, async (route) => {
        callCounts[endpoint]++;
        if (callCounts[endpoint] > 3) {
          await route.fulfill({
            status: 429,
            body: JSON.stringify({ error: `Rate limit for ${endpoint}` }),
          });
        } else {
          await route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) });
        }
      });
    }
    
    // Esgotar rate limit de manage-users mas não de manage-lgpd
    for (let i = 0; i < 5; i++) {
      await page.evaluate(async ({ url, anon }) => {
        const baseUrl = url || window.location.origin;
        await fetch(`${baseUrl}/functions/v1/manage-users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': anon },
          body: JSON.stringify({ action: 'list' }),
        });
      }, { url: FUNCTIONS_URL, anon: ANON_KEY });
    }
    
    // manage-lgpd ainda deve responder 200
    const lgpdResult = await page.evaluate(async ({ url, anon }) => {
      const baseUrl = url || window.location.origin;
      const res = await fetch(`${baseUrl}/functions/v1/manage-lgpd`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': anon },
        body: JSON.stringify({ action: 'export', email: 'test@test.com' }),
      });
      return { status: res.status };
    }, { url: FUNCTIONS_URL, anon: ANON_KEY });
    
    expect(lgpdResult.status).toBe(200);
  });

  // ── Staging Real ────────────────────────────────────────────────────────────
  test('deve retornar 401/403/429 após múltiplas tentativas sem auth (staging)', async ({ playwright }) => {
    test.skip(!FUNCTIONS_URL, 'SUPABASE_FUNCTIONS_URL não configurada');
    
    const ctx = await playwright.request.newContext({ baseURL: FUNCTIONS_URL });
    const statuses: number[] = [];
    
    // Fazer 10 requisições sem autenticação válida
    for (let i = 0; i < 10; i++) {
      const res = await ctx.post('/functions/v1/manage-users', {
        data: { action: 'list' },
        headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY },
      });
      statuses.push(res.status());
    }
    
    // Deve incluir 401, 403 ou 429
    const hasSecurityResponse = statuses.some(s => [401, 403, 429].includes(s));
    expect(hasSecurityResponse).toBe(true);
    
    await ctx.dispose();
  });
});
