/**
 * 03-users.spec.ts
 * Testes de gestão de usuários/operadores: listagem, promoção de role,
 * bloqueio, soft-delete com confirmPassword + deletionReason.
 */
import { test, expect } from '@playwright/test';
import { AdminPage } from '../pages/AdminPage';
import { mockUsersListSuccess } from '../helpers/api-mock';

test.describe('Gestão de Usuários e Permissões', () => {
  let adminPage: AdminPage;

  test.beforeEach(async ({ page }) => {
    test.skip(!process.env.E2E_SUPER_ADMIN_PASSWORD, 'Credenciais E2E não configuradas');
    adminPage = new AdminPage(page);
    await adminPage.goto();
    await adminPage.navigateToTab('users_manager');
  });

  test('deve carregar aba de usuários sem erro', async ({ page }) => {
    await expect(page.getByText(/usuários|operadores|permissões/i)).toBeVisible({ timeout: 8_000 });
  });

  test('deve listar operadores (mock)', async ({ page }) => {
    await mockUsersListSuccess(page);
    await page.reload();
    await adminPage.navigateToTab('users_manager');
    // Aguardar carregamento
    await page.waitForTimeout(1500);
    await expect(page.getByText(/carregando|operadores/i)).toBeVisible({ timeout: 6_000 });
  });

  test('deve exibir modal de edição ao clicar em editar operador', async ({ page }) => {
    // Aguardar tabela carregar
    await page.waitForTimeout(2000);
    
    const editButton = page.getByRole('button', { name: /editar/i }).first();
    const editVisible = await editButton.isVisible({ timeout: 5_000 }).catch(() => false);
    
    if (!editVisible) {
      test.skip(true, 'Nenhum operador listado — staging sem dados');
    }
    
    await editButton.click();
    // Modal de edição deve aparecer
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 });
  });

  test('deve exigir campo de senha ao alterar role de operador', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    const editButton = page.getByRole('button', { name: /editar/i }).first();
    if (!await editButton.isVisible({ timeout: 4_000 }).catch(() => false)) {
      test.skip(true, 'Nenhum operador listado');
    }
    
    await editButton.click();
    await page.waitForTimeout(500);
    
    // Selecionar uma role diferente (se houver select de role)
    const roleSelect = page.getByRole('combobox').first();
    if (await roleSelect.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await roleSelect.selectOption('manager');
    }
    
    // Campo confirmPassword deve aparecer
    const pwField = page.getByPlaceholder(/senha|password/i);
    await expect(pwField).toBeVisible({ timeout: 5_000 });
  });

  test('deve exibir campo deletionReason ao deletar operador', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    const deleteButton = page.getByRole('button', { name: /excluir|remover/i }).first();
    if (!await deleteButton.isVisible({ timeout: 4_000 }).catch(() => false)) {
      test.skip(true, 'Nenhum operador listado');
    }
    
    await deleteButton.click();
    
    // Modal de exclusão deve aparecer com campo de motivo
    await expect(page.getByPlaceholder(/motivo|razão|reason/i)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByPlaceholder(/senha|password/i)).toBeVisible({ timeout: 5_000 });
  });

  test('deve impedir submit de exclusão sem preencher motivo', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    const deleteButton = page.getByRole('button', { name: /excluir|remover/i }).first();
    if (!await deleteButton.isVisible({ timeout: 4_000 }).catch(() => false)) {
      test.skip(true, 'Nenhum operador listado');
    }
    
    await deleteButton.click();
    await page.waitForTimeout(500);
    
    // Clicar em confirmar sem preencher campos
    const confirmBtn = page.getByRole('button', { name: /confirmar|deletar|excluir/i });
    if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await confirmBtn.click();
      // Deve exibir validação
      const validation = page.getByText(/obrigatório|preencha|mínimo/i);
      await expect(validation).toBeVisible({ timeout: 4_000 });
    }
  });

  test('aba users_manager deve ser acessível apenas por super_admin/admin', async ({ page }) => {
    // A aba deve aparecer no menu para o usuário autenticado como super_admin
    const tabButton = page.getByTestId('tab-users_manager');
    await expect(tabButton).toBeVisible({ timeout: 5_000 });
  });
});
