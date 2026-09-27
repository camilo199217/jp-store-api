import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProcessPaymentUseCase, ProcessPaymentInput } from './process-payment.use-case.js';
import { TransactionRepositoryPort } from '../../domain/transaction.repository.port.js';
import { DeliveryRepositoryPort } from '../../../deliveries/domain/delivery.repository.port.js';
import { ProductRepositoryPort } from '../../../products/domain/product.repository.port.js';
import { CustomerRepositoryPort } from '../../../customers/domain/customer.repository.port.js';
import { PaymentGatewayPort } from '../../../payment-gateway/payment-gateway.port.js';
import { ErrorCode, type Success } from '../../../shared/result/result.js';
import { TransactionStatus } from '../../domain/transaction.entity.js';
import type { Product } from '../../../products/domain/product.entity.js';
import type { Customer } from '../../../customers/domain/customer.entity.js';
import type { Transaction } from '../../domain/transaction.entity.js';
import type { ProcessPaymentOutput } from './process-payment.use-case.js';

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

const mockProductNoStock: Product = { ...mockProduct, stock: 0 };
const mockProductUnavailable: Product = { ...mockProduct, isAvailable: false };

const mockCustomer: Customer = {
  id: 'cust-uuid-1',
  name: 'Juan Palacio',
  email: 'juan@test.com',
  phone: '3001234567',
  address: 'Calle 123 # 45-67',
  city: 'Bogotá',
  createdAt: new Date('2026-01-01'),
};

