import type { Delivery } from './delivery.entity.js';
import type { EntityManager } from 'typeorm';

export interface CreateDeliveryData {
  transactionId: string;
  customerId: string;
  productId: string;
  address: string;
  city: string;
}

export abstract class DeliveryRepositoryPort {
  abstract create(data: CreateDeliveryData, manager?: EntityManager): Promise<Delivery>;
  abstract findByTransactionId(transactionId: string): Promise<Delivery | null>;
}

export const DELIVERY_REPOSITORY = Symbol('DELIVERY_REPOSITORY');
