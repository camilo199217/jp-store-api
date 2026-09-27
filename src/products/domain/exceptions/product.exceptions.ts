import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../../../shared/result/result.js';

export class ProductNotFoundException extends HttpException {
  constructor() {
    super({ code: ErrorCode.PRODUCT_NOT_FOUND }, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class InsufficientStockException extends HttpException {
  constructor() {
    super({ code: ErrorCode.INSUFFICIENT_STOCK }, HttpStatus.CONFLICT);
  }
}

export class ProductNotAvailableException extends HttpException {
  constructor() {
    super({ code: ErrorCode.PRODUCT_NOT_AVAILABLE }, HttpStatus.CONFLICT);
  }
}
