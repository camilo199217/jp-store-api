import type { Transaction, TransactionStatus } from './transaction.entity.js';
import type { EntityManager } from 'typeorm';

export interface CreateTransactionData {
  customerId: string;
  productId: string;
  quantity: number;
  amountInCents: number;
  baseFeeInCents: number;
  deliveryFeeInCents: number;
  totalAmountInCents: number;
  gatewayReference: string;
}

export abstract class TransactionRepositoryPort {
  abstract create(data: CreateTransactionData): Promise<Transaction>;
  abstract findById(id: string): Promise<Transaction | null>;
  abstract updateStatus(id: string, status: TransactionStatus, gatewayTransactionId: string | null, manager?: EntityManager): Promise<void>;
}

export const TRANSACTION_REPOSITORY = Symbol('TRANSACTION_REPOSITORY');
