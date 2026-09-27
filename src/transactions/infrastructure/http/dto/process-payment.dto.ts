import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, IsInt, Min, Max, IsOptional } from 'class-validator';

export class ProcessPaymentDto {
  @ApiProperty({ example: 'uuid-customer' })
  @IsUUID()
  customerId!: string;

  @ApiProperty({ example: 'uuid-product' })
  @IsUUID()
  productId!: string;

  @ApiProperty({ example: 'tok_stagtest_xxxx', description: 'Card token from payment gateway' })
  @IsString()
  @IsNotEmpty()
  cardToken!: string;

  @ApiProperty({ example: 'acceptance_token_from_gateway' })
  @IsString()
  @IsNotEmpty()
  acceptanceToken!: string;

  @ApiProperty({ example: 1, description: 'Número de cuotas' })
  @IsInt()
  @Min(1)
  @Max(36)
  installments!: number;

  @ApiProperty({ example: 'juan@email.com' })
  @IsString()
  @IsNotEmpty()
  customerEmail!: string;

  @ApiProperty({ example: 1, description: 'Cantidad de unidades a comprar', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  quantity?: number;
}
