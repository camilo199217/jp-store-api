export interface PaymentTransactionRequest {
  amountInCents: number;
  currency: string;
  customerEmail: string;
  reference: string;
  cardToken: string;
  acceptanceToken: string;
  installments: number;
}

export interface PaymentTransactionResponse {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'ERROR' | 'VOIDED';
  reference: string;
  amountInCents: number;
}

export abstract class PaymentGatewayPort {
  abstract getAcceptanceToken(): Promise<string>;
  abstract createTransaction(data: PaymentTransactionRequest): Promise<PaymentTransactionResponse>;
  abstract getTransaction(gatewayId: string): Promise<PaymentTransactionResponse>;
}

export const PAYMENT_GATEWAY_ADAPTER = Symbol('PAYMENT_GATEWAY_ADAPTER');
