import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Carregar variáveis de ambiente de teste
dotenv.config({ path: path.resolve('.env.test') });

const baseURL = process.env.VITE_APP_URL || 'http://localhost:5173';

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/test-results',
  
  /* Timeout global */
  timeout: 45_000,
  expect: { timeout: 8_000 },

  /* Falhar rapidamente em CI */
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // serial para evitar conflitos de estado de sessão

  /* Reporters */
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'e2e/e2e-results.json' }],
  ],

  /* Configuração global de contexto */
  use: {
    baseURL,
    trace: 'on-first-retry',
    video: 'on-first-retry',
    screenshot: 'only-on-failure',
    
    /* Headers de segurança padrão para todos os requests */
    extraHTTPHeaders: {
      'x-test-env': 'e2e-staging',
    },
  },

  /* Projetos de browser */
  projects: [
    /* Setup: autenticação real que gera storageState */
    {
      name: 'auth-setup',
      testMatch: '**/auth.setup.ts',
    },

    /* Chromium — Principal (todos os testes) */
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/super-admin.json',
      },
      dependencies: ['auth-setup'],
      testIgnore: ['**/auth.setup.ts'],
    },

    /* Security Suite — sem storageState (testa autenticação do zero) */
    {
      name: 'security',
      use: { ...devices['Desktop Chrome'] },
      testMatch: [
        '**/01-auth.spec.ts',
        '**/02-mfa.spec.ts',
        '**/07-csrf.spec.ts',
        '**/08-rate-limit.spec.ts',
        '**/11-rls.spec.ts',
      ],
    },

    /* Payments Suite */
    {
      name: 'payments',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/super-admin.json',
      },
      dependencies: ['auth-setup'],
      testMatch: ['**/05-payments.spec.ts', '**/06-webhooks.spec.ts'],
    },
  ],

  /* Dev server automático */
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
