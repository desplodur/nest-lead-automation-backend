import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
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
      'Accepts a sales lead (company/person name, email, message), validates it, and returns a unique lead ID and timestamp. No persistence or AI processing in this version.',
  })
  @ApiBody({ type: CreateLeadDto })
  @ApiResponse({
    status: 201,
    description: 'Lead received successfully',
    type: LeadResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed (invalid or missing fields)',
  })
  create(@Body() dto: CreateLeadDto): LeadResponseDto {
    return this.leadsService.createLead(dto);
  }
}