const mockTransaction: Transaction = {
  id: 'tx-uuid-1',
  customerId: 'cust-uuid-1',
  productId: 'prod-uuid-1',
  status: TransactionStatus.PENDING,
  amountInCents: 18990000,
  baseFeeInCents: 300000,
  deliveryFeeInCents: 500000,
  totalAmountInCents: 19790000,
  gatewayTransactionId: null,
  gatewayReference: 'REF-test-123',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockTransactionApproved: Transaction = {
  ...mockTransaction,
  status: TransactionStatus.APPROVED,
  gatewayTransactionId: 'gateway-tx-id-1',
};

const mockInput: ProcessPaymentInput = {
  customerId: 'cust-uuid-1',
  productId: 'prod-uuid-1',
  customerEmail: 'juan@test.com',
  cardToken: 'tok_test_abc123',
  acceptanceToken: 'acc_token_xyz',
  installments: 1,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ProcessPaymentUseCase', () => {
  let useCase: ProcessPaymentUseCase;
  let transactionRepo: TransactionRepositoryPort;
  let deliveryRepo: DeliveryRepositoryPort;
  let productRepo: ProductRepositoryPort;
  let customerRepo: CustomerRepositoryPort;
  let paymentGateway: PaymentGatewayPort;
  let dataSource: { transaction: ReturnType<typeof vi.fn> };
  let config: { getOrThrow: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    transactionRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      updateStatus: vi.fn(),
    } as unknown as TransactionRepositoryPort;

    deliveryRepo = {
      create: vi.fn(),
      findByTransactionId: vi.fn(),
    } as unknown as DeliveryRepositoryPort;

    productRepo = {
      findAll: vi.fn(),
      findById: vi.fn(),
      decrementStock: vi.fn(),
    } as unknown as ProductRepositoryPort;

    customerRepo = {
      create: vi.fn(),
      findById: vi.fn().mockResolvedValue(mockCustomer),
    } as unknown as CustomerRepositoryPort;

    paymentGateway = {
      createTransaction: vi.fn(),
      getAcceptanceToken: vi.fn(),
      getTransaction: vi.fn(),
    } as unknown as PaymentGatewayPort;

    dataSource = {
      transaction: vi.fn(async (cb) => cb({})),
    };

    config = {
      getOrThrow: vi.fn((key: string) => {
        if (key === 'BASE_FEE') return 300000;
        if (key === 'DELIVERY_FEE') return 500000;
        return null;
      }),
    };

    useCase = new ProcessPaymentUseCase(
      transactionRepo,
      deliveryRepo,
      productRepo,
      customerRepo,
      paymentGateway,
      dataSource as any,
      config as any,
    );
  });

  // ── Validaciones de producto y cliente ────────────────────────────────────

  it('Debería devolver un fallo con PRODUCT_NOT_FOUND cuando el producto no existe', async () => {
    vi.mocked(productRepo.findById).mockResolvedValue(null)

    const result = await useCase.execute(mockInput)

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe(ErrorCode.PRODUCT_NOT_FOUND)
  });

  it('Debería devolver un fallo con INSUFFICIENT_STOCK cuando el stock es 0', async () => {
    vi.mocked(productRepo.findById).mockResolvedValue(mockProductNoStock)

    const result = await useCase.execute(mockInput)

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe(ErrorCode.INSUFFICIENT_STOCK)
  });

  it('Debería devolver un fallo con INSUFFICIENT_STOCK cuando el producto no está disponible', async () => {
    vi.mocked(productRepo.findById).mockResolvedValue(mockProductUnavailable)

    const result = await useCase.execute(mockInput)

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe(ErrorCode.INSUFFICIENT_STOCK)
  });

  it('Debería devolver un fallo con INTERNAL_ERROR cuando el cliente no existe', async () => {
    vi.mocked(productRepo.findById).mockResolvedValue(mockProduct)
    vi.mocked(customerRepo.findById).mockResolvedValue(null)

    const result = await useCase.execute(mockInput)

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe(ErrorCode.INTERNAL_ERROR)
  });

  // ── Creación de transacción ────────────────────────────────────────────────

  it('Debería crear la transacción en estado PENDING antes de llamar al gateway de pago', async () => {
    const callOrder: string[] = []

    vi.mocked(productRepo.findById).mockResolvedValue(mockProduct)
    vi.mocked(transactionRepo.create).mockImplementation(async () => {
      callOrder.push('create')
      return mockTransaction
    })
    vi.mocked(paymentGateway.createTransaction).mockImplementation(async () => {
      callOrder.push('gateway')
      return { id: 'g1', status: 'APPROVED' }
    })
    vi.mocked(transactionRepo.findById).mockResolvedValue(mockTransactionApproved)

    await useCase.execute(mockInput)

    expect(callOrder).toEqual(['create', 'gateway'])
  });

  it('Debería calcular el total correctamente: monto + tarifa base + tarifa de envío', async () => {
    vi.mocked(productRepo.findById).mockResolvedValue(mockProduct)
    vi.mocked(transactionRepo.create).mockResolvedValue(mockTransaction)
    vi.mocked(paymentGateway.createTransaction).mockResolvedValue({ id: 'g1', status: 'APPROVED' })
    vi.mocked(transactionRepo.findById).mockResolvedValue(mockTransactionApproved)

    await useCase.execute(mockInput)

    expect(transactionRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      totalAmountInCents: 18990000 + 300000 + 500000,
    }))
  });

  // ── Flujo APPROVED ────────────────────────────────────────────────────────

  it('Debería ejecutar la transacción atómica en BD cuando el gateway retorna APPROVED', async () => {
    vi.mocked(productRepo.findById).mockResolvedValue(mockProduct)
    vi.mocked(transactionRepo.create).mockResolvedValue(mockTransaction)
    vi.mocked(paymentGateway.createTransaction).mockResolvedValue({ id: 'g1', status: 'APPROVED' })
    vi.mocked(transactionRepo.findById).mockResolvedValue(mockTransactionApproved)

    await useCase.execute(mockInput)

    expect(dataSource.transaction).toHaveBeenCalledOnce()
    expect(productRepo.decrementStock).toHaveBeenCalledWith('prod-uuid-1', expect.anything(), expect.any(Number))
    expect(deliveryRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ address: mockCustomer.address, city: mockCustomer.city }),
      expect.anything(),
    )
  });

  it('Debería NO decrementar el stock cuando el pago es DECLINED', async () => {
    vi.mocked(productRepo.findById).mockResolvedValue(mockProduct)
    vi.mocked(transactionRepo.create).mockResolvedValue(mockTransaction)
    vi.mocked(paymentGateway.createTransaction).mockResolvedValue({ id: 'g1', status: 'DECLINED' })
    vi.mocked(transactionRepo.findById).mockResolvedValue({ ...mockTransaction, status: TransactionStatus.DECLINED })

    await useCase.execute(mockInput)

    expect(productRepo.decrementStock).not.toHaveBeenCalled()
    expect(dataSource.transaction).not.toHaveBeenCalled()
  });

  it('Debería NO decrementar el stock cuando el pago es ERROR', async () => {
    vi.mocked(productRepo.findById).mockResolvedValue(mockProduct)
    vi.mocked(transactionRepo.create).mockResolvedValue(mockTransaction)
    vi.mocked(paymentGateway.createTransaction).mockResolvedValue({ id: 'g1', status: 'ERROR' })
    vi.mocked(transactionRepo.findById).mockResolvedValue({ ...mockTransaction, status: TransactionStatus.ERROR })

    await useCase.execute(mockInput)

    expect(productRepo.decrementStock).not.toHaveBeenCalled()
  });

  it('Debería devolver «ok» con la transacción y el estado del gateway cuando el pago es APPROVED', async () => {
    vi.mocked(productRepo.findById).mockResolvedValue(mockProduct)
    vi.mocked(transactionRepo.create).mockResolvedValue(mockTransaction)
    vi.mocked(paymentGateway.createTransaction).mockResolvedValue({ id: 'g1', status: 'APPROVED' })
    vi.mocked(transactionRepo.findById).mockResolvedValue(mockTransactionApproved)

    const result = await useCase.execute(mockInput)

    expect(result.success).toBe(true)
    if (result.success) {
      expect((result as Success<ProcessPaymentOutput>).value.gatewayStatus).toBe('APPROVED')
      expect((result as Success<ProcessPaymentOutput>).value.transaction).toBeDefined()
    }
  });

  it('Debería devolver «ok» cuando el pago es DECLINED (flujo completado, no es error de sistema)', async () => {
    vi.mocked(productRepo.findById).mockResolvedValue(mockProduct)
    vi.mocked(transactionRepo.create).mockResolvedValue(mockTransaction)
    vi.mocked(paymentGateway.createTransaction).mockResolvedValue({ id: 'g1', status: 'DECLINED' })
    vi.mocked(transactionRepo.findById).mockResolvedValue({ ...mockTransaction, status: TransactionStatus.DECLINED })

    const result = await useCase.execute(mockInput)

    expect(result.success).toBe(true)
    if (result.success) {
      expect((result as Success<ProcessPaymentOutput>).value.gatewayStatus).toBe('DECLINED')
    }
  });

  // ── Manejo de errores del gateway ─────────────────────────────────────────

  it('Debería actualizar la transacción a ERROR cuando la llamada al gateway de pago falla', async () => {
    vi.mocked(productRepo.findById).mockResolvedValue(mockProduct)
    vi.mocked(transactionRepo.create).mockResolvedValue(mockTransaction)
    vi.mocked(paymentGateway.createTransaction).mockRejectedValue(new Error('timeout'))

    await useCase.execute(mockInput)

    expect(transactionRepo.updateStatus).toHaveBeenCalledWith(
      mockTransaction.id, TransactionStatus.ERROR, null
    )
  });

  it('Debería devolver un fallo con PAYMENT_GATEWAY_UNAVAILABLE cuando el gateway lanza una excepción', async () => {
    vi.mocked(productRepo.findById).mockResolvedValue(mockProduct)
    vi.mocked(transactionRepo.create).mockResolvedValue(mockTransaction)
    vi.mocked(paymentGateway.createTransaction).mockRejectedValue(new Error('timeout'))

    const result = await useCase.execute(mockInput)

    expect(result).toEqual({ success: false, error: { code: ErrorCode.PAYMENT_GATEWAY_UNAVAILABLE } })
  });

  // ── Errores de constraint DB ──────────────────────────────────────────────

  it('Debería devolver un fallo con INTERNAL_ERROR cuando la transacción atómica falla (check constraint 23514)', async () => {
    vi.mocked(productRepo.findById).mockResolvedValue(mockProduct)
    vi.mocked(transactionRepo.create).mockResolvedValue(mockTransaction)
    vi.mocked(paymentGateway.createTransaction).mockResolvedValue({ id: 'g1', status: 'APPROVED' })

    const checkErr = Object.assign(new Error('check constraint'), { code: '23514' })
    dataSource.transaction = vi.fn().mockRejectedValue(checkErr)

    const result = await useCase.execute(mockInput)

    expect(result).toEqual({ success: false, error: { code: ErrorCode.INTERNAL_ERROR } })
  });

  it('Debería propagar la excepción cuando falla la creación de transacción por constraint único (23505)', async () => {
    // transactionRepo.create se llama fuera de cualquier try/catch en el use case,
    // por lo que una violación de unique constraint hace que la promesa rechace
    // en lugar de devolver un Result de fallo.
    vi.mocked(productRepo.findById).mockResolvedValue(mockProduct)

    const uniqueErr = Object.assign(new Error('duplicate key value'), { code: '23505' })
    vi.mocked(transactionRepo.create).mockRejectedValue(uniqueErr)

    await expect(useCase.execute(mockInput)).rejects.toThrow('duplicate key value')
  });
});
