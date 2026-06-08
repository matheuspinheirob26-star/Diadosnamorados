// ─────────────────────────────────────────────────────────────────────────────
// AMOUR & CO. — Payment Types
// Camada de abstração multi-gateway
// ─────────────────────────────────────────────────────────────────────────────

export type GatewayName =
  | 'mercadopago'
  | 'pagarme'
  | 'efi'
  | 'asaas'
  | 'stripe'
  | 'crypto';

export type PaymentMethodType = 'pix' | 'card' | 'boleto' | 'crypto';

export type PaymentStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'expired'
  | 'cancelled'
  | 'refunded'
  | 'processing'
  | 'in_review';

export type CryptoCurrency = 'BTC' | 'ETH' | 'USDT_TRC20' | 'USDT_ERC20';

// ─────────────────────────────────────────────────────────────────────────────
// Gateway Configuration
// ─────────────────────────────────────────────────────────────────────────────

export interface GatewayConfig {
  id: string;
  gateway: GatewayName;
  enabled: boolean;
  priority: number;
  label: string;
  // Public-safe keys only (never secret keys here)
  publicKey?: string;
  clientId?: string;
  // Crypto wallet addresses
  walletBTC?: string;
  walletETH?: string;
  walletUSDT_TRC20?: string;
  walletUSDT_ERC20?: string;
  // Internal
  isDemo: boolean;
  updatedAt: string;
}

export interface GatewayConfigUpdate {
  enabled?: boolean;
  priority?: number;
  publicKey?: string;
  clientId?: string;
  walletBTC?: string;
  walletETH?: string;
  walletUSDT_TRC20?: string;
  walletUSDT_ERC20?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared
// ─────────────────────────────────────────────────────────────────────────────

export interface PaymentAddress {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface CustomerInfo {
  name: string;
  email: string;
  cpf: string;
  phone?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PIX
// ─────────────────────────────────────────────────────────────────────────────

export interface PixRequest {
  orderId: string;
  amount: number;
  customer: CustomerInfo;
  description?: string;
  expirationMinutes?: number;
}

export interface PixResponse {
  transactionId: string;
  gateway: GatewayName;
  qrCodeImage: string;     // URL or base64 PNG for display
  copyPaste: string;       // Pix Copia e Cola string
  expiresAt: string;       // ISO datetime
  status: PaymentStatus;
  isDemo: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// CARD
// ─────────────────────────────────────────────────────────────────────────────

export interface CardRequest {
  orderId: string;
  amount: number;
  installments: number;
  cardToken: string;       // Tokenized by gateway SDK (never raw card data)
  customer: CustomerInfo;
  billingAddress?: PaymentAddress;
  description?: string;
}

export interface CardResponse {
  transactionId: string;
  gateway: GatewayName;
  status: PaymentStatus;
  authorizationCode?: string;
  installments: number;
  amount: number;
  isDemo: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// BOLETO
// ─────────────────────────────────────────────────────────────────────────────

export interface BoletoRequest {
  orderId: string;
  amount: number;
  customer: CustomerInfo;
  address: PaymentAddress;
  description?: string;
  expirationDays?: number;
}

export interface BoletoResponse {
  transactionId: string;
  gateway: GatewayName;
  barcode: string;          // Código de barras (linha digitável)
  pdfUrl?: string;          // Link para download do PDF
  expiresAt: string;        // ISO datetime
  status: PaymentStatus;
  isDemo: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// CRYPTO
// ─────────────────────────────────────────────────────────────────────────────

export interface CryptoRequest {
  orderId: string;
  amountBRL: number;        // Amount in BRL
  currency: CryptoCurrency;
  customerEmail: string;
}

export interface CryptoResponse {
  transactionId: string;
  gateway: GatewayName;
  walletAddress: string;
  cryptoAmount: number;     // Amount in the selected crypto
  currency: CryptoCurrency;
  exchangeRate: number;     // BRL per crypto unit (simulated)
  qrCodeImage: string;      // URL or base64
  expiresAt: string;
  status: PaymentStatus;
  isDemo: boolean;
  // Future: provider links
  paymentUrl?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Status Polling
// ─────────────────────────────────────────────────────────────────────────────

export interface PaymentStatusResponse {
  transactionId: string;
  orderId: string;
  gateway: GatewayName;
  status: PaymentStatus;
  paidAt?: string;
  amount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Transaction Record (stored in DB / localStorage)
// ─────────────────────────────────────────────────────────────────────────────

export interface Transaction {
  id: string;
  orderId: string;
  gateway: GatewayName;
  gatewayTransactionId?: string;
  method: PaymentMethodType;
  status: PaymentStatus;
  amount: number;
  fee: number;
  netAmount: number;
  currency: string;
  // Pix
  pixQrCodeImage?: string;
  pixCopyPaste?: string;
  pixExpiration?: string;
  // Boleto
  boletoUrl?: string;
  boletoBarcode?: string;
  boletoExpiration?: string;
  // Crypto
  cryptoAddress?: string;
  cryptoAmount?: number;
  cryptoCurrency?: CryptoCurrency;
  cryptoExpiration?: string;
  // Card
  installments?: number;
  // Meta
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Payment Attempt (for fallback tracking)
// ─────────────────────────────────────────────────────────────────────────────

export interface PaymentAttempt {
  id: string;
  orderId: string;
  gateway: GatewayName;
  method: PaymentMethodType;
  status: 'success' | 'failed' | 'fallback_triggered';
  errorMessage?: string;
  responseTimeMs: number;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Webhook Event
// ─────────────────────────────────────────────────────────────────────────────

export type WebhookEventType =
  | 'payment.approved'
  | 'payment.failed'
  | 'payment.expired'
  | 'payment.cancelled'
  | 'refund.created'
  | 'refund.completed'
  | 'chargeback.opened'
  | 'chargeback.resolved';

export interface WebhookEvent {
  id: string;
  gateway: GatewayName;
  eventType: WebhookEventType;
  transactionId: string;
  orderId?: string;
  amount?: number;
  payload: Record<string, unknown>;
  processed: boolean;
  receivedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin Dashboard Stats
// ─────────────────────────────────────────────────────────────────────────────

export interface GatewayStats {
  gateway: GatewayName;
  label: string;
  totalTransactions: number;
  successRate: number;
  totalRevenueBRL: number;
  totalFeesBRL: number;
  totalNetBRL: number;
  avgResponseMs: number;
  chargebacks: number;
  refunds: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// PaymentService Input/Output
// ─────────────────────────────────────────────────────────────────────────────

export type ProcessPaymentInput =
  | ({ method: 'pix' } & PixRequest)
  | ({ method: 'card' } & CardRequest)
  | ({ method: 'boleto' } & BoletoRequest)
  | ({ method: 'crypto' } & CryptoRequest);

export type ProcessPaymentResult =
  | ({ method: 'pix' } & PixResponse)
  | ({ method: 'card' } & CardResponse)
  | ({ method: 'boleto' } & BoletoResponse)
  | ({ method: 'crypto' } & CryptoResponse);

export interface ProcessPaymentSuccess {
  success: true;
  result: ProcessPaymentResult;
  transaction: Transaction;
  attempts: PaymentAttempt[];
}

export interface ProcessPaymentError {
  success: false;
  error: string;
  attempts: PaymentAttempt[];
}

export type ProcessPaymentOutcome = ProcessPaymentSuccess | ProcessPaymentError;
