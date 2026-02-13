import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { CreateLeadDto } from './dto/create-lead.dto';
import { LeadResponseDto } from './dto/lead-response.dto';

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  /**
   * Accepts a validated lead, assigns an ID and timestamp, and returns a success response.
   * No persistence or AI processing in this version.
   */
  createLead(dto: CreateLeadDto): LeadResponseDto {
    const leadId = uuidv4();
    const receivedAt = new Date().toISOString();

    this.logger.log(`Lead received: ${leadId} from ${dto.email}`);

    return {
      success: true,
      message: 'Lead received successfully',
      data: {
        leadId,
        receivedAt,
      },
    };
  }
}
