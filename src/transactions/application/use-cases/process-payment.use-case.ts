import { Inject, Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { TRANSACTION_REPOSITORY, TransactionRepositoryPort } from '../../domain/transaction.repository.port.js';
import { DELIVERY_REPOSITORY, DeliveryRepositoryPort } from '../../../deliveries/domain/delivery.repository.port.js';
import { PRODUCT_REPOSITORY, ProductRepositoryPort } from '../../../products/domain/product.repository.port.js';
import { CUSTOMER_REPOSITORY, CustomerRepositoryPort } from '../../../customers/domain/customer.repository.port.js';
import { PAYMENT_GATEWAY_ADAPTER, PaymentGatewayPort } from '../../../payment-gateway/payment-gateway.port.js';
import { ok, fail, Result, ErrorCode } from '../../../shared/result/result.js';
import { TransactionStatus } from '../../domain/transaction.entity.js';
import type { Transaction } from '../../domain/transaction.entity.js';

export interface ProcessPaymentInput {
  customerId: string;
  productId: string;
  customerEmail: string;
  cardToken: string;
  acceptanceToken: string;
  installments: number;
  quantity?: number;
}

export interface ProcessPaymentOutput {
  transaction: Transaction;
  gatewayStatus: string;
}

@Injectable()
export class ProcessPaymentUseCase {
  private readonly logger = new Logger(ProcessPaymentUseCase.name);

  constructor(
    @Inject(TRANSACTION_REPOSITORY) private readonly transactionRepo: TransactionRepositoryPort,
    @Inject(DELIVERY_REPOSITORY) private readonly deliveryRepo: DeliveryRepositoryPort,
    @Inject(PRODUCT_REPOSITORY) private readonly productRepo: ProductRepositoryPort,
    @Inject(CUSTOMER_REPOSITORY) private readonly customerRepo: CustomerRepositoryPort,
    @Inject(PAYMENT_GATEWAY_ADAPTER) private readonly paymentGateway: PaymentGatewayPort,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  async execute(input: ProcessPaymentInput): Promise<Result<ProcessPaymentOutput>> {
    const quantity = input.quantity ?? 1;

    // 1. Verificar producto y cliente antes de cobrar
    const [product, customer] = await Promise.all([
      this.productRepo.findById(input.productId),
      this.customerRepo.findById(input.customerId),
    ]);
    if (!product) return fail({ code: ErrorCode.PRODUCT_NOT_FOUND });
    if (!product.isAvailable || product.stock < quantity) return fail({ code: ErrorCode.INSUFFICIENT_STOCK });
    if (!customer) return fail({ code: ErrorCode.INTERNAL_ERROR });

    const baseFeeInCents = this.config.getOrThrow<number>('BASE_FEE');
    const deliveryFeeInCents = this.config.getOrThrow<number>('DELIVERY_FEE');
    const amountInCents = product.priceInCents * quantity;
    const totalAmountInCents = amountInCents + Number(baseFeeInCents) + Number(deliveryFeeInCents);
    const gatewayReference = `REF-${randomUUID()}`;

    // 2. Crear transacción en PENDING (estado inicial antes de la respuesta del gateway)
    const transaction = await this.transactionRepo.create({
      customerId: input.customerId,
      productId: input.productId,
      quantity,
      amountInCents,
      baseFeeInCents: Number(baseFeeInCents),
      deliveryFeeInCents: Number(deliveryFeeInCents),
      totalAmountInCents,
      gatewayReference,
    });

    // 3. Llamar al payment gateway
    let gatewayResult;
    try {
      gatewayResult = await this.paymentGateway.createTransaction({
        amountInCents: totalAmountInCents,
        currency: 'COP',
        customerEmail: input.customerEmail,
        reference: gatewayReference,
        cardToken: input.cardToken,
        acceptanceToken: input.acceptanceToken,
        installments: input.installments,
      });
    } catch (err) {
      this.logger.error('Payment gateway call failed', err);
      await this.transactionRepo.updateStatus(transaction.id, TransactionStatus.ERROR, null);
      return fail({ code: ErrorCode.PAYMENT_GATEWAY_UNAVAILABLE });
    }

    const finalStatus = this.mapGatewayStatus(gatewayResult.status);

    // 4. Transacción atómica: actualizar estado + stock + delivery
    if (finalStatus === TransactionStatus.APPROVED) {
      try {
        await this.dataSource.transaction(async (manager) => {
          await this.transactionRepo.updateStatus(transaction.id, TransactionStatus.APPROVED, gatewayResult.id, manager);
          await this.productRepo.decrementStock(input.productId, manager, quantity);
          await this.deliveryRepo.create({
            transactionId: transaction.id,
            customerId: input.customerId,
            productId: input.productId,
            address: customer.address,
            city: customer.city,
          }, manager);
        });
      } catch (err) {
        this.logger.error('Atomic transaction failed', err);
        return fail({ code: ErrorCode.INTERNAL_ERROR });
      }
    } else {
      await this.transactionRepo.updateStatus(transaction.id, finalStatus, gatewayResult.id);
    }

    const updatedTransaction = await this.transactionRepo.findById(transaction.id);

    return ok({
      transaction: updatedTransaction ?? transaction,
      gatewayStatus: gatewayResult.status,
    });
  }

  private mapGatewayStatus(status: string): TransactionStatus {
    const map: Record<string, TransactionStatus> = {
      APPROVED: TransactionStatus.APPROVED,
      DECLINED: TransactionStatus.DECLINED,
      ERROR: TransactionStatus.ERROR,
      VOIDED: TransactionStatus.ERROR,
      PENDING: TransactionStatus.PENDING,
    };
    return map[status] ?? TransactionStatus.ERROR;
  }
}
