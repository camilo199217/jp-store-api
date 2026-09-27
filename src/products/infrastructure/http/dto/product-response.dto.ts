import { ApiProperty } from '@nestjs/swagger';

export class ProductResponseDto {
  @ApiProperty({ example: 'uuid-here' })
  id!: string;

  @ApiProperty({ example: 'Audífonos Bluetooth Pro' })
  name!: string;

  @ApiProperty({ example: 'Audífonos inalámbricos con cancelación de ruido.' })
  description!: string;

  @ApiProperty({ example: 18990000, description: 'Precio en centavos de COP' })
  priceInCents!: number;

  @ApiProperty({ example: 10 })
  stock!: number;

  @ApiProperty({ example: 'https://example.com/image.jpg' })
  imageUrl!: string;

  @ApiProperty({ example: true })
  isAvailable!: boolean;
}
