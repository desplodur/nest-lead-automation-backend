import { ApiProperty } from '@nestjs/swagger';

/**
 * Nested data object returned when a lead is successfully created.
 */
export class LeadResponseDataDto {
  @ApiProperty({
    description: 'Unique identifier for the lead (UUID v4)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  leadId: string;

  @ApiProperty({
    description: 'ISO 8601 timestamp when the lead was received',
    example: '2025-02-13T14:30:00.000Z',
  })
  receivedAt: string;
}

/**
 * Standard response DTO for lead creation endpoint.
 */
export class LeadResponseDto {
  @ApiProperty({
    description: 'Whether the operation succeeded',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Human-readable status message',
    example: 'Lead received successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Lead metadata (id and timestamp)',
    type: LeadResponseDataDto,
  })
  data: LeadResponseDataDto;
}
