/**
 * test-data.ts
 * Constantes e factories de dados de teste para a suíte E2E.
 */

export const TEST_USERS = {
  superAdmin: {
    email: process.env.E2E_SUPER_ADMIN_EMAIL || 'super@staging.amour.com',
    password: process.env.E2E_SUPER_ADMIN_PASSWORD || '',
    role: 'super_admin' as const,
  },
  admin: {
    email: process.env.E2E_ADMIN_EMAIL || 'admin@staging.amour.com',
    password: process.env.E2E_ADMIN_PASSWORD || '',
    role: 'admin' as const,
  },
  manager: {
    email: process.env.E2E_MANAGER_EMAIL || 'manager@staging.amour.com',
    password: process.env.E2E_MANAGER_PASSWORD || '',
    role: 'manager' as const,
  },
  support: {
    email: process.env.E2E_SUPPORT_EMAIL || 'support@staging.amour.com',
    password: process.env.E2E_SUPPORT_PASSWORD || '',
    role: 'support' as const,
  },
} as const;

export const TEST_CUSTOMER = {
  name: 'Cliente Teste E2E',
  email: 'e2e-teste@faker.com',
  phone: '11999990000',
  cpf: '123.456.789-00',
  cep: '01310-100',
  address: 'Av. Paulista',
  number: '1578',
  city: 'São Paulo',
  state: 'SP',
  neighborhood: 'Bela Vista',
};

export const WEBHOOK_PAYLOADS = {
  stripeApproved: {
    id: 'evt_test_E2E_approved',
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: 'pi_test_E2E_001',
        amount: 29900,
        metadata: { order_id: 'test-order-e2e-001' },
      },
    },
  },
  stripeFailed: {
    id: 'evt_test_E2E_failed',
    type: 'payment_intent.payment_failed',
    data: {
      object: {
        id: 'pi_test_E2E_002',
        amount: 14900,
        metadata: { order_id: 'test-order-e2e-002' },
      },
    },
  },
  mercadopagoApproved: {
    id: 999991,
    type: 'payment',
    topic: 'payment',
    status: 'approved',
    external_reference: 'test-order-e2e-001',
    transaction_amount: 299.0,
    data: { id: '999991' },
  },
};

export const LGPD_TEST_EMAIL = 'lgpd-test-cliente@faker.com';

export const MOCK_CSRF_TOKEN = 'e2e-test-csrf-token-valid-uuid';

export const APPROVAL_PAYLOAD = {
  targetType: 'user_roles_promote',
  targetId: 'test-user-uuid-e2e',
  payload: { role: 'admin', status: 'ativo' },
};
