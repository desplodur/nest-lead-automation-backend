import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
} from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { LeadListResponseDto, LeadItemDto } from './dto/lead-list-response.dto';
import { LeadResponseDto } from './dto/lead-response.dto';

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Persists a lead to the database and returns the created record metadata.
   * @throws BadRequestException on validation error
   * @throws ConflictException on duplicate (e.g. unique constraint)
   * @throws ServiceUnavailableException when database is unreachable
   * @throws InternalServerErrorException on other database errors
   */
  async createLead(dto: CreateLeadDto): Promise<LeadResponseDto> {
    try {
      const lead = await this.prisma.lead.create({
        data: {
          name: dto.name,
          email: dto.email,
          message: dto.message,
        },
      });

      this.logger.log(`Lead received: ${lead.id} from ${dto.email}`);

      return {
        success: true,
        message: 'Lead received successfully',
        data: {
          leadId: lead.id,
          receivedAt: lead.createdAt.toISOString(),
        },
      };
    } catch (error) {
      this.handlePrismaError(error, 'create');
    }
  }

  /**
   * Returns all leads from the database, ordered by newest first.
   * @throws ServiceUnavailableException when database is unreachable
   * @throws InternalServerErrorException on other database errors
   */
  async getAllLeads(): Promise<LeadListResponseDto> {
    try {
      const leads = await this.prisma.lead.findMany({
        orderBy: { createdAt: 'desc' },
      });

      const data: LeadItemDto[] = leads.map((lead) => ({
        id: lead.id,
        name: lead.name,
        email: lead.email,
        message: lead.message,
        createdAt: lead.createdAt.toISOString(),
        updatedAt: lead.updatedAt.toISOString(),
      }));

      return {
        success: true,
        data,
        count: data.length,
      };
    } catch (error) {
      this.handlePrismaError(error, 'getAll');
    }
  }

  /**
   * Maps Prisma errors to Nest HTTP exceptions. Always throws.
   */
  private handlePrismaError(error: unknown, operation: string): never {
    if (error instanceof PrismaClientValidationError) {
      this.logger.warn(
        `Prisma validation error (${operation}): ${error.message}`,
      );
      throw new BadRequestException({
        success: false,
        error: {
          message: 'Invalid request data',
          code: 'VALIDATION_ERROR',
          status: 400,
        },
      });
    }

    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException({
          success: false,
          error: {
            message: 'Duplicate value (e.g. email already used)',
            code: 'CONFLICT',
            status: 409,
          },
        });
      }
      if (
        error.code === 'P1001' ||
        error.code === 'P1002' ||
        error.code === 'P1017'
      ) {
        this.logger.error(
          `Database unavailable (${operation}): ${error.message}`,
        );
        throw new ServiceUnavailableException({
          success: false,
          error: {
            message: 'Database connection failed',
            code: 'DATABASE_ERROR',
            status: 503,
          },
        });
      }
    }

    this.logger.error(
      `Database error (${operation}): ${error instanceof Error ? error.message : String(error)}`,
    );
    throw new InternalServerErrorException({
      success: false,
      error: {
        message: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR',
        status: 500,
      },
    });
  }
}
