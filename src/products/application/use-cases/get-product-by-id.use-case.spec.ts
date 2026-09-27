import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetProductByIdUseCase } from './get-product-by-id.use-case.js';
import { ProductRepositoryPort } from '../../domain/product.repository.port.js';
import { ErrorCode, type Success } from '../../../shared/result/result.js';
import type { Product } from '../../domain/product.entity.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockProduct: Product = {
  id: 'prod-uuid-1',
  name: 'Audífonos Pro',
  description: 'Sonido premium',
  priceInCents: 18990000,
  stock: 5,
  imageUrl: 'https://example.com/img.jpg',
  isAvailable: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GetProductByIdUseCase', () => {
  let useCase: GetProductByIdUseCase;
  let productRepo: ProductRepositoryPort;

  beforeEach(() => {
    productRepo = {
      findAll: vi.fn(),
      findById: vi.fn(),
      decrementStock: vi.fn(),
    } as unknown as ProductRepositoryPort;

    useCase = new GetProductByIdUseCase(productRepo);
  });

  it('Debería devolver «ok» con el producto cuando se encuentra por id', async () => {
    vi.mocked(productRepo.findById).mockResolvedValue(mockProduct)
    const result = await useCase.execute(mockProduct.id)
    expect(result.success).toBe(true)
    expect((result as Success<Product>).value.id).toBe(mockProduct.id)
  });

  it('Debería llamar a findById con el id correcto', async () => {
    vi.mocked(productRepo.findById).mockResolvedValue(mockProduct)
    await useCase.execute(mockProduct.id)
    expect(productRepo.findById).toHaveBeenCalledWith(mockProduct.id)
  });

  it('Debería devolver un fallo con PRODUCT_NOT_FOUND cuando el producto no existe', async () => {
    vi.mocked(productRepo.findById).mockResolvedValue(null)
    const result = await useCase.execute(mockProduct.id)
    expect(result).toEqual({
      success: false,
      error: { code: ErrorCode.PRODUCT_NOT_FOUND }
    })
  });

  it('Debería devolver un fallo con INTERNAL_ERROR cuando el repositorio lance una excepción', async () => {
    vi.mocked(productRepo.findById).mockRejectedValue(new Error())
    const result = await useCase.execute(mockProduct.id)
    expect(result).toEqual({
      success: false,
      error: { code: ErrorCode.INTERNAL_ERROR }
    })
  });

  it('Debería devolver un fallo con INTERNAL_ERROR ante una violación de constraint única (23505)', async () => {
    const dbErr = Object.assign(new Error('check constraint'), { code: '23505' })
    vi.mocked(productRepo.findById).mockRejectedValue(dbErr)
    const result = await useCase.execute(mockProduct.id)

    expect(result).toEqual({
      success: false,
      error: { code: ErrorCode.INTERNAL_ERROR }
    })
  });
});
