import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { LeadListResponseDto } from './dto/lead-list-response.dto';
import { LeadResponseDto } from './dto/lead-response.dto';

@ApiTags('leads')
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({
    default: {
      limit: parseInt(process.env.AI_RATE_LIMIT_MAX ?? '20', 10),
      ttl: parseInt(process.env.AI_RATE_LIMIT_TTL ?? '60000', 10),
    },
  })
  @ApiOperation({
    summary: 'Submit a new lead',
    description:
      'Accepts a sales lead (company/person name, email, message), validates it, saves to the database, and returns the lead ID and timestamp.',
  })
  @ApiBody({
    type: CreateLeadDto,
    examples: {
      highQuality: {
        summary: 'High-quality lead',
        description: 'Company with clear budget and timeline',
        value: {
          name: 'Tech Startup GmbH',
          email: 'cto@startup.de',
          message: 'We need a CRM solution. Budget 20,000€. Start Q2 2026.',
        },
      },
      lowQuality: {
        summary: 'Low-quality lead',
        description: 'Vague inquiry',
        value: {
          name: 'Test',
          email: 'test@test.com',
          message: 'Just browsing, might be interested later.',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description:
      'Lead saved successfully. Includes AI analysis and generated email when Groq succeeds; optional warning when AI fails.',
    type: LeadResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed (invalid or missing fields)',
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded (too many requests)',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Rate limit exceeded. Please try again later.' },
        statusCode: { type: 'number', example: 429 },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Database unavailable',
  })
  async create(@Body() dto: CreateLeadDto): Promise<LeadResponseDto> {
    return this.leadsService.createLead(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List all leads',
    description:
      'Returns all leads from the database (with optional score, analysis, generatedEmail), ordered by newest first.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of leads including AI fields when present',
    type: LeadListResponseDto,
  })
  @ApiResponse({
    status: 503,
    description: 'Database unavailable',
  })
  async getLeads(): Promise<LeadListResponseDto> {
    return this.leadsService.getAllLeads();
  }
}
