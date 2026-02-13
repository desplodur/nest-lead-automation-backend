import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * AI analysis sub-object for POST /leads response.
 */
export class LeadAnalysisDto {
  @ApiProperty({ example: 87, description: 'Fit score 0-100' })
  score: number;

  @ApiPropertyOptional({ example: 15000, description: 'Extracted budget or null' })
  budget: number | null;

  @ApiProperty({ example: 'medium', enum: ['low', 'medium', 'high'] })
  urgency: string;

  @ApiProperty({ example: 'Clear use case, realistic budget...' })
  reasoning: string;
}

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

  @ApiPropertyOptional({
    description: 'AI analysis (score, budget, urgency, reasoning)',
    type: LeadAnalysisDto,
  })
  analysis?: LeadAnalysisDto;

  @ApiPropertyOptional({
    description: 'Generated personalized email body',
    example: 'Hallo Max,\n\nvielen Dank...',
  })
  generatedEmail?: string;
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
    description: 'Lead metadata (id, timestamp, optional AI data)',
    type: LeadResponseDataDto,
  })
  data: LeadResponseDataDto;

  @ApiPropertyOptional({
    description: 'Present when lead was saved but AI analysis failed',
    example: 'AI analysis failed, lead saved successfully',
  })
  warning?: string;
}
