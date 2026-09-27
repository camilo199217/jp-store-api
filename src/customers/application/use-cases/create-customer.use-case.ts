// Caso de uso: registrar un nuevo cliente durante el checkout.
// El cliente se crea cada vez que alguien inicia el proceso de pago
// para mantener trazabilidad de quién compró qué.
import { Inject, Injectable, Logger } from '@nestjs/common';
import { CUSTOMER_REPOSITORY, CustomerRepositoryPort, CreateCustomerData } from '../../domain/customer.repository.port.js';
import { ok, fail, Result, ErrorCode } from '../../../shared/result/result.js';
import type { Customer } from '../../domain/customer.entity.js';

@Injectable()
export class CreateCustomerUseCase {
  private readonly logger = new Logger(CreateCustomerUseCase.name);

  constructor(
    @Inject(CUSTOMER_REPOSITORY)
    private readonly customerRepository: CustomerRepositoryPort,
  ) {}

  async execute(data: CreateCustomerData): Promise<Result<Customer>> {
    this.logger.log(`Creating customer email=${data.email}`);

    try {
      const customer = await this.customerRepository.create(data);

      this.logger.log(`Customer created id=${customer.id} email=${customer.email}`);
      return ok(customer);
    } catch (err) {
      this.logger.error('CreateCustomer failed', err instanceof Error ? err.stack : String(err));
      return fail({ code: ErrorCode.INTERNAL_ERROR });
    }
  }
}
