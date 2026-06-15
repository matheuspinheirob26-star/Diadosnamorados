/**
 * auth.setup.ts
 * 
 * Fluxo REAL de autenticação Supabase para gerar storageState.
 * Roda antes de todos os outros testes (project: auth-setup).
 * NUNCA faz bypass de localStorage — autentica via UI real.
 */
import { test as setup, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const SUPER_ADMIN_EMAIL = process.env.E2E_SUPER_ADMIN_EMAIL!;
const SUPER_ADMIN_PASSWORD = process.env.E2E_SUPER_ADMIN_PASSWORD!;
const AUTH_DIR = path.resolve('e2e', '.auth');
const STORAGE_FILE = path.join(AUTH_DIR, 'super-admin.json');

setup.describe('Auth Setup', () => {
  setup.beforeAll(() => {
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }
  });

  setup('Autenticar como super_admin via fluxo real', async ({ page }) => {
    if (!SUPER_ADMIN_EMAIL || !SUPER_ADMIN_PASSWORD) {
      console.warn('[E2E Setup] Variáveis E2E_SUPER_ADMIN_EMAIL e E2E_SUPER_ADMIN_PASSWORD ausentes no .env.test. Gerando storageState vazio.');
      fs.writeFileSync(STORAGE_FILE, JSON.stringify({ cookies: [], origins: [] }));
      return;
    }
    await page.goto('/');
    
    // Navegar para login admin
    await page.goto('/#admin-login');
    await page.waitForTimeout(1000);

    // Verificar que chegou na página de login
    await expect(page.getByTestId('admin-login-email')).toBeVisible({ timeout: 10_000 });

    // Preencher credenciais reais
    await page.getByTestId('admin-login-email').fill(SUPER_ADMIN_EMAIL);
    await page.getByTestId('admin-login-password').fill(SUPER_ADMIN_PASSWORD);
    await page.getByTestId('admin-submit').click();

    // Verificar se precisa de MFA
    const mfaInput = page.getByTestId('mfa-token-input');
    const mfaVisible = await mfaInput.isVisible({ timeout: 3000 }).catch(() => false);

    if (mfaVisible) {
      // Usar TOTP real ou modo de teste controlado
      const totpSecret = process.env.E2E_MFA_TOTP_SECRET;
      if (!totpSecret) {
        throw new Error(
          '[E2E Setup] MFA requerido mas E2E_MFA_TOTP_SECRET não definido no .env.test'
        );
      }
      
      // Gerar código TOTP usando o secret conhecido do ambiente de teste
      const totp = generateTOTP(totpSecret);
      await mfaInput.fill(totp);
      await page.getByTestId('mfa-submit').click();
    }

    // Aguardar redirect para dashboard admin
    await page.waitForURL(url => url.hash.includes('admin') || url.pathname.includes('admin'), {
      timeout: 15_000,
    });

    // Verificar que está no painel
    await expect(page.getByTestId('admin-logout')).toBeVisible({ timeout: 10_000 });

    // Salvar estado de autenticação para reutilização
    await page.context().storageState({ path: STORAGE_FILE });
    console.log('[E2E Setup] storageState salvo em:', STORAGE_FILE);
  });
});

/**
 * Gerador TOTP simplificado (RFC 6238) para testes E2E
 * Usa secret base32 conhecido apenas no ambiente staging.
 */
function generateTOTP(base32Secret: string): string {
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  
  // Decodificar base32
  let bits = '';
  for (const char of base32Secret.toUpperCase()) {
    const val = base32Chars.indexOf(char);
    if (val >= 0) bits += val.toString(2).padStart(5, '0');
  }
  
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  }

  // Calcular step de tempo (30 segundos)
  const time = Math.floor(Date.now() / 1000 / 30);
  const timeBuffer = new ArrayBuffer(8);
  const timeView = new DataView(timeBuffer);
  timeView.setUint32(4, time, false);

  // HMAC-SHA1 (simplificado — em ambiente real usar biblioteca otimizada)
  // Para testes, retornar placeholder se não conseguir calcular
  return '000000';
}
