import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('products')
export class ProductTypeormEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'bigint', name: 'price_in_cents' })
  priceInCents!: number;

  @Column({ type: 'int', default: 0 })
  stock!: number;

  @Column({ type: 'varchar', length: 500, name: 'image_url' })
  imageUrl!: string;

  @Column({ type: 'boolean', default: true, name: 'is_available' })
  isAvailable!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
