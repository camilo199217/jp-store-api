import { Controller, Post, Get, Param, Body, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ProcessPaymentUseCase } from '../../application/use-cases/process-payment.use-case.js';
import { GetTransactionUseCase } from '../../application/use-cases/get-transaction.use-case.js';
import { ProcessPaymentDto } from './dto/process-payment.dto.js';
import { ErrorCode } from '../../../shared/result/result.js';

@ApiTags('transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(
    private readonly processPaymentUseCase: ProcessPaymentUseCase,
    private readonly getTransactionUseCase: GetTransactionUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Procesar pago con tarjeta de crédito' })
  @ApiResponse({ status: 201, description: 'Pago procesado' })
  @ApiResponse({ status: 409, description: ErrorCode.INSUFFICIENT_STOCK })
  @ApiResponse({ status: 422, description: ErrorCode.PAYMENT_DECLINED })
  async processPayment(@Body() dto: ProcessPaymentDto) {
    const result = await this.processPaymentUseCase.execute(dto);
    if (!result.success) {
      const statusMap: Record<string, number> = {
        [ErrorCode.PRODUCT_NOT_FOUND]: HttpStatus.UNPROCESSABLE_ENTITY,
        [ErrorCode.INSUFFICIENT_STOCK]: HttpStatus.CONFLICT,
        [ErrorCode.PAYMENT_DECLINED]: HttpStatus.UNPROCESSABLE_ENTITY,
        [ErrorCode.PAYMENT_ERROR]: HttpStatus.UNPROCESSABLE_ENTITY,
        [ErrorCode.PAYMENT_GATEWAY_UNAVAILABLE]: HttpStatus.SERVICE_UNAVAILABLE,
      };
      const status = statusMap[result.error.code] ?? HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException({ code: result.error.code }, status);
    }
    return result.value;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener transacción por ID (resiliencia en refresh)' })
  @ApiResponse({ status: 200, description: 'Transacción encontrada' })
  @ApiResponse({ status: 404, description: ErrorCode.TRANSACTION_NOT_FOUND })
  async findOne(@Param('id') id: string) {
    const result = await this.getTransactionUseCase.execute(id);
    if (!result.success) {
      const status = result.error.code === ErrorCode.TRANSACTION_NOT_FOUND ? HttpStatus.UNPROCESSABLE_ENTITY : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException({ code: result.error.code }, status);
    }
    return result.value;
  }
}
