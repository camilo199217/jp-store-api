import { Module } from '@nestjs/common';
import { DeliveriesController } from './infrastructure/http/deliveries.controller.js';
import { DeliveryRepository } from './infrastructure/persistence/delivery.repository.js';
import { GetDeliveryUseCase } from './application/use-cases/get-delivery.use-case.js';
import { DELIVERY_REPOSITORY } from './domain/delivery.repository.port.js';

@Module({
  controllers: [DeliveriesController],
  providers: [
    { provide: DELIVERY_REPOSITORY, useClass: DeliveryRepository },
    GetDeliveryUseCase,
  ],
  exports: [DELIVERY_REPOSITORY],
})
export class DeliveriesModule {}
