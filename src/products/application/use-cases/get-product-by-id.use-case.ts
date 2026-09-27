// Caso de uso: obtener un producto por su UUID.
// Retorna PRODUCT_NOT_FOUND si no existe — el controller decide qué HTTP status usar.
import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRODUCT_REPOSITORY, ProductRepositoryPort } from '../../domain/product.repository.port.js';
import { ok, fail, Result, ErrorCode } from '../../../shared/result/result.js';
import type { Product } from '../../domain/product.entity.js';

@Injectable()
export class GetProductByIdUseCase {
  private readonly logger = new Logger(GetProductByIdUseCase.name);

  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepositoryPort,
  ) {}

  async execute(id: string): Promise<Result<Product>> {
    this.logger.log(`Executing GetProductById id=${id}`);

    try {
      const product = await this.productRepository.findById(id);

      if (!product) {
        this.logger.warn(`Product not found id=${id}`);
        return fail({ code: ErrorCode.PRODUCT_NOT_FOUND });
      }

      this.logger.log(`GetProductById OK — name=${product.name} stock=${product.stock}`);
      return ok(product);
    } catch (err) {
      this.logger.error(`GetProductById failed id=${id}`, err instanceof Error ? err.stack : String(err));
      return fail({ code: ErrorCode.INTERNAL_ERROR });
    }
  }
}
