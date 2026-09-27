// Repositorio de entregas — se crea una entrega por cada pago aprobado.
// La relación transaction_id es UNIQUE: un pago solo puede generar una entrega.
import { Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { DeliveryTypeormEntity } from './delivery.typeorm-entity.js';
import { DeliveryRepositoryPort, CreateDeliveryData } from '../../domain/delivery.repository.port.js';
import type { Delivery } from '../../domain/delivery.entity.js';

@Injectable()
export class DeliveryRepository extends DeliveryRepositoryPort {
  private readonly logger = new Logger(DeliveryRepository.name);

  constructor(private readonly dataSource: DataSource) {
    super();
  }

  // Crea la entrega dentro de la transacción atómica del pago aprobado.
  // Si algo falla aquí, el rollback revierte también el cambio de estado y el stock.
  async create(data: CreateDeliveryData, manager?: EntityManager): Promise<Delivery> {
    this.logger.log(`Creating delivery for transactionId=${data.transactionId}`);

    const qb = manager
      ? manager.createQueryBuilder()
      : this.dataSource.createQueryBuilder();

    const result = await qb
      .insert()
      .into(DeliveryTypeormEntity)
      .values(data)
      .returning('*')
      .execute();

    const delivery = result.generatedMaps[0] as Delivery;
    this.logger.log(`Delivery created id=${delivery.id} transactionId=${data.transactionId}`);
    return delivery;
  }

  // Busca la entrega asociada a una transacción — el frontend la muestra en el paso 4
  async findByTransactionId(transactionId: string): Promise<Delivery | null> {
    this.logger.debug(`Finding delivery for transactionId=${transactionId}`);

    const delivery = await this.dataSource
      .createQueryBuilder(DeliveryTypeormEntity, 'd')
      .where('d.transaction_id = :transactionId', { transactionId })
      .getOne();

    if (!delivery) {
      this.logger.warn(`Delivery not found for transactionId=${transactionId}`);
    }

    return delivery;
  }
}
