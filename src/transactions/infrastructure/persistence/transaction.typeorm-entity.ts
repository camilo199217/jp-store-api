import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { TransactionStatus } from '../../domain/transaction.entity.js';

@Entity('transactions')
export class TransactionTypeormEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'customer_id' })
  customerId!: string;

  @Column({ type: 'uuid', name: 'product_id' })
  productId!: string;

  @Column({ type: 'int', name: 'quantity', default: 1 })
  quantity!: number;

  @Column({ type: 'enum', enum: TransactionStatus, default: TransactionStatus.CREATED })
  status!: TransactionStatus;

  @Column({ type: 'bigint', name: 'amount_in_cents' })
  amountInCents!: number;

  @Column({ type: 'bigint', name: 'base_fee_in_cents' })
  baseFeeInCents!: number;

  @Column({ type: 'bigint', name: 'delivery_fee_in_cents' })
  deliveryFeeInCents!: number;

  @Column({ type: 'bigint', name: 'total_amount_in_cents' })
  totalAmountInCents!: number;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'gateway_transaction_id', unique: true })
  gatewayTransactionId!: string | null;

  @Column({ type: 'varchar', length: 255, unique: true, name: 'gateway_reference' })
  gatewayReference!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
