// Repositorio de clientes — adaptador de infraestructura que implementa el puerto del dominio.
// Uso QueryBuilder exclusivamente para tener control total sobre las queries.
import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CustomerTypeormEntity } from './customer.typeorm-entity.js';
import { CustomerRepositoryPort, CreateCustomerData } from '../../domain/customer.repository.port.js';
import type { Customer } from '../../domain/customer.entity.js';

@Injectable()
export class CustomerRepository extends CustomerRepositoryPort {
  private readonly logger = new Logger(CustomerRepository.name);

  constructor(private readonly dataSource: DataSource) {
    super();
  }

  // Inserta un nuevo cliente y retorna el registro completo con su UUID generado
  async create(data: CreateCustomerData): Promise<Customer> {
    this.logger.debug(`Inserting customer email=${data.email}`);

    const result = await this.dataSource
      .createQueryBuilder()
      .insert()
      .into(CustomerTypeormEntity)
      .values(data)
      .returning('*')
      .execute();

    const customer = result.generatedMaps[0] as Customer;
    this.logger.debug(`Customer inserted id=${customer.id}`);
    return customer;
  }

  // Busca un cliente por UUID — útil para validar que el cliente existe antes del pago
  async findById(id: string): Promise<Customer | null> {
    this.logger.debug(`Finding customer id=${id}`);

    const customer = await this.dataSource
      .createQueryBuilder(CustomerTypeormEntity, 'c')
      .where('c.id = :id', { id })
      .getOne();

    if (!customer) {
      this.logger.warn(`Customer not found id=${id}`);
    }

    return customer;
  }
}
