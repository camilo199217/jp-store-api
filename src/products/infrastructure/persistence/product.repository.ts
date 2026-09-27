// Implementación concreta del repositorio de productos usando TypeORM + QueryBuilder.
// Esta clase vive en la capa de infraestructura: conoce TypeORM, pero el dominio no.
// Siempre uso QueryBuilder para tener control total sobre las queries y poder
// agregar locks, joins y condiciones complejas sin magia de ORM.
import { Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { ProductTypeormEntity } from './product.typeorm-entity.js';
import { ProductRepositoryPort } from '../../domain/product.repository.port.js';
import type { Product } from '../../domain/product.entity.js';
import { InsufficientStockException } from '../../domain/exceptions/product.exceptions.js';
import { buildPaginatedResult, type PaginatedResult } from '../../../shared/dto/pagination.dto.js';

@Injectable()
export class ProductRepository extends ProductRepositoryPort {
  private readonly logger = new Logger(ProductRepository.name);

  constructor(private readonly dataSource: DataSource) {
    super();
  }

  // Retorna lista paginada de productos disponibles ordenados por fecha de creación
  async findAll(page: number, limit: number): Promise<PaginatedResult<Product>> {
    const offset = (page - 1) * limit;

    this.logger.debug(`Fetching products page=${page} limit=${limit} offset=${offset}`);

    // Uso skip/take equivalente con QueryBuilder para paginación eficiente
    const [items, total] = await this.dataSource
      .createQueryBuilder(ProductTypeormEntity, 'p')
      .where('p.is_available = :available', { available: true })
      .orderBy('p.created_at', 'ASC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    this.logger.debug(`Found ${total} total products, returning ${items.length}`);

    return buildPaginatedResult(items as Product[], total, page, limit);
  }

  // Busca un producto por su UUID — retorna null si no existe
  async findById(id: string): Promise<Product | null> {
    this.logger.debug(`Finding product by id=${id}`);

    const product = await this.dataSource
      .createQueryBuilder(ProductTypeormEntity, 'p')
      .where('p.id = :id', { id })
      .getOne();

    if (!product) {
      this.logger.warn(`Product not found id=${id}`);
    }

    return product;
  }

  // Decrementa el stock en `quantity` unidades usando pessimistic lock (SELECT FOR UPDATE).
  // Esto garantiza que si dos usuarios compran al mismo tiempo, solo uno lo logra.
  // El EntityManager opcional permite participar en transacciones externas (pago atómico).
  async decrementStock(id: string, manager?: EntityManager, quantity = 1): Promise<void> {
    this.logger.log(`Decrementing stock for product id=${id} quantity=${quantity}`);

    const repo = manager
      ? manager.createQueryBuilder(ProductTypeormEntity, 'p')
      : this.dataSource.createQueryBuilder(ProductTypeormEntity, 'p');

    // El lock pesimista bloquea la fila hasta que termine la transacción
    const product = await repo
      .setLock('pessimistic_write')
      .where('p.id = :id', { id })
      .getOne();

    if (!product || product.stock < quantity) {
      this.logger.warn(`Insufficient stock for product id=${id}, current stock=${product?.stock ?? 0}, requested=${quantity}`);
      throw new InsufficientStockException();
    }

    const updateQb = manager
      ? manager.createQueryBuilder()
      : this.dataSource.createQueryBuilder();

    await updateQb
      .update(ProductTypeormEntity)
      .set({ stock: () => `stock - ${quantity}` })
      .where('id = :id', { id })
      .execute();

    this.logger.log(`Stock decremented for product id=${id}, remaining=${product.stock - quantity}`);
  }
}
