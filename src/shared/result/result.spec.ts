import { describe, it, expect } from 'vitest';
import { ok, fail, isOk, isFail, ErrorCode } from './result.js';

describe('Resultados: Helpers', () => {
  describe('ok()', () => {
    it('Debería generar un resultado de éxito con el valor proporcionado', () => {
      const input = 'hola'

      const result = ok(input)

      expect(result).toEqual({ success: true, value: input })
    });

    it('Debería establecer success en true', () => {
      const input = 'hola'

      const result = ok(input)

      expect(result.success).toBe(true)
    });

    it('Debería preservar los valores del objeto', () => {
      const input = { id: 1, name: 'Producto' }

      const result = ok(input)

      expect(result.value.id).toBe(1)
      expect(result.value.name).toBe('Producto')
    });
  });

  describe('fail()', () => {
    it('Debería generar un resultado de fallo con el error especificado', () => {
      const input = { code: ErrorCode.INTERNAL_ERROR }

      const result = fail(input)

      expect(result.error).toEqual(input)
    });

    it('Debería establecer success en false', () => {
      const input = { code: ErrorCode.INTERNAL_ERROR }

      const result = fail(input)

      expect(result.success).toBe(false)
    });

  });

  describe('isOk()', () => {
    it('Debería devolver true para un resultado exitoso', () => {
      const input = ok('hola')

      const result = isOk(input)

      expect(result).toBe(true)
    });

    it('Debería devolver falso para un resultado de fallo', () => {
      const input = fail({ code: ErrorCode.INTERNAL_ERROR })

      const result = isOk(input)

      expect(result).toBe(false)
    });
  });

  describe('isFail()', () => {
    it('Debería devolver verdadero para un resultado de falla', () => {
      const input = fail({ code: ErrorCode.INTERNAL_ERROR })

      const result = isFail(input)

      expect(result).toBe(true)
    });

    it('Debería devolver falso para un resultado exitoso', () => {
      const input = ok('hola')

      const result = isFail(input)

      expect(result).toBe(false)
    });
  });

  describe('ErrorCode', () => {
    it('Debería preservar todos los valores de ErrorCode', () => {
      const expectedCodes = [
        'PRODUCT_NOT_FOUND',
        'INSUFFICIENT_STOCK',
        'PRODUCT_NOT_AVAILABLE',
        'TRANSACTION_NOT_FOUND',
        'DUPLICATE_TRANSACTION',
        'TRANSACTION_ALREADY_PROCESSED',
        'PAYMENT_DECLINED',
        'PAYMENT_ERROR',
        'CUSTOMER_NOT_FOUND',
        'VALIDATION_ERROR',
        'INVALID_CARD_TOKEN',
        'DUPLICATE_RESOURCE',
        'CONSTRAINT_VIOLATION',
        'INTERNAL_ERROR',
        'PAYMENT_GATEWAY_UNAVAILABLE',
      ]

      expect(Object.values(ErrorCode)).toEqual(expectedCodes)
    });
  });
});
