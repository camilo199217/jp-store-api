import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetProductsUseCase } from './get-products.use-case.js';
import { ProductRepositoryPort } from '../../domain/product.repository.port.js';
import { ErrorCode, type Success } from '../../../shared/result/result.js';
import type { Product } from '../../domain/product.entity.js';
import type { PaginatedResult } from '../../../shared/dto/pagination.dto.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockProduct: Product = {
  id: 'prod-uuid-1',
  name: 'Audífonos Pro',
  description: 'Sonido premium',
  priceInCents: 18990000,
  stock: 10,
  imageUrl: 'https://example.com/img.jpg',
  isAvailable: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

function buildPaginatedResult(items: Product[]): PaginatedResult<Product> {
  return { items, total: items.length, page: 1, limit: 9, totalPages: 1 };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GetProductsUseCase', () => {
  let useCase: GetProductsUseCase;
  let productRepo: ProductRepositoryPort;

  beforeEach(() => {
    productRepo = {
      findAll: vi.fn(),
      findById: vi.fn(),
      decrementStock: vi.fn(),
    } as unknown as ProductRepositoryPort;

    useCase = new GetProductsUseCase(productRepo);
  });

  it('Debería devolver «ok» con productos paginados cuando el repositorio devuelve datos', async () => {
    vi.mocked(productRepo.findAll).mockResolvedValue(buildPaginatedResult([mockProduct]))

    const result = await useCase.execute(1, 9)

    expect(result.success).toBe(true)
    expect((result as Success<PaginatedResult<Product>>).value.items).toHaveLength(1)
  });

  it('Debería llamar al repositorio con la página y el límite correctos', async () => {
    vi.mocked(productRepo.findAll).mockResolvedValue(buildPaginatedResult([mockProduct]))
    await useCase.execute(2, 5)
    expect(productRepo.findAll).toHaveBeenCalledWith(2, 5)
  });

  it('Debería devolver «ok» con una lista de elementos vacía cuando no existan productos', async () => {
    vi.mocked(productRepo.findAll).mockResolvedValue(buildPaginatedResult([]))

    const result = await useCase.execute(1, 9)

    expect(result.success).toBe(true)
    expect((result as Success<PaginatedResult<Product>>).value.items).toHaveLength(0)
  });

  it('Debería devolver un fallo con INTERNAL_ERROR cuando el repositorio lance una excepción', async () => {
    vi.mocked(productRepo.findAll).mockRejectedValue(new Error('DB connection lost'))

    const result = await useCase.execute(1, 9)

    expect(result).toEqual({
      success: false,
      error: { code: ErrorCode.INTERNAL_ERROR }
    })
  });

  it('Debería devolver un fallo con INTERNAL_ERROR ante un QueryFailedError de la BD', async () => {
    const dbErr = Object.assign(new Error('check constraint'), { code: '23514' })
    vi.mocked(productRepo.findAll).mockRejectedValue(dbErr)

    const result = await useCase.execute(1, 9)

    expect(result).toEqual({
      success: false,
      error: { code: ErrorCode.INTERNAL_ERROR }
    })
  });
});
