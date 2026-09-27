import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { PaymentGatewayPort } from '../payment-gateway.port.js';
import type { PaymentTransactionRequest, PaymentTransactionResponse } from '../payment-gateway.port.js';

@Injectable()
export class PaymentGatewayAdapter extends PaymentGatewayPort {
  private readonly logger = new Logger(PaymentGatewayAdapter.name);
  private readonly apiUrl: string;
  private readonly publicKey: string;
  private readonly privateKey: string;
  private readonly integrityKey: string;

  constructor(private readonly config: ConfigService) {
    super();
    this.apiUrl = config.getOrThrow<string>('PAYMENT_API_URL');
    this.publicKey = config.getOrThrow<string>('PAYMENT_PUBLIC_KEY');
    this.privateKey = config.getOrThrow<string>('PAYMENT_PRIVATE_KEY');
    this.integrityKey = config.getOrThrow<string>('PAYMENT_INTEGRITY_KEY');
  }

  // Genera el hash de integridad requerido por el payment gateway para crear transacciones
  // SHA256(reference + amount_in_cents + currency + integrity_key)
  private buildIntegrityHash(reference: string, amountInCents: number, currency: string): string {
    const raw = `${reference}${amountInCents}${currency}${this.integrityKey}`;
    return createHash('sha256').update(raw).digest('hex');
  }

  async getAcceptanceToken(): Promise<string> {
    const response = await fetch(`${this.apiUrl}/merchants/${this.publicKey}`);
    if (!response.ok) throw new Error('PAYMENT_GATEWAY_UNAVAILABLE');

    const data = await response.json() as {
      data: { presigned_acceptance: { acceptance_token: string } };
    };
    return data.data.presigned_acceptance.acceptance_token;
  }

  async getTransaction(gatewayId: string): Promise<PaymentTransactionResponse> {
    const response = await fetch(`${this.apiUrl}/transactions/${gatewayId}`, {
      headers: { Authorization: `Bearer ${this.privateKey}` },
    });

    if (!response.ok) throw new Error('PAYMENT_GATEWAY_UNAVAILABLE');

    const data = await response.json() as {
      data: {
        id: string;
        status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'ERROR' | 'VOIDED';
        reference: string;
        amount_in_cents: number;
      };
    };

    return {
      id: data.data.id,
      status: data.data.status,
      reference: data.data.reference,
      amountInCents: data.data.amount_in_cents,
    };
  }

  async createTransaction(payload: PaymentTransactionRequest): Promise<PaymentTransactionResponse> {
    const integrityHash = this.buildIntegrityHash(
      payload.reference,
      payload.amountInCents,
      payload.currency,
    );

    const body = {
      amount_in_cents: payload.amountInCents,
      currency: payload.currency,
      customer_email: payload.customerEmail,
      reference: payload.reference,
      payment_method: {
        type: 'CARD',
        token: payload.cardToken,
        installments: payload.installments,
      },
      acceptance_token: payload.acceptanceToken,
      signature: integrityHash,
    };

    this.logger.log(`Creating payment transaction ref=${payload.reference}`);

    const response = await fetch(`${this.apiUrl}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.privateKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      this.logger.error(`Payment gateway API error: ${response.status} ${errText}`);
      throw new Error('PAYMENT_GATEWAY_UNAVAILABLE');
    }

    const data = await response.json() as {
      data: {
        id: string;
        status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'ERROR' | 'VOIDED';
        reference: string;
        amount_in_cents: number;
      };
    };

    return {
      id: data.data.id,
      status: data.data.status,
      reference: data.data.reference,
      amountInCents: data.data.amount_in_cents,
    };
  }
}
