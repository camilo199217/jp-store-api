export enum DeliveryStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  DELIVERED = 'DELIVERED',
}

export interface Delivery {
  id: string;
  transactionId: string;
  customerId: string;
  productId: string;
  address: string;
  city: string;
  status: DeliveryStatus;
  createdAt: Date;
}
