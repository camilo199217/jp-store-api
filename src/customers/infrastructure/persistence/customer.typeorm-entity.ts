import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('customers')
export class CustomerTypeormEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 20 })
  phone!: string;

  @Column({ type: 'varchar', length: 500 })
  address!: string;

  @Column({ type: 'varchar', length: 100 })
  city!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
