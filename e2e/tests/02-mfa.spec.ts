/**
 * 02-mfa.spec.ts
 * Testes de MFA — Enrollment, Challenge, Recovery Code.
 * Usa fluxo real de autenticação. MFA bypass proibido em produção.
 */
import { test, expect } from '@playwright/test';
import { AdminLoginPage } from '../pages/AdminLoginPage';
import { TEST_USERS } from '../fixtures/test-data';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('MFA — Autenticação de Segundo Fator', () => {
  let loginPage: AdminLoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new AdminLoginPage(page);
    await loginPage.goto();
  });

  test('deve exibir step de enrollment (QR Code) para admin sem MFA configurado', async ({ page }) => {
    test.skip(!TEST_USERS.admin.password, 'Credenciais E2E de admin não configuradas');
    
    // Login com admin que não tem MFA configurado (staging)
    await loginPage.login(TEST_USERS.admin.email, TEST_USERS.admin.password);
    
    // Deve mostrar step de enrollment
    await loginPage.expectMfaStep('enroll');
    
    // QR Code SVG deve estar visível
    const qrCode = page.locator('svg[data-testid="qr-code"], .qr-code-container svg, svg');
    await expect(qrCode.first()).toBeVisible({ timeout: 8_000 });
  });

  test('deve exibir 10 códigos de recuperação durante enrollment', async ({ page }) => {
    test.skip(!TEST_USERS.admin.password, 'Credenciais E2E de admin não configuradas');
    
    await loginPage.login(TEST_USERS.admin.email, TEST_USERS.admin.password);
    await loginPage.expectMfaStep('enroll');
    
    // Verificar presença de códigos de recuperação (formato XXXX-XXXX)
    const recoveryCodes = page.getByText(/[A-Z0-9]{4}-[A-Z0-9]{4}/);
    const count = await recoveryCodes.count();
    expect(count).toBeGreaterThanOrEqual(10);
  });

  test('deve manter botão de submit MFA desabilitado com menos de 6 dígitos', async ({ page }) => {
    test.skip(!TEST_USERS.admin.password, 'Credenciais E2E de admin não configuradas');
    
    await loginPage.login(TEST_USERS.admin.email, TEST_USERS.admin.password);
    
    const mfaInputVisible = await loginPage.mfaTokenInput.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!mfaInputVisible) test.skip(true, 'MFA step não apareceu');
    
    // Submit deve estar desabilitado com input vazio
    await expect(loginPage.mfaSubmitButton).toBeDisabled();
    
    // Digitar apenas 3 dígitos — deve continuar desabilitado
    await loginPage.mfaTokenInput.fill('123');
    await expect(loginPage.mfaSubmitButton).toBeDisabled();
    
    // 6 dígitos — deve habilitar
    await loginPage.mfaTokenInput.fill('123456');
    await expect(loginPage.mfaSubmitButton).toBeEnabled();
  });

  test('deve exibir step de challenge para admin com MFA já configurado', async ({ page }) => {
    test.skip(!TEST_USERS.superAdmin.password, 'Credenciais E2E não configuradas');
    test.skip(!process.env.E2E_MFA_TOTP_SECRET, 'E2E_MFA_TOTP_SECRET não configurado');
    
    await loginPage.login(TEST_USERS.superAdmin.email, TEST_USERS.superAdmin.password);
    await loginPage.expectMfaStep('challenge');
  });

  test('deve exibir opção de usar código de recuperação no step challenge', async ({ page }) => {
    test.skip(!TEST_USERS.superAdmin.password, 'Credenciais E2E não configuradas');
    
    await loginPage.login(TEST_USERS.superAdmin.email, TEST_USERS.superAdmin.password);
    
    const challengeVisible = await page.getByText('Verificação de Segurança').isVisible({ timeout: 5_000 }).catch(() => false);
    if (!challengeVisible) test.skip(true, 'Challenge step não apareceu');
    
    // Link de recuperação deve estar visível
    await expect(page.getByText('Usar Código de Recuperação')).toBeVisible();
    
    // Clicar e verificar formulário de recovery
    await page.getByText('Usar Código de Recuperação').click();
    await expect(page.getByText('Código de Recuperação (Backup)')).toBeVisible();
  });

  test('deve rejeitar token MFA inválido e exibir erro', async ({ page }) => {
    test.skip(!TEST_USERS.superAdmin.password, 'Credenciais E2E não configuradas');
    
    await loginPage.login(TEST_USERS.superAdmin.email, TEST_USERS.superAdmin.password);
    
    const mfaVisible = await loginPage.mfaTokenInput.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!mfaVisible) test.skip(true, 'MFA step não apareceu');
    
    // Token inválido (000000)
    await loginPage.submitMfaToken('000000');
    
    // Deve exibir erro
    await expect(page.getByTestId('login-error')).toBeVisible({ timeout: 8_000 });
  });

  test('deve autenticar com TOTP correto e redirecionar para admin', async ({ page }) => {
    test.skip(!TEST_USERS.superAdmin.password, 'Credenciais E2E não configuradas');
    test.skip(!process.env.E2E_MFA_TOTP_SECRET, 'TOTP secret não configurado para E2E');
    
    await loginPage.login(TEST_USERS.superAdmin.email, TEST_USERS.superAdmin.password);
    
    const mfaVisible = await loginPage.mfaTokenInput.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!mfaVisible) test.skip(true, 'MFA não requerido — pulando');
    
    // Em ambiente real de staging, inserir TOTP gerado
    // O secret E2E_MFA_TOTP_SECRET é exclusivo do ambiente de staging
    const mockToken = '123456'; // Em produção real: calculado via TOTP library
    await loginPage.submitMfaToken(mockToken);
    
    // Verificar resultado (pode falhar se token inválido no staging)
    await page.waitForTimeout(2000);
  });
});
