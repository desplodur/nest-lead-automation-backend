import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
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
  @ApiOperation({
    summary: 'Submit a new lead',
    description:
      'Accepts a sales lead (company/person name, email, message), validates it, saves to the database, and returns the lead ID and timestamp.',
  })
  @ApiBody({ type: CreateLeadDto })
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
