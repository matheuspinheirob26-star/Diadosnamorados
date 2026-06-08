/**
 * Utilitários compartilhados pela camada de pagamento.
 * Geradores de código Pix, boleto, IDs e QR Code URL.
 */

// ─── ID Generator ──────────────────────────────────────────────────────────────
export function generateId(prefix = 'tx'): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${ts}${rand}`;
}

// ─── QR Code via API pública (sem dependência de pacote) ──────────────────────
export function qrCodeUrl(data: string, size = 220): string {
  return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(data)}&size=${size}x${size}&color=c59a48&bgcolor=121212&margin=8`;
}

// ─── Pix Code Generator (EMV QR Code format simulado) ────────────────────────
interface PixCodeOptions {
  orderId: string;
  amount: number;
  txId: string;
  merchantName?: string;
  city?: string;
}

export function pixCodeGenerator(opts: PixCodeOptions): string {
  const {
    orderId,
    amount,
    txId,
    merchantName = 'AMOUR CO PRESENTES',
    city = 'SAO PAULO',
  } = opts;

  const amountStr = amount.toFixed(2);
  const key = `amour.${txId}@pagamentos.com`;
  const txRef = orderId.substring(0, 25).replace(/[^a-zA-Z0-9]/g, '');

  // EMV QR Code format (BR Code padrão Pix)
  const payload = [
    '000201',                                           // Payload format indicator
    '010212',                                           // Point of initiation — merchant
    `26${pad(14 + key.length)}0014BR.GOV.BCB.PIX01${pad(key.length)}${key}`,
    '52040000',                                         // Merchant category code
    '5303986',                                          // Currency BRL (986)
    `54${pad(amountStr.length)}${amountStr}`,           // Amount
    '5802BR',                                           // Country
    `59${pad(merchantName.length)}${merchantName}`,     // Merchant name
    `60${pad(city.length)}${city}`,                     // City
    `62${pad(txRef.length + 4)}05${pad(txRef.length)}${txRef}`, // Additional data
  ].join('');

  // CRC16 simplificado (checksum simulado)
  const crc = crc16(payload + '6304').toString(16).toUpperCase().padStart(4, '0');
  return `${payload}6304${crc}`;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function crc16(str: string): number {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    }
    crc &= 0xFFFF;
  }
  return crc;
}

// ─── Boleto Code Generator (linha digitável simulada) ────────────────────────
export function boletoCodeGenerator(amount: number, orderId: string): string {
  const amountPadded = Math.round(amount * 100).toString().padStart(10, '0');
  const orderRef = orderId.replace(/[^0-9]/g, '').padEnd(8, '0').substring(0, 8);
  const bank = '341'; // Itaú (simulado)
  const currency = '9';

  // Formato linha digitável: BBBCCCCC.CCCCX DDDDD.DDDDX EEEEE.EEEEEX K UUUUVVVVVVVVVV
  const field1 = `${bank}${currency}${orderRef.substring(0, 5)}`;
  const field2 = `${orderRef.substring(5, 8)}${amountPadded.substring(0, 7)}`;
  const field3 = amountPadded.substring(7, 10) + '00000';
  const verifier = '1';
  const dueDate = getDueDateFactor();
  const amountField = amountPadded;

  return `${field1}.${verifier} ${field2}.${verifier} ${field3}.${verifier} ${verifier} ${dueDate}${amountField}`;
}

function getDueDateFactor(): string {
  // Fator de vencimento (dias desde 07/10/1997)
  const base = new Date('1997-10-07').getTime();
  const due = Date.now() + 3 * 86_400_000; // +3 dias
  const factor = Math.floor((due - base) / 86_400_000).toString().padStart(4, '0');
  return factor;
}

// ─── Format currency ──────────────────────────────────────────────────────────
export function formatAmountBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

// ─── Countdown helpers ────────────────────────────────────────────────────────
export function secondsUntil(isoDate: string): number {
  return Math.max(0, Math.floor((new Date(isoDate).getTime() - Date.now()) / 1000));
}

export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
