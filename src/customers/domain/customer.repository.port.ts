import type { Customer } from './customer.entity.js';

export interface CreateCustomerData {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
}

export abstract class CustomerRepositoryPort {
  abstract create(data: CreateCustomerData): Promise<Customer>;
  abstract findById(id: string): Promise<Customer | null>;
}

export const CUSTOMER_REPOSITORY = Symbol('CUSTOMER_REPOSITORY');
