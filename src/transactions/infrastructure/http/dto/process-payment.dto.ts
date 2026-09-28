import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, IsInt, Min, Max, IsOptional } from 'class-validator';

export class ProcessPaymentDto {
  @ApiProperty({
    example: '00000000-0000-0000-0000-000000000000',
    description: 'UUID del cliente. Obtener del response de POST /api/v1/customers',
  })
  @IsUUID()
  customerId!: string;

  @ApiProperty({
    example: '00000000-0000-0000-0000-000000000000',
    description: 'UUID del producto. Obtener del response de GET /api/v1/products',
  })
  @IsUUID()
  productId!: string;

  @ApiProperty({
    example: 'tok_stagtest_5432_D28671de3B4f65c3bb616d7F23C3d12D',
    description:
      'Token de la tarjeta. El frontend lo obtiene llamando a POST https://api-sandbox.co.uat.wompi.dev/v1/tokens/cards con los datos de la tarjeta de sandbox.',
  })
  @IsString()
  @IsNotEmpty()
  cardToken!: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiJ9...',
    description:
      'Token de aceptación de términos. El frontend lo obtiene de GET https://api-sandbox.co.uat.wompi.dev/v1/merchants/{public_key} → presigned_acceptance.acceptance_token',
  })
  @IsString()
  @IsNotEmpty()
  acceptanceToken!: string;

  @ApiProperty({
    example: 1,
    description: 'Número de cuotas (1 = contado, máx. 36)',
    minimum: 1,
    maximum: 36,
  })
  @IsInt()
  @Min(1)
  @Max(36)
  installments!: number;

  @ApiProperty({
    example: 'juan@email.com',
    description: 'Email del cliente — debe coincidir con el registrado en POST /api/v1/customers',
  })
  @IsString()
  @IsNotEmpty()
  customerEmail!: string;

  @ApiProperty({
    example: 1,
    description: 'Cantidad de unidades a comprar (default: 1)',
    required: false,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  quantity?: number;
}
