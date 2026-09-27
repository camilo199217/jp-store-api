import { Module } from '@nestjs/common';
import { CustomersController } from './infrastructure/http/customers.controller.js';
import { CustomerRepository } from './infrastructure/persistence/customer.repository.js';
import { CreateCustomerUseCase } from './application/use-cases/create-customer.use-case.js';
import { CUSTOMER_REPOSITORY } from './domain/customer.repository.port.js';

@Module({
  controllers: [CustomersController],
  providers: [
    { provide: CUSTOMER_REPOSITORY, useClass: CustomerRepository },
    CreateCustomerUseCase,
  ],
  exports: [CUSTOMER_REPOSITORY],
})
export class CustomersModule {}
