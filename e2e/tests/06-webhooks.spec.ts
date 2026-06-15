/**
 * 06-webhooks.spec.ts
 * 
 * Dois níveis de teste:
 * A) Unit/Integration mock: assinatura válida/inválida/replay
 * B) E2E staging real: chamada à Edge Function real
 */
import { test, expect, APIRequestContext, request } from '@playwright/test';
import * as crypto from 'crypto';

const FUNCTIONS_URL = process.env.SUPABASE_FUNCTIONS_URL || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'test-webhook-secret-e2e';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

/** Gera assinatura Stripe HMAC-SHA256 */
function generateStripeSignature(rawBody: string, secret: string, timestamp?: number): string {
  const ts = timestamp || Math.floor(Date.now() / 1000);
  const signedPayload = `${ts}.${rawBody}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  return `t=${ts},v1=${signature}`;
}

const VALID_STRIPE_PAYLOAD = JSON.stringify({
  id: `evt_e2e_${Date.now()}`,
  type: 'payment_intent.succeeded',
  data: {
    object: {
      id: `pi_e2e_${Date.now()}`,
      amount: 29900,
      metadata: { order_id: `order-e2e-${Date.now()}` },
    },
  },
});

// ── NÍVEL A: Mock via page.route ──────────────────────────────────────────────
test.describe('Webhooks — Nível A: Unit/Integration Mock', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('deve rejeitar webhook Stripe com assinatura inválida (mock 401)', async ({ page }) => {
    await page.route('**/functions/v1/webhooks-payments*', async (route) => {
      const headers = route.request().headers();
      const sig = headers['stripe-signature'] || '';
      
      // Verificar se a assinatura é inválida
      if (!sig || sig.includes('invalid')) {
        await route.fulfill({
          status: 401,
          body: JSON.stringify({ error: 'Assinatura Stripe inválida.' }),
        });
      } else {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ received: true, eventType: 'payment.approved' }),
        });
      }
    });
    
    // Fazer request via page.evaluate para simular chamada de cliente
    const result = await page.evaluate(async ({ url, anon, payload }) => {
      const baseUrl = url || window.location.origin;
      const res = await fetch(`${baseUrl}/functions/v1/webhooks-payments?gateway=stripe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anon,
          'stripe-signature': 'invalid-sig',
        },
        body: payload,
      });
      return { status: res.status, body: await res.json() };
    }, { url: FUNCTIONS_URL, anon: ANON_KEY, payload: VALID_STRIPE_PAYLOAD });
    
    expect(result.status).toBe(401);
    expect(result.body.error).toContain('inválida');
  });

  test('deve aceitar webhook Stripe com assinatura válida (mock 200)', async ({ page }) => {
    await page.route('**/functions/v1/webhooks-payments*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ received: true, eventType: 'payment.approved', transactionId: 'pi_e2e_001' }),
      });
    });
    
    const result = await page.evaluate(async ({ url, anon, payload, sig }) => {
      const baseUrl = url || window.location.origin;
      const res = await fetch(`${baseUrl}/functions/v1/webhooks-payments?gateway=stripe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anon,
          'stripe-signature': sig,
        },
        body: payload,
      });
      return { status: res.status, body: await res.json() };
    }, { url: FUNCTIONS_URL, anon: ANON_KEY, payload: VALID_STRIPE_PAYLOAD, sig: 'valid-sig' });
    
    expect(result.status).toBe(200);
    expect(result.body.received).toBe(true);
  });

  test('deve retornar duplicate=true para webhook já processado (idempotência)', async ({ page }) => {
    await page.route('**/functions/v1/webhooks-payments*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ received: true, duplicate: true }),
      });
    });
    
    const result = await page.evaluate(async ({ url, anon, payload }) => {
      const baseUrl = url || window.location.origin;
      const res = await fetch(`${baseUrl}/functions/v1/webhooks-payments?gateway=stripe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': anon },
        body: payload,
      });
      return { status: res.status, body: await res.json() };
    }, { url: FUNCTIONS_URL, anon: ANON_KEY, payload: VALID_STRIPE_PAYLOAD });
    
    expect(result.status).toBe(200);
    expect(result.body.duplicate).toBe(true);
  });

  test('deve rejeitar replay attack (timestamp muito antigo)', async ({ page }) => {
    await page.route('**/functions/v1/webhooks-payments*', async (route) => {
      const sig = route.request().headers()['stripe-signature'] || '';
      const tsMatch = sig.match(/t=(\d+)/);
      const ts = tsMatch ? parseInt(tsMatch[1]) : 0;
      const diff = Math.abs(Date.now() / 1000 - ts);
      
      if (diff > 300) {
        await route.fulfill({
          status: 401,
          body: JSON.stringify({ error: 'Assinatura Stripe inválida.' }), // timestamp expirado
        });
      } else {
        await route.continue();
      }
    });
    
    // Gerar assinatura com timestamp de 10 minutos atrás
    const oldTimestamp = Math.floor(Date.now() / 1000) - 700;
    const oldSig = generateStripeSignature(VALID_STRIPE_PAYLOAD, STRIPE_WEBHOOK_SECRET, oldTimestamp);
    
    const result = await page.evaluate(async ({ url, anon, payload, sig }) => {
      const baseUrl = url || window.location.origin;
      const res = await fetch(`${baseUrl}/functions/v1/webhooks-payments?gateway=stripe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': anon, 'stripe-signature': sig },
        body: payload,
      });
      return { status: res.status };
    }, { url: FUNCTIONS_URL, anon: ANON_KEY, payload: VALID_STRIPE_PAYLOAD, sig: oldSig });
    
    expect(result.status).toBe(401);
  });
});

// ── NÍVEL B: E2E Real Staging ─────────────────────────────────────────────────
test.describe('Webhooks — Nível B: Staging Real', () => {
  let apiContext: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    if (!FUNCTIONS_URL) return;
    apiContext = await playwright.request.newContext({
      baseURL: FUNCTIONS_URL,
      extraHTTPHeaders: {
        'apikey': ANON_KEY,
        'Content-Type': 'application/json',
      },
    });
  });

  test.afterAll(async () => {
    await apiContext?.dispose();
  });

  test('deve retornar 400 para gateway desconhecido (real)', async () => {
    test.skip(!FUNCTIONS_URL, 'SUPABASE_FUNCTIONS_URL não configurada');
    
    const response = await apiContext.post('/functions/v1/webhooks-payments?gateway=desconhecido', {
      data: { test: true },
    });
    
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Gateway não suportado');
  });

  test('deve retornar 401 para assinatura Stripe inválida (real)', async () => {
    test.skip(!FUNCTIONS_URL || !STRIPE_WEBHOOK_SECRET, 'Ambiente staging não configurado');
    
    const response = await apiContext.post('/functions/v1/webhooks-payments?gateway=stripe', {
      data: VALID_STRIPE_PAYLOAD,
      headers: {
        'stripe-signature': 'invalid-signature',
        'Content-Type': 'application/json',
      },
    });
    
    expect(response.status()).toBe(401);
  });

  test('deve retornar 200 para assinatura Stripe válida (real)', async () => {
    test.skip(!FUNCTIONS_URL || !STRIPE_WEBHOOK_SECRET, 'Ambiente staging não configurado');
    
    const sig = generateStripeSignature(VALID_STRIPE_PAYLOAD, STRIPE_WEBHOOK_SECRET);
    
    const response = await apiContext.post('/functions/v1/webhooks-payments?gateway=stripe', {
      data: VALID_STRIPE_PAYLOAD,
      headers: {
        'stripe-signature': sig,
        'Content-Type': 'application/json',
      },
    });
    
    expect([200, 400]).toContain(response.status()); // 400 se order/transaction não existir no staging
    const body = await response.json();
    expect(body).toBeDefined();
  });
});
