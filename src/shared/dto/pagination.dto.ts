// DTO compartido para paginación — lo reutilizo en cualquier endpoint que retorne listas.
// Así evito duplicar la misma lógica en cada módulo y mantengo consistencia en la API.
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
  // Página actual — si no viene, asumo la primera
  @ApiPropertyOptional({ example: 1, default: 1, description: 'Página actual (empieza en 1)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  // Cantidad de registros por página — máximo 100 para no matar la DB
  @ApiPropertyOptional({ example: 10, default: 10, description: 'Registros por página (máx 100)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

// Resultado paginado genérico — T es el tipo de cada ítem de la lista
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Helper para construir el resultado paginado sin repetir esta lógica en cada use case
export function buildPaginatedResult<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
