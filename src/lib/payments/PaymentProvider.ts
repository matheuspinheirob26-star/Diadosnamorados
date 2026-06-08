import {
  GatewayName,
  PixRequest, PixResponse,
  CardRequest, CardResponse,
  BoletoRequest, BoletoResponse,
  CryptoRequest, CryptoResponse,
  PaymentStatusResponse,
} from '../../types/payments';

/**
 * Contrato que todo gateway de pagamento deve implementar.
 * Garante que o PaymentService possa trocar gateways de forma transparente.
 */
export interface PaymentProvider {
  /** Identificador único do gateway */
  readonly name: GatewayName;
  /** true = sem chaves reais configuradas, usando simulação */
  readonly isDemo: boolean;

  /** Gera um Pix (QR Code + Copia e Cola) */
  createPixPayment(req: PixRequest): Promise<PixResponse>;

  /** Processa pagamento com cartão de crédito via token */
  createCardPayment(req: CardRequest): Promise<CardResponse>;

  /** Gera um boleto bancário */
  createBoletoPayment(req: BoletoRequest): Promise<BoletoResponse>;

  /** Gera endereço de carteira para pagamento em cripto */
  createCryptoPayment(req: CryptoRequest): Promise<CryptoResponse>;

  /** Consulta o status de uma transação */
  getPaymentStatus(transactionId: string): Promise<PaymentStatusResponse>;

  /** Solicita reembolso (total ou parcial) */
  refundPayment(transactionId: string, amount?: number): Promise<void>;

  /** Cancela uma transação pendente */
  cancelPayment(transactionId: string): Promise<void>;
}
