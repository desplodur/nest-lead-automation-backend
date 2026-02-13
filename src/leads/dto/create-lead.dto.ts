import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * DTO for incoming lead submission. Validates and documents the API contract.
 */
export class CreateLeadDto {
  @ApiProperty({
    description: 'Company or person name',
    example: 'Max Müller GmbH',
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MinLength(1, { message: 'Name must not be empty' })
  @MaxLength(200, { message: 'Name must not exceed 200 characters' })
  name: string;

  @ApiProperty({
    description: 'Contact email address',
    example: 'max@mueller-gmbh.de',
  })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    description: 'Lead inquiry or message text',
    example: 'Wir suchen eine CRM-Lösung. Budget ca. 15.000€, Start Q2.',
    minLength: 10,
    maxLength: 5000,
  })
  @IsString()
  @IsNotEmpty({ message: 'Message is required' })
  @MinLength(10, {
    message: 'Message must be at least 10 characters long',
  })
  @MaxLength(5000, {
    message: 'Message must not exceed 5000 characters',
  })
  message: string;
}
