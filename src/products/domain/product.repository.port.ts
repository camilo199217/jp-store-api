// Puerto (interfaz) del repositorio de productos.
// En arquitectura hexagonal, el dominio define CÓMO quiere interactuar con la persistencia,
// sin importarle si es PostgreSQL, DynamoDB o cualquier otra cosa.
import type { Product } from './product.entity.js';
import type { EntityManager } from 'typeorm';
import type { PaginatedResult } from '../../shared/dto/pagination.dto.js';

export abstract class ProductRepositoryPort {
  // Lista paginada de productos disponibles
  abstract findAll(page: number, limit: number): Promise<PaginatedResult<Product>>;

  // Búsqueda por ID — retorna null si no existe en lugar de lanzar excepción
  abstract findById(id: string): Promise<Product | null>;

  // Decrementa el stock en `quantity` unidades con lock pesimista para evitar condiciones de carrera.
  // Recibe un EntityManager opcional para participar en transacciones atómicas externas.
  abstract decrementStock(id: string, manager?: EntityManager, quantity?: number): Promise<void>;
}

// Símbolo de inyección — lo uso en lugar de la clase para el token de NestJS DI
export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');
