/**
 * 04-lgpd.spec.ts
 * Testes LGPD — Export de dados, anonimização, auditoria.
 */
import { test, expect } from '@playwright/test';
import { AdminPage } from '../pages/AdminPage';
import { mockLgpdExportSuccess } from '../helpers/api-mock';
import { LGPD_TEST_EMAIL } from '../fixtures/test-data';

test.describe('LGPD — Privacidade e Conformidade', () => {
  let adminPage: AdminPage;

  test.beforeEach(async ({ page }) => {
    test.skip(!process.env.E2E_SUPER_ADMIN_PASSWORD, 'Credenciais E2E não configuradas');
    adminPage = new AdminPage(page);
    await adminPage.goto();
    await adminPage.navigateToTab('lgpd');
    await page.waitForTimeout(600);
  });

  test('deve carregar aba LGPD sem erros', async ({ page }) => {
    await expect(page.getByText(/privacidade|conformidade lgpd/i)).toBeVisible({ timeout: 8_000 });
    await expect(page.getByTestId('lgpd-email-input')).toBeVisible();
    await expect(page.getByTestId('lgpd-export-btn')).toBeVisible();
    await expect(page.getByTestId('lgpd-anonymize-btn')).toBeVisible();
  });

  test('deve manter botão de anonimizar desabilitado com campo vazio', async ({ page }) => {
    await expect(page.getByTestId('lgpd-anonymize-btn')).toBeDisabled();
  });

  test('deve habilitar botão de anonimizar ao preencher email', async ({ page }) => {
    await page.getByTestId('lgpd-email-input').fill(LGPD_TEST_EMAIL);
    await expect(page.getByTestId('lgpd-anonymize-btn')).toBeEnabled();
  });

  test('deve exportar dados via mock e exibir preview JSON', async ({ page }) => {
    await mockLgpdExportSuccess(page, LGPD_TEST_EMAIL);
    
    await page.getByTestId('lgpd-email-input').fill(LGPD_TEST_EMAIL);
    await page.getByTestId('lgpd-export-btn').click();
    
    // Aguardar resposta mockada
    await expect(page.getByTestId('lgpd-success')).toBeVisible({ timeout: 8_000 });
    
    // Preview JSON deve aparecer com dados do cliente
    await expect(page.getByText(/exported_at|Dados gerados em/i)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/order-001|orders/i)).toBeVisible({ timeout: 5_000 });
  });

  test('deve exibir botão de download JSON após exportação bem-sucedida', async ({ page }) => {
    await mockLgpdExportSuccess(page, LGPD_TEST_EMAIL);
    
    await page.getByTestId('lgpd-email-input').fill(LGPD_TEST_EMAIL);
    await page.getByTestId('lgpd-export-btn').click();
    
    await expect(page.getByText(/Baixar JSON/i)).toBeVisible({ timeout: 8_000 });
  });

  test('deve exibir modal de confirmação ao tentar anonimizar', async ({ page }) => {
    await page.getByTestId('lgpd-email-input').fill(LGPD_TEST_EMAIL);
    
    // Interceptar o dialog de confirm
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('IRREVERSÍVEL');
      await dialog.dismiss(); // Cancelar a anonimização no teste
    });
    
    await page.getByTestId('lgpd-anonymize-btn').click();
    // O dialog foi interceptado — não deve aparecer erro de função
    await page.waitForTimeout(500);
  });

  test('deve exibir mensagem de sucesso após anonimização (mock)', async ({ page }) => {
    // Mock da edge function de anonimização
    await page.route('**/functions/v1/manage-lgpd', async (route) => {
      const body = await route.request().postDataJSON();
      if (body?.action === 'anonymize') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Os dados pessoais foram anonimizados irreversivelmente.',
          }),
        });
      } else {
        await route.continue();
      }
    });
    
    await page.getByTestId('lgpd-email-input').fill(LGPD_TEST_EMAIL);
    
    // Aceitar o confirm dialog
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });
    
    await page.getByTestId('lgpd-anonymize-btn').click();
    await expect(page.getByTestId('lgpd-success')).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/anonimizados irreversivelmente/i)).toBeVisible();
  });

  test('deve exibir erro ao exportar com email não cadastrado', async ({ page }) => {
    // Mock retorna erro
    await page.route('**/functions/v1/manage-lgpd', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Nenhum registro encontrado para este email.' }),
      });
    });
    
    await page.getByTestId('lgpd-email-input').fill('naocadastrado@nenhum.com');
    await page.getByTestId('lgpd-export-btn').click();
    
    await expect(page.getByTestId('lgpd-error')).toBeVisible({ timeout: 8_000 });
  });
});
