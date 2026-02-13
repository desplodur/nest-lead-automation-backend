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
import { AIService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { LeadListResponseDto, LeadItemDto } from './dto/lead-list-response.dto';
import { LeadResponseDto } from './dto/lead-response.dto';

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
  ) {}

  /**
   * Persists a lead to the database, runs AI analysis, and returns the created record with optional AI data.
   * On AI failure, lead is still saved; response includes a warning and no analysis/generatedEmail.
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

      const baseData = {
        leadId: lead.id,
        receivedAt: lead.createdAt.toISOString(),
      };

      let analysis: Awaited<ReturnType<AIService['analyzeLead']>>;
      let generatedEmail: string;
      try {
        analysis = await this.aiService.analyzeLead(lead);
        generatedEmail = await this.aiService.generateEmail(lead, analysis);
      } catch (aiError) {
        this.logger.warn(
          `AI analysis failed for lead ${lead.id}: ${aiError instanceof Error ? aiError.message : String(aiError)}`,
        );
        return {
          success: true,
          message: 'Lead received successfully',
          data: baseData,
          warning: 'AI analysis failed, lead saved successfully',
        };
      }

      try {
        await this.prisma.lead.update({
          where: { id: lead.id },
          data: {
            score: analysis.score,
            analysis: analysis as object,
            generatedEmail: generatedEmail || null,
          } as Parameters<PrismaService['lead']['update']>[0]['data'],
        });
      } catch (updateError) {
        this.logger.error(
          `Failed to persist AI results for lead ${lead.id}: ${updateError instanceof Error ? updateError.message : String(updateError)}`,
        );
        throw updateError;
      }

      return {
        success: true,
        message: 'Lead received successfully',
        data: {
          ...baseData,
          analysis: {
            score: analysis.score,
            budget: analysis.budget,
            urgency: analysis.urgency,
            reasoning: analysis.reasoning,
          },
          generatedEmail: generatedEmail || undefined,
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

      type LeadWithAi = (typeof leads)[number] & {
        score?: number | null;
        analysis?: unknown;
        generatedEmail?: string | null;
      };
      const data: LeadItemDto[] = (leads as LeadWithAi[]).map((lead) => ({
        id: lead.id,
        name: lead.name,
        email: lead.email,
        message: lead.message,
        score: lead.score ?? undefined,
        analysis: (lead.analysis as LeadItemDto['analysis']) ?? undefined,
        generatedEmail: lead.generatedEmail ?? undefined,
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
