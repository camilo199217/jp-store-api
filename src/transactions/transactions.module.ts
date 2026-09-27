import { Module } from '@nestjs/common';
import { TransactionsController } from './infrastructure/http/transactions.controller.js';
import { TransactionRepository } from './infrastructure/persistence/transaction.repository.js';
import { ProcessPaymentUseCase } from './application/use-cases/process-payment.use-case.js';
import { GetTransactionUseCase } from './application/use-cases/get-transaction.use-case.js';
import { TRANSACTION_REPOSITORY } from './domain/transaction.repository.port.js';
import { ProductsModule } from '../products/products.module.js';
import { DeliveriesModule } from '../deliveries/deliveries.module.js';
import { PaymentGatewayModule } from '../payment-gateway/payment-gateway.module.js';
import { CustomersModule } from '../customers/customers.module.js';

@Module({
  imports: [ProductsModule, DeliveriesModule, PaymentGatewayModule, CustomersModule],
  controllers: [TransactionsController],
  providers: [
    { provide: TRANSACTION_REPOSITORY, useClass: TransactionRepository },
    ProcessPaymentUseCase,
    GetTransactionUseCase,
  ],
  exports: [TRANSACTION_REPOSITORY],
})
export class TransactionsModule {}
