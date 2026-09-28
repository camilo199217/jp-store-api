import { Controller, Post, Get, Param, Body, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { ProcessPaymentUseCase } from '../../application/use-cases/process-payment.use-case.js';
import { GetTransactionUseCase } from '../../application/use-cases/get-transaction.use-case.js';
import { ProcessPaymentDto } from './dto/process-payment.dto.js';
import { ErrorCode } from '../../../shared/result/result.js';

const TRANSACTION_RESPONSE_EXAMPLE = {
  id: 'a1b2c3d4-0000-0000-0000-000000000000',
  customerId: 'cust-uuid',
  productId: 'prod-uuid',
  quantity: 1,
  status: 'APPROVED',
  amountInCents: 18990000,
  baseFeeInCents: 1500000,
  deliveryFeeInCents: 890000,
  totalAmountInCents: 21380000,
  gatewayTransactionId: '123456-1234567890-1234567',
  gatewayReference: 'jp-store-ref-abc123',
  createdAt: '2026-01-01T00:00:00.000Z',
};

@ApiTags('transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(
    private readonly processPaymentUseCase: ProcessPaymentUseCase,
    private readonly getTransactionUseCase: GetTransactionUseCase,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Procesar pago con tarjeta de crédito',
    description: `
**Flujo de 2 pasos previos requeridos:**

1. Crear cliente → \`POST /api/v1/customers\` → obtener \`customerId\`
2. Obtener \`acceptanceToken\` → \`GET https://api-sandbox.co.uat.wompi.dev/v1/merchants/{pub_key}\`
3. Tokenizar tarjeta → \`POST https://api-sandbox.co.uat.wompi.dev/v1/tokens/cards\` → obtener \`cardToken\`

**Tarjetas de sandbox disponibles:**

| Marca | Número | Resultado |
|---|---|---|
| Visa | 4242 4242 4242 4242 | APPROVED |
| Visa | 4111 1111 1111 1111 | DECLINED |
| Mastercard | 5254 1336 7443 8670 | APPROVED |
| Mastercard | 5399 2420 7311 1197 | DECLINED |

CVV: cualquier 3 dígitos · Vencimiento: cualquier fecha futura
    `,
  })
  @ApiBody({
    type: ProcessPaymentDto,
    examples: {
      aprobado: {
        summary: 'Pago aprobado (Visa sandbox)',
        description: 'Usa la tarjeta 4242 4242 4242 4242 — resultado APPROVED',
        value: {
          customerId: '00000000-0000-0000-0000-000000000000',
          productId: '00000000-0000-0000-0000-000000000000',
          cardToken: 'tok_stagtest_5432_D28671de3B4f65c3bb616d7F23C3d12D',
          acceptanceToken: 'eyJhbGciOiJIUzI1NiJ9.eyJjb250cmFjdF9pZCI6MjYsInBlcm1hbGluayI6Imh0dHBzOi8vd29tcGkuY28vd3AtY29udGVudC91cGxvYWRzLzIwMjMvMDYvVGVybWlub3MteS1Db25kaWNpb25lcy1kZS1Vc28tQ2xpZW50ZXMtV29tcGkucGRmIiwiZmlsZV9oYXNoIjoiZDMwODdlZGI5MzhlOWYxYzlhMDliNGJkNzM3MDY3Y2YiLCJqd3RfdXVpZCI6ImU0MzU0OGJkLTZjMjEtNGJlYS04MGZiLTU5YTIyOTZiOTQ3NCIsImVuZF9kYXRlIjoiMjAyNi0xMC0wMlQwMDowMDowMC4wMDBaIiwiY3JlYXRlZF9hdCI6IjIwMjYtMDktMjZUMTg6MDI6MjEuNjI5WiJ9.GHEqaA6A0OQWxHp3RjcEg39e1pFbKtbEBOjUYdW16d0',
          installments: 1,
          customerEmail: 'juan@email.com',
          quantity: 1,
        },
      },
      declinado: {
        summary: 'Pago declinado (Visa sandbox)',
        description: 'Usa la tarjeta 4111 1111 1111 1111 — resultado DECLINED',
        value: {
          customerId: '00000000-0000-0000-0000-000000000000',
          productId: '00000000-0000-0000-0000-000000000000',
          cardToken: 'tok_stagtest_declined_xxxx',
          acceptanceToken: 'eyJhbGciOiJIUzI1NiJ9...',
          installments: 1,
          customerEmail: 'juan@email.com',
          quantity: 1,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Pago procesado. El campo `status` puede ser APPROVED, DECLINED o ERROR.',
    schema: {
      example: {
        success: true,
        data: TRANSACTION_RESPONSE_EXAMPLE,
        meta: { timestamp: '2026-01-01T00:00:00.000Z' },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Stock insuficiente',
    schema: { example: { code: ErrorCode.INSUFFICIENT_STOCK } },
  })
  @ApiResponse({
    status: 422,
    description: 'Pago declinado por el gateway o producto no encontrado',
    schema: { example: { code: ErrorCode.PAYMENT_DECLINED } },
  })
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
  @ApiOperation({
    summary: 'Obtener transacción por ID',
    description: 'Usado para recuperar el estado de una transacción en caso de refresh del browser.',
  })
  @ApiParam({ name: 'id', description: 'UUID de la transacción', example: 'a1b2c3d4-0000-0000-0000-000000000000' })
  @ApiResponse({
    status: 200,
    description: 'Transacción encontrada',
    schema: {
      example: {
        success: true,
        data: TRANSACTION_RESPONSE_EXAMPLE,
        meta: { timestamp: '2026-01-01T00:00:00.000Z' },
      },
    },
  })
  @ApiResponse({
    status: 422,
    description: 'Transacción no encontrada',
    schema: { example: { code: ErrorCode.TRANSACTION_NOT_FOUND } },
  })
  async findOne(@Param('id') id: string) {
    const result = await this.getTransactionUseCase.execute(id);
    if (!result.success) {
      const status = result.error.code === ErrorCode.TRANSACTION_NOT_FOUND ? HttpStatus.UNPROCESSABLE_ENTITY : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException({ code: result.error.code }, status);
    }
    return result.value;
  }
}
