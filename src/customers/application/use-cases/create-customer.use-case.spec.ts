import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateCustomerUseCase } from './create-customer.use-case.js';
import { CustomerRepositoryPort, CreateCustomerData } from '../../domain/customer.repository.port.js';
import { ErrorCode, type Success } from '../../../shared/result/result.js';
import type { Customer } from '../../domain/customer.entity.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockInput: CreateCustomerData = {
  name: 'Juan Palacio',
  email: 'juan@test.com',
  phone: '3001234567',
  address: 'Calle 123 # 45-67',
  city: 'Bogotá',
};

const mockCustomer: Customer = {
  id: 'cust-uuid-1',
  ...mockInput,
  createdAt: new Date('2026-01-01'),
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CreateCustomerUseCase', () => {
  let useCase: CreateCustomerUseCase;
  let customerRepo: CustomerRepositoryPort;

  beforeEach(() => {
    customerRepo = {
      create: vi.fn(),
      findById: vi.fn(),
    } as unknown as CustomerRepositoryPort;

    useCase = new CreateCustomerUseCase(customerRepo);
  });

  it('Debería devolver «ok» con el cliente creado', async () => {
    vi.mocked(customerRepo.create).mockResolvedValue(mockCustomer)

    const result = await useCase.execute(mockInput)

    expect(result.success).toBe(true)
    expect((result as Success<Customer>).value).toEqual(mockCustomer)
  });

  it('Debería llamar al repositorio con los datos correctos', async () => {
    vi.mocked(customerRepo.create).mockResolvedValue(mockCustomer)

    await useCase.execute(mockInput)

    expect(customerRepo.create).toHaveBeenCalledWith(mockInput)
  });

  it('Debería devolver un fallo con INTERNAL_ERROR cuando el repositorio lance una excepción', async () => {
    vi.mocked(customerRepo.create).mockRejectedValue(new Error('DB error'))

    const result = await useCase.execute(mockInput)

    expect(result).toEqual({ success: false, error: { code: ErrorCode.INTERNAL_ERROR } })
  });

  it('Debería devolver un fallo con INTERNAL_ERROR ante una violación NOT NULL (23502)', async () => {
    const dbErr = Object.assign(new Error('null value in column'), { code: '23502' })
    vi.mocked(customerRepo.create).mockRejectedValue(dbErr)

    const result = await useCase.execute(mockInput)

    expect(result).toEqual({ success: false, error: { code: ErrorCode.INTERNAL_ERROR } })
  });
});
