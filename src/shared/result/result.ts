export type Success<T> = { success: true; value: T };
export type Failure<E> = { success: false; error: E };
export type Result<T, E = AppError> = Success<T> | Failure<E>;

export interface AppError {
  code: ErrorCode;
}

export enum ErrorCode {
  // Products / Stock
  PRODUCT_NOT_FOUND = 'PRODUCT_NOT_FOUND',
  INSUFFICIENT_STOCK = 'INSUFFICIENT_STOCK',
  PRODUCT_NOT_AVAILABLE = 'PRODUCT_NOT_AVAILABLE',

  // Transactions
  TRANSACTION_NOT_FOUND = 'TRANSACTION_NOT_FOUND',
  DUPLICATE_TRANSACTION = 'DUPLICATE_TRANSACTION',
  TRANSACTION_ALREADY_PROCESSED = 'TRANSACTION_ALREADY_PROCESSED',
  PAYMENT_DECLINED = 'PAYMENT_DECLINED',
  PAYMENT_ERROR = 'PAYMENT_ERROR',

  // Customers
  CUSTOMER_NOT_FOUND = 'CUSTOMER_NOT_FOUND',

  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_CARD_TOKEN = 'INVALID_CARD_TOKEN',

  // Database constraints
  DUPLICATE_RESOURCE = 'DUPLICATE_RESOURCE',       // unique constraint violation (23505)
  CONSTRAINT_VIOLATION = 'CONSTRAINT_VIOLATION',   // check / FK constraint violation (23514, 23503)

  // System
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  PAYMENT_GATEWAY_UNAVAILABLE = 'PAYMENT_GATEWAY_UNAVAILABLE',
}

export const ok = <T>(value: T): Success<T> => ({ success: true, value });
export const fail = <E extends AppError>(error: E): Failure<E> => ({ success: false, error });

export const isOk = <T, E>(result: Result<T, E>): result is Success<T> => result.success === true;
export const isFail = <T, E>(result: Result<T, E>): result is Failure<E> => result.success === false;
