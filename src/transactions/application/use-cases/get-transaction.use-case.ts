// Caso de uso: obtener una transacción por ID.
// Si el estado está en PENDING, consulta el gateway de pago para ver si ya se resolvió.
// Si resolvió en APPROVED, ejecuta la transacción atómica: actualiza estado + descuenta stock + crea entrega.
import { Inject, Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TRANSACTION_REPOSITORY, TransactionRepositoryPort } from '../../domain/transaction.repository.port.js';
import { DELIVERY_REPOSITORY, DeliveryRepositoryPort } from '../../../deliveries/domain/delivery.repository.port.js';
import { PRODUCT_REPOSITORY, ProductRepositoryPort } from '../../../products/domain/product.repository.port.js';
import { PAYMENT_GATEWAY_ADAPTER, PaymentGatewayPort } from '../../../payment-gateway/payment-gateway.port.js';
import { ok, fail, Result, ErrorCode } from '../../../shared/result/result.js';
import { type Transaction, TransactionStatus } from '../../domain/transaction.entity.js';

@Injectable()
export class GetTransactionUseCase {
  private readonly logger = new Logger(GetTransactionUseCase.name);

  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepository: TransactionRepositoryPort,
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepositoryPort,
    @Inject(DELIVERY_REPOSITORY)
    private readonly deliveryRepository: DeliveryRepositoryPort,
    @Inject(PAYMENT_GATEWAY_ADAPTER)
    private readonly paymentGateway: PaymentGatewayPort,
    private readonly dataSource: DataSource,
  ) {}

  async execute(id: string): Promise<Result<Transaction>> {
    this.logger.log(`Executing GetTransaction id=${id}`);

    try {
      const transaction = await this.transactionRepository.findById(id);

      if (!transaction) {
        this.logger.warn(`Transaction not found id=${id}`);
        return fail({ code: ErrorCode.TRANSACTION_NOT_FOUND });
      }

      // Si está en PENDING, consulta el gateway para obtener el estado actual
      if (transaction.status === TransactionStatus.PENDING && transaction.gatewayTransactionId) {
        try {
          const gatewayTx = await this.paymentGateway.getTransaction(transaction.gatewayTransactionId);
          if (gatewayTx.status !== 'PENDING') {
            const newStatus = TransactionStatus[gatewayTx.status as keyof typeof TransactionStatus];
            this.logger.log(`Updating transaction ${id} from PENDING to ${newStatus}`);

            if (newStatus === TransactionStatus.APPROVED) {
              // Transacción atómica: estado + stock + entrega
              await this.dataSource.transaction(async (manager) => {
                await this.transactionRepository.updateStatus(id, TransactionStatus.APPROVED, gatewayTx.id, manager);
                await this.productRepository.decrementStock(transaction.productId, manager, transaction.quantity);
                await this.deliveryRepository.create({
                  transactionId: id,
                  customerId: transaction.customerId,
                  productId: transaction.productId,
                  address: '',
                  city: '',
                }, manager);
              });
            } else {
              await this.transactionRepository.updateStatus(id, newStatus, gatewayTx.id);
            }

            transaction.status = newStatus;
          }
        } catch (err) {
          // Si falla la consulta al gateway, devolvemos lo que tenemos en DB
          this.logger.warn(`Could not refresh status from payment gateway for id=${id}`, err instanceof Error ? err.message : String(err));
        }
      }

      this.logger.log(`GetTransaction OK id=${id} status=${transaction.status}`);
      return ok(transaction);
    } catch (err) {
      this.logger.error(`GetTransaction failed id=${id}`, err instanceof Error ? err.stack : String(err));
      return fail({ code: ErrorCode.INTERNAL_ERROR });
    }
  }
}
