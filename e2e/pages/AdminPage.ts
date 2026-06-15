import { Page, Locator, expect } from '@playwright/test';
import type { AdminTab } from '../../src/components/admin/AdminSidebar';

export class AdminPage {
  readonly page: Page;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.logoutButton = page.getByTestId('admin-logout');
  }

  async goto(): Promise<void> {
    await this.page.goto('/#admin');
    await expect(this.logoutButton).toBeVisible({ timeout: 12_000 });
  }

  async navigateToTab(tab: AdminTab): Promise<void> {
    const tabButton = this.page.getByTestId(`tab-${tab}`);
    await expect(tabButton).toBeVisible({ timeout: 5_000 });
    await tabButton.click();
    await this.page.waitForTimeout(500);
  }

  async expectTabActive(tab: AdminTab): Promise<void> {
    const tabButton = this.page.getByTestId(`tab-${tab}`);
    // Aba ativa tem classe de gradiente dourado
    await expect(tabButton).toHaveClass(/bg-gradient-gold/, { timeout: 5_000 });
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
  }

  async expectCriticalEventBanner(): Promise<Locator> {
    return this.page.getByText('ALERTA CRÍTICO DE SEGURANÇA');
  }

  getTabButton(tab: AdminTab): Locator {
    return this.page.getByTestId(`tab-${tab}`);
  }
}
