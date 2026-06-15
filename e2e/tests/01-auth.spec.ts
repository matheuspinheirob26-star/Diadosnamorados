/**
 * 01-auth.spec.ts
 * Testes de Autenticação — Login, Logout, Bloqueio por tentativas, Redirect protegido.
 * NÃO usa storageState — autentica do zero para validar o fluxo real.
 */
import { test, expect } from '@playwright/test';
import { AdminLoginPage } from '../pages/AdminLoginPage';
import { AdminPage } from '../pages/AdminPage';
import { TEST_USERS } from '../fixtures/test-data';

test.use({ storageState: { cookies: [], origins: [] } }); // sem auth prévia

test.describe('Autenticação', () => {
  let loginPage: AdminLoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new AdminLoginPage(page);
    await loginPage.goto();
  });

  test('deve renderizar formulário de login com campos corretos', async ({ page }) => {
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
    await expect(loginPage.submitButton).toBeEnabled();
    await expect(loginPage.emergencyLink).toBeVisible();
  });

  test('deve exibir erro ao enviar formulário vazio', async ({ page }) => {
    await loginPage.submit();
    await loginPage.expectError('Preencha e-mail e senha');
  });

  test('deve exibir erro com credenciais inválidas', async () => {
    await loginPage.login('naoexiste@invalido.com', 'senha-errada-123');
    await loginPage.expectError();
  });

  test('deve incrementar contador de tentativas após falhas consecutivas', async ({ page }) => {
    for (let i = 0; i < 3; i++) {
      await loginPage.login('naoexiste@invalido.com', 'errada');
      await page.waitForTimeout(500);
    }
    // Após 3+ tentativas, aviso de tentativas restantes aparece
    await expect(page.getByText(/tentativa|tentativas restante/i)).toBeVisible({ timeout: 5_000 });
  });

  test('deve bloquear após 5 tentativas e exibir countdown', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await loginPage.fillCredentials('errado@test.com', 'errada');
      await loginPage.submit();
      await page.waitForTimeout(300);
    }
    // Botão deve estar desabilitado
    await expect(loginPage.submitButton).toBeDisabled({ timeout: 5_000 });
    // Countdown deve aparecer
    await expect(page.getByText(/Desbloqueio em/i)).toBeVisible({ timeout: 5_000 });
  });

  test('deve redirecionar para admin quando não autenticado', async ({ page }) => {
    await page.goto('/#admin');
    // Sem autenticação deve cair no login
    await expect(page.getByTestId('admin-login-email')).toBeVisible({ timeout: 10_000 });
  });

  test('deve exibir link de acesso de contingência', async ({ page }) => {
    await expect(loginPage.emergencyLink).toBeVisible();
    await loginPage.emergencyLink.click();
    // Deve ir para página de emergência
    await expect(page.getByRole('heading', { name: 'Acesso de Contingência' })).toBeVisible({ timeout: 8_000 });
  });

  test('deve fazer login com credenciais válidas e redirecionar para dashboard', async ({ page }) => {
    // Este teste requer ambiente staging configurado
    test.skip(!TEST_USERS.superAdmin.password, 'Credenciais E2E não configuradas no .env.test');
    
    const adminPage = new AdminPage(page);
    await loginPage.login(TEST_USERS.superAdmin.email, TEST_USERS.superAdmin.password);
    
    // Pode precisar de MFA
    const mfaVisible = await loginPage.mfaTokenInput.isVisible({ timeout: 3_000 }).catch(() => false);
    if (mfaVisible) {
      test.skip(true, 'MFA necessário — configure E2E_MFA_TOTP_SECRET');
    }

    await expect(adminPage.logoutButton).toBeVisible({ timeout: 15_000 });
  });

  test('deve fazer logout com sucesso', async ({ page }) => {
    test.skip(!TEST_USERS.superAdmin.password, 'Credenciais E2E não configuradas');
    
    const adminPage = new AdminPage(page);
    await loginPage.login(TEST_USERS.superAdmin.email, TEST_USERS.superAdmin.password);
    
    const mfaVisible = await loginPage.mfaTokenInput.isVisible({ timeout: 3_000 }).catch(() => false);
    if (mfaVisible) test.skip(true, 'MFA necessário');

    await adminPage.logout();
    // Deve voltar para login
    await expect(loginPage.emailInput).toBeVisible({ timeout: 8_000 });
  });
});
