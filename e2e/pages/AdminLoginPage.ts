import { Page, Locator, expect } from '@playwright/test';

export class AdminLoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly mfaTokenInput: Locator;
  readonly mfaSubmitButton: Locator;
  readonly errorBanner: Locator;
  readonly emergencyLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByTestId('admin-login-email');
    this.passwordInput = page.getByTestId('admin-login-password');
    this.submitButton = page.getByTestId('admin-submit');
    this.mfaTokenInput = page.getByTestId('mfa-token-input');
    this.mfaSubmitButton = page.getByTestId('mfa-submit');
    this.errorBanner = page.getByTestId('login-error');
    this.emergencyLink = page.getByText('Acesso de Contingência (Break-Glass)', { exact: false });
  }

  async goto(): Promise<void> {
    await this.page.goto('/#admin-login');
    await expect(this.emailInput).toBeVisible({ timeout: 10_000 });
  }

  async fillCredentials(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  async login(email: string, password: string): Promise<void> {
    await this.fillCredentials(email, password);
    await this.submit();
  }

  async submitMfaToken(token: string): Promise<void> {
    await expect(this.mfaTokenInput).toBeVisible({ timeout: 8_000 });
    await this.mfaTokenInput.fill(token);
    await this.mfaSubmitButton.click();
  }

  async expectError(partialMessage?: string): Promise<void> {
    await expect(this.errorBanner).toBeVisible({ timeout: 5_000 });
    if (partialMessage) {
      await expect(this.errorBanner).toContainText(partialMessage);
    }
  }

  async expectMfaStep(step: 'enroll' | 'challenge'): Promise<void> {
    await expect(this.mfaTokenInput).toBeVisible({ timeout: 8_000 });
    const heading =
      step === 'enroll'
        ? 'Configurar Segundo Fator'
        : 'Digite o Código Autenticador';
    await expect(this.page.getByText(heading)).toBeVisible();
  }

  async isBlocked(): Promise<boolean> {
    return this.submitButton.isDisabled();
  }
}
