// Repositorio de transacciones — maneja el ciclo de vida del pago en nuestra DB.
// La referencia del gateway es única (UNIQUE constraint) para garantizar idempotencia:
// si por algún bug se intenta crear dos veces la misma transacción, la DB lo rechaza.
import { Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { TransactionTypeormEntity } from './transaction.typeorm-entity.js';
import { TransactionRepositoryPort, CreateTransactionData } from '../../domain/transaction.repository.port.js';
import type { Transaction } from '../../domain/transaction.entity.js';
import { TransactionStatus } from '../../domain/transaction.entity.js';

@Injectable()
export class TransactionRepository extends TransactionRepositoryPort {
  private readonly logger = new Logger(TransactionRepository.name);

  constructor(private readonly dataSource: DataSource) {
    super();
  }

  // Crea la transacción en estado PENDING antes de llamar al payment gateway
  async create(data: CreateTransactionData): Promise<Transaction> {
    this.logger.debug(`Inserting transaction reference=${data.gatewayReference}`);

    const result = await this.dataSource
      .createQueryBuilder()
      .insert()
      .into(TransactionTypeormEntity)
      .values({ ...data, status: TransactionStatus.PENDING })
      .returning('*')
      .execute();

    const transaction = result.generatedMaps[0] as Transaction;
    this.logger.log(`Transaction created id=${transaction.id} ref=${data.gatewayReference}`);
    return transaction;
  }

  // Busca una transacción por UUID — el frontend la usa para recuperar el estado en refresh
  async findById(id: string): Promise<Transaction | null> {
    this.logger.debug(`Finding transaction id=${id}`);

    const tx = await this.dataSource
      .createQueryBuilder(TransactionTypeormEntity, 't')
      .where('t.id = :id', { id })
      .getOne();

    if (!tx) {
      this.logger.warn(`Transaction not found id=${id}`);
    }

    return tx;
  }

  // Actualiza el estado final de la transacción después de la respuesta del payment gateway.
  // Acepta un EntityManager para participar en la transacción atómica del pago aprobado.
  async updateStatus(
    id: string,
    status: TransactionStatus,
    gatewayTransactionId: string | null,
    manager?: EntityManager,
  ): Promise<void> {
    this.logger.log(`Updating transaction id=${id} status=${status} gatewayId=${gatewayTransactionId ?? 'N/A'}`);

    const qb = manager
      ? manager.createQueryBuilder()
      : this.dataSource.createQueryBuilder();

    await qb
      .update(TransactionTypeormEntity)
      .set({ status, gatewayTransactionId })
      .where('id = :id', { id })
      .execute();

    this.logger.log(`Transaction updated id=${id} → ${status}`);
  }
}
