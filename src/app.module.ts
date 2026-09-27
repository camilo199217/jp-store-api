import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ProductsModule } from './products/products.module.js';
import { CustomersModule } from './customers/customers.module.js';
import { TransactionsModule } from './transactions/transactions.module.js';
import { DeliveriesModule } from './deliveries/deliveries.module.js';
import { DatabaseModule } from './database/database.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 30 }]),
    DatabaseModule,
    ProductsModule,
    CustomersModule,
    TransactionsModule,
    DeliveriesModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
