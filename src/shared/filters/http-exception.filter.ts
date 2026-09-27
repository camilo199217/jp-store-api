import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { ErrorCode } from '../result/result.js';

interface ErrorBody {
  code?: string;
}

// Códigos de error de PostgreSQL que necesito manejar explícitamente
// https://www.postgresql.org/docs/current/errcodes-appendix.html
const PG_UNIQUE_VIOLATION    = '23505';
const PG_CHECK_VIOLATION     = '23514';
const PG_FK_VIOLATION        = '23503';
const PG_NOT_NULL_VIOLATION  = '23502';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let code: string;

    if (exception instanceof HttpException) {
      // Excepción HTTP lanzada explícitamente por un controlador o use-case
      status = exception.getStatus();
      const body = exception.getResponse() as ErrorBody | string;
      code = typeof body === 'object' && body.code ? body.code : this.inferCode(status);

    } else if (exception instanceof QueryFailedError) {
      // Error de la base de datos — mapeo el código PG a nuestro ErrorCode
      const pgCode = (exception as QueryFailedError & { code?: string }).code;
      [status, code] = this.mapDatabaseError(pgCode, exception.message);
      this.logger.error(`DB error pg=${pgCode} → ${code}: ${exception.message}`);

    } else {
      // Cualquier otro error no controlado
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      code = ErrorCode.INTERNAL_ERROR;
      this.logger.error('Unhandled exception', exception instanceof Error ? exception.stack : String(exception));
    }

    response.status(status).json({
      success: false,
      error: { code },
      meta: { timestamp: new Date().toISOString() },
    });

    this.logger.warn(`[${request.method}] ${request.url} → ${status} ${code}`);
  }

  // Mapea códigos de error de PostgreSQL a HTTP status + ErrorCode nuestro
  private mapDatabaseError(pgCode: string | undefined, message: string): [number, string] {
    switch (pgCode) {
      case PG_UNIQUE_VIOLATION:
        // Averiguo qué constraint es para dar un código más específico
        if (message.includes('gateway_reference') || message.includes('gateway_transaction_id')) {
          return [HttpStatus.CONFLICT, ErrorCode.DUPLICATE_TRANSACTION];
        }
        return [HttpStatus.CONFLICT, ErrorCode.DUPLICATE_RESOURCE];

      case PG_CHECK_VIOLATION:
        // Violación de check constraint — normalmente stock negativo o monto inválido
        if (message.includes('stock')) {
          return [HttpStatus.UNPROCESSABLE_ENTITY, ErrorCode.INSUFFICIENT_STOCK];
        }
        return [HttpStatus.UNPROCESSABLE_ENTITY, ErrorCode.CONSTRAINT_VIOLATION];

      case PG_FK_VIOLATION:
        // FK rota — el producto o cliente referenciado no existe
        if (message.includes('product')) {
          return [HttpStatus.UNPROCESSABLE_ENTITY, ErrorCode.PRODUCT_NOT_FOUND];
        }
        if (message.includes('customer')) {
          return [HttpStatus.UNPROCESSABLE_ENTITY, ErrorCode.CUSTOMER_NOT_FOUND];
        }
        return [HttpStatus.UNPROCESSABLE_ENTITY, ErrorCode.CONSTRAINT_VIOLATION];

      case PG_NOT_NULL_VIOLATION:
        return [HttpStatus.BAD_REQUEST, ErrorCode.VALIDATION_ERROR];

      default:
        return [HttpStatus.INTERNAL_SERVER_ERROR, ErrorCode.INTERNAL_ERROR];
    }
  }

  private inferCode(status: number): string {
    const map: Record<number, string> = {
      400: ErrorCode.VALIDATION_ERROR,
      409: ErrorCode.DUPLICATE_TRANSACTION,
      422: ErrorCode.PAYMENT_ERROR,
      500: ErrorCode.INTERNAL_ERROR,
      503: ErrorCode.PAYMENT_GATEWAY_UNAVAILABLE,
    };
    return map[status] ?? ErrorCode.INTERNAL_ERROR;
  }
}
