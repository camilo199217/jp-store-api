import { Module } from '@nestjs/common';
import { ProductsController } from './infrastructure/http/products.controller.js';
import { ProductRepository } from './infrastructure/persistence/product.repository.js';
import { GetProductsUseCase } from './application/use-cases/get-products.use-case.js';
import { GetProductByIdUseCase } from './application/use-cases/get-product-by-id.use-case.js';
import { PRODUCT_REPOSITORY } from './domain/product.repository.port.js';

@Module({
  controllers: [ProductsController],
  providers: [
    { provide: PRODUCT_REPOSITORY, useClass: ProductRepository },
    GetProductsUseCase,
    GetProductByIdUseCase,
  ],
  exports: [PRODUCT_REPOSITORY, GetProductByIdUseCase],
})
export class ProductsModule {}
