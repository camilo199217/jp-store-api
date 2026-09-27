// Caso de uso: obtener lista paginada de productos disponibles.
// Sigo Railway Oriented Programming (ROP): si algo falla retorno un Result<Failure>,
// nunca lanzo excepciones desde la capa de aplicación.
import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRODUCT_REPOSITORY, ProductRepositoryPort } from '../../domain/product.repository.port.js';
import { ok, fail, Result, ErrorCode } from '../../../shared/result/result.js';
import type { PaginatedResult } from '../../../shared/dto/pagination.dto.js';
import type { Product } from '../../domain/product.entity.js';

@Injectable()
export class GetProductsUseCase {
  private readonly logger = new Logger(GetProductsUseCase.name);

  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepositoryPort,
  ) {}

  async execute(page: number, limit: number): Promise<Result<PaginatedResult<Product>>> {
    this.logger.log(`Executing GetProducts page=${page} limit=${limit}`);

    try {
      const result = await this.productRepository.findAll(page, limit);

      this.logger.log(`GetProducts OK — total=${result.total} page=${result.page}/${result.totalPages}`);

      return ok(result);
    } catch (err) {
      // Capturo cualquier error inesperado y retorno un failure tipado
      this.logger.error('GetProducts failed unexpectedly', err instanceof Error ? err.stack : String(err));
      return fail({ code: ErrorCode.INTERNAL_ERROR });
    }
  }
}
