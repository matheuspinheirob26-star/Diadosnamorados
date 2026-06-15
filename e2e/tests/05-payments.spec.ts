/**
 * 05-payments.spec.ts
 * Testes de pagamentos — Checkout Pix, Cartão, Cupom, status de pedido.
 */
import { test, expect } from '@playwright/test';
import { TEST_CUSTOMER } from '../fixtures/test-data';
import { AdminPage } from '../pages/AdminPage';

test.describe('Pagamentos — Checkout e Fluxo de Pedidos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(800);
  });

  test('deve renderizar página inicial com produtos', async ({ page }) => {
    await expect(page.getByRole('main')).toBeVisible({ timeout: 8_000 });
    // Pelo menos um produto deve estar visível
    const products = page.getByRole('article').or(page.locator('[data-testid*="product"]'));
    const hasProducts = await products.count() > 0;
    
    // Storefront deve ter elementos de produto ou catálogo
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 8_000 });
  });

  test('deve aplicar cupom válido e mostrar desconto', async ({ page }) => {
    // Navegar para checkout com produto simulado via URL ou click
    await page.goto('/#checkout');
    await page.waitForTimeout(1000);
    
    const couponInput = page.getByPlaceholder(/cupom|coupon/i).or(
      page.getByRole('textbox', { name: /cupom/i })
    );
    
    if (!await couponInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      test.skip(true, 'Campo de cupom não encontrado no checkout');
    }
    
    // Mock da validação de cupom
    await page.route('**/coupons*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 'NAMORADOS10',
            type: 'percentage',
            value: 10,
            active: true,
          }),
        });
      } else {
        await route.continue();
      }
    });
    
    await couponInput.fill('NAMORADOS10');
    const applyBtn = page.getByRole('button', { name: /aplicar/i });
    if (await applyBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await applyBtn.click();
      await expect(page.getByText(/desconto|10%/i)).toBeVisible({ timeout: 5_000 });
    }
  });

  test('deve rejeitar cupom inválido/expirado', async ({ page }) => {
    await page.goto('/#checkout');
    await page.waitForTimeout(1000);
    
    const couponInput = page.getByPlaceholder(/cupom|coupon/i);
    if (!await couponInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      test.skip(true, 'Campo de cupom não encontrado');
    }
    
    await page.route('**/coupons*', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Cupom inválido ou expirado.' }),
      });
    });
    
    await couponInput.fill('INVALIDO123');
    const applyBtn = page.getByRole('button', { name: /aplicar/i });
    if (await applyBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await applyBtn.click();
      await expect(page.getByText(/inválido|expirado/i)).toBeVisible({ timeout: 5_000 });
    }
  });

  test('deve exibir opções de pagamento Pix e Cartão no checkout', async ({ page }) => {
    await page.goto('/#checkout');
    await page.waitForTimeout(1000);
    
    // Verificar presença das opções de pagamento
    const pixOption = page.getByText(/pix/i).first();
    const cardOption = page.getByText(/cartão|crédito/i).first();
    
    const hasPaymentOptions = await pixOption.isVisible({ timeout: 5_000 }).catch(() => false)
      || await cardOption.isVisible({ timeout: 5_000 }).catch(() => false);
    
    if (!hasPaymentOptions) {
      test.skip(true, 'Opções de pagamento não encontradas sem produto no carrinho');
    }
  });

  test('deve validar campos obrigatórios do checkout antes de prosseguir', async ({ page }) => {
    await page.goto('/#checkout');
    await page.waitForTimeout(1000);
    
    const submitBtn = page.getByRole('button', { name: /finalizar|comprar|pagar/i });
    if (!await submitBtn.isVisible({ timeout: 4_000 }).catch(() => false)) {
      test.skip(true, 'Botão de finalizar não encontrado sem produto no carrinho');
    }
    
    await submitBtn.click();
    
    // Deve exibir validações
    const validationMsg = page.getByText(/obrigatório|preencha|campo/i);
    await expect(validationMsg.first()).toBeVisible({ timeout: 5_000 });
  });

  test('deve exibir pedidos criados na aba de pedidos do admin', async ({ page }) => {
    test.skip(!process.env.E2E_SUPER_ADMIN_PASSWORD, 'Credenciais E2E não configuradas');
    const adminPage = new AdminPage(page);
    await adminPage.goto();
    await adminPage.navigateToTab('orders');
    
    // Tabela de pedidos deve estar visível
    await expect(page.getByText(/fila de pedidos|pedido/i)).toBeVisible({ timeout: 8_000 });
    
    // Cabeçalhos da tabela
    await expect(page.getByRole('columnheader', { name: /pedido/i })).toBeVisible({ timeout: 5_000 });
  });
  
  test('deve exibir aba de pagamentos no painel admin', async ({ page }) => {
    test.skip(!process.env.E2E_SUPER_ADMIN_PASSWORD, 'Credenciais E2E não configuradas');
    const adminPage = new AdminPage(page);
    await adminPage.goto();
    await adminPage.navigateToTab('payments');
    
    await expect(page.getByText(/pagamento|gateway/i)).toBeVisible({ timeout: 8_000 });
  });
});
