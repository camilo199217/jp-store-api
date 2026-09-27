// Caso de uso: obtener la entrega asociada a una transacción.
// Se consulta en el paso 4 (estado final) para mostrar los detalles de la entrega al cliente.
import { Inject, Injectable, Logger } from '@nestjs/common';
import { DELIVERY_REPOSITORY, DeliveryRepositoryPort } from '../../domain/delivery.repository.port.js';
import { ok, fail, Result, ErrorCode } from '../../../shared/result/result.js';
import type { Delivery } from '../../domain/delivery.entity.js';

@Injectable()
export class GetDeliveryUseCase {
  private readonly logger = new Logger(GetDeliveryUseCase.name);

  constructor(
    @Inject(DELIVERY_REPOSITORY)
    private readonly deliveryRepository: DeliveryRepositoryPort,
  ) {}

  async execute(transactionId: string): Promise<Result<Delivery>> {
    this.logger.log(`Executing GetDelivery transactionId=${transactionId}`);

    try {
      const delivery = await this.deliveryRepository.findByTransactionId(transactionId);

      if (!delivery) {
        this.logger.warn(`Delivery not found for transactionId=${transactionId}`);
        return fail({ code: ErrorCode.TRANSACTION_NOT_FOUND });
      }

      this.logger.log(`GetDelivery OK id=${delivery.id} status=${delivery.status}`);
      return ok(delivery);
    } catch (err) {
      this.logger.error(`GetDelivery failed transactionId=${transactionId}`, err instanceof Error ? err.stack : String(err));
      return fail({ code: ErrorCode.INTERNAL_ERROR });
    }
  }
}
