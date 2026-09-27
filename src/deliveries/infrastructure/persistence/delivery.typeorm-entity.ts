import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { DeliveryStatus } from '../../domain/delivery.entity.js';

@Entity('deliveries')
export class DeliveryTypeormEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'transaction_id', unique: true })
  transactionId!: string;

  @Column({ type: 'uuid', name: 'customer_id' })
  customerId!: string;

  @Column({ type: 'uuid', name: 'product_id' })
  productId!: string;

  @Column({ type: 'varchar', length: 500 })
  address!: string;

  @Column({ type: 'varchar', length: 100 })
  city!: string;

  @Column({ type: 'enum', enum: DeliveryStatus, default: DeliveryStatus.PENDING })
  status!: DeliveryStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
