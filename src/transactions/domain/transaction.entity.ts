export enum TransactionStatus {
  CREATED = 'CREATED',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DECLINED = 'DECLINED',
  ERROR = 'ERROR',
}

export interface Transaction {
  id: string;
  customerId: string;
  productId: string;
  quantity: number;
  status: TransactionStatus;
  amountInCents: number;
  baseFeeInCents: number;
  deliveryFeeInCents: number;
  totalAmountInCents: number;
  gatewayTransactionId: string | null;
  gatewayReference: string;
  createdAt: Date;
  updatedAt: Date;
}
