import { Controller, Get, Param, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GetDeliveryUseCase } from '../../application/use-cases/get-delivery.use-case.js';
import { ErrorCode } from '../../../shared/result/result.js';

@ApiTags('deliveries')
@Controller('deliveries')
export class DeliveriesController {
  constructor(private readonly getDeliveryUseCase: GetDeliveryUseCase) {}

  @Get('transaction/:transactionId')
  @ApiOperation({ summary: 'Obtener entrega por ID de transacción' })
  @ApiResponse({ status: 200, description: 'Entrega encontrada' })
  @ApiResponse({ status: 404, description: ErrorCode.TRANSACTION_NOT_FOUND })
  async findByTransaction(@Param('transactionId') transactionId: string) {
    const result = await this.getDeliveryUseCase.execute(transactionId);
    if (!result.success) {
      const status = result.error.code === ErrorCode.TRANSACTION_NOT_FOUND ? HttpStatus.NOT_FOUND : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException({ code: result.error.code }, status);
    }
    return result.value;
  }
}
