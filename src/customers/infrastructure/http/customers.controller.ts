// Controller de clientes — registra al comprador durante el flujo de checkout.
// Solo el POST es necesario; no expongo listado de clientes por seguridad (datos personales).
import { Controller, Post, Body, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateCustomerUseCase } from '../../application/use-cases/create-customer.use-case.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { ErrorCode } from '../../../shared/result/result.js';

@ApiTags('customers')
@Controller('customers')
export class CustomersController {
  private readonly logger = new Logger(CustomersController.name);

  constructor(private readonly createCustomerUseCase: CreateCustomerUseCase) {}

  // Crea el cliente con sus datos de contacto y entrega durante el paso 2 del checkout
  @Post()
  @ApiOperation({ summary: 'Registrar cliente para el checkout' })
  @ApiResponse({ status: 201, description: 'Cliente creado exitosamente' })
  @ApiResponse({ status: 400, description: ErrorCode.VALIDATION_ERROR })
  async create(@Body() dto: CreateCustomerDto) {
    this.logger.log(`POST /customers email=${dto.email}`);

    const result = await this.createCustomerUseCase.execute(dto);

    if (!result.success) {
      this.logger.warn(`CreateCustomer failed code=${result.error.code}`);
      throw new HttpException({ code: result.error.code }, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    this.logger.log(`Customer created successfully id=${result.value.id}`);
    return result.value;
  }
}
