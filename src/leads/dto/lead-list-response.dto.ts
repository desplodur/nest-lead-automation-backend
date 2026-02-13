import { ApiProperty } from '@nestjs/swagger';

/**
 * Single lead item in GET /leads list response.
 */
export class LeadItemDto {
  @ApiProperty({
    description: 'Lead UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Company or person name',
    example: 'Max Müller GmbH',
  })
  name: string;

  @ApiProperty({ description: 'Contact email', example: 'max@mueller.de' })
  email: string;

  @ApiProperty({
    description: 'Lead message',
    example: 'Wir suchen eine CRM-Lösung.',
  })
  message: string;

  @ApiProperty({
    description: 'Creation timestamp (ISO 8601)',
    example: '2026-02-13T10:30:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Last update timestamp (ISO 8601)',
    example: '2026-02-13T10:30:00.000Z',
  })
  updatedAt: string;
}

/**
 * Response DTO for GET /leads (list of leads).
 */
export class LeadListResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [LeadItemDto], description: 'All leads, newest first' })
  data: LeadItemDto[];

  @ApiProperty({ example: 1, description: 'Total number of leads' })
  count: number;
}
