// Controller de productos — solo orquesta, no tiene lógica de negocio.
// Recibe la petición HTTP, la delega al use case correspondiente y decide el status HTTP.
import { Controller, Get, Param, Query, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GetProductsUseCase } from '../../application/use-cases/get-products.use-case.js';
import { GetProductByIdUseCase } from '../../application/use-cases/get-product-by-id.use-case.js';
import { ProductResponseDto } from './dto/product-response.dto.js';
import { PaginationDto } from '../../../shared/dto/pagination.dto.js';
import { ErrorCode } from '../../../shared/result/result.js';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  private readonly logger = new Logger(ProductsController.name);

  constructor(
    private readonly getProductsUseCase: GetProductsUseCase,
    private readonly getProductByIdUseCase: GetProductByIdUseCase,
  ) {}

  // Lista paginada de productos — el frontend la usa para renderizar la tienda
  @Get()
  @ApiOperation({ summary: 'Listar productos disponibles con stock (paginado)' })
  @ApiResponse({ status: 200, type: [ProductResponseDto] })
  async findAll(@Query() pagination: PaginationDto) {
    const { page = 1, limit = 10 } = pagination;
    this.logger.log(`GET /products page=${page} limit=${limit}`);

    const result = await this.getProductsUseCase.execute(page, limit);

    if (!result.success) {
      throw new HttpException({ code: result.error.code }, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return result.value;
  }

  // Detalle de un producto — se usa en el paso 1 cuando el usuario selecciona un producto
  @Get(':id')
  @ApiOperation({ summary: 'Obtener producto por ID' })
  @ApiResponse({ status: 200, type: ProductResponseDto })
  @ApiResponse({ status: 404, description: ErrorCode.PRODUCT_NOT_FOUND })
  async findOne(@Param('id') id: string) {
    this.logger.log(`GET /products/${id}`);

    const result = await this.getProductByIdUseCase.execute(id);

    if (!result.success) {
      const status = result.error.code === ErrorCode.PRODUCT_NOT_FOUND
        ? HttpStatus.UNPROCESSABLE_ENTITY
        : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException({ code: result.error.code }, status);
    }

    return result.value;
  }
}
