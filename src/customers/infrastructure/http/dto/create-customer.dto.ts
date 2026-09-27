import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({ example: 'Juan Palacio' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 255)
  name!: string;

  @ApiProperty({ example: 'juan@email.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '3001234567' })
  @IsString()
  @Matches(/^\d{7,15}$/, { message: 'phone must be a valid number' })
  phone!: string;

  @ApiProperty({ example: 'Calle 123 #45-67' })
  @IsString()
  @IsNotEmpty()
  @Length(5, 500)
  address!: string;

  @ApiProperty({ example: 'Bogotá' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  city!: string;
}
