import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
} from '@prisma/client/runtime/library';
import { Test, TestingModule } from '@nestjs/testing';
import { AIService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';

describe('LeadsService', () => {
  let service: LeadsService;
  let leadCreateMock: jest.Mock;
  let leadUpdateMock: jest.Mock;
  let leadFindManyMock: jest.Mock;
  let analyzeLeadMock: jest.Mock;
  let generateEmailMock: jest.Mock;

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  const validDto: CreateLeadDto = {
    name: 'Max Müller GmbH',
    email: 'max@mueller-gmbh.de',
    message: 'Wir suchen eine CRM-Lösung. Budget ca. 15.000€, Start Q2.',
  };

  const mockCreatedLead = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: validDto.name,
    email: validDto.email,
    message: validDto.message,
    score: null as number | null,
    analysis: null as Record<string, unknown> | null,
    generatedEmail: null as string | null,
    createdAt: new Date('2026-02-13T10:30:00.000Z'),
    updatedAt: new Date('2026-02-13T10:30:00.000Z'),
  };

  const mockAnalysis = {
    score: 87,
    budget: 15000,
    urgency: 'medium' as const,
    reasoning: 'Clear use case, realistic budget.',
  };

  const mockGeneratedEmail = 'Hallo Max,\n\nvielen Dank für Ihre Anfrage...';

  beforeEach(async () => {
    leadCreateMock = jest.fn().mockResolvedValue(mockCreatedLead);
    leadUpdateMock = jest.fn().mockResolvedValue({
      ...mockCreatedLead,
      score: mockAnalysis.score,
      analysis: mockAnalysis,
      generatedEmail: mockGeneratedEmail,
    });
    leadFindManyMock = jest.fn().mockResolvedValue([]);
    analyzeLeadMock = jest.fn().mockResolvedValue(mockAnalysis);
    generateEmailMock = jest.fn().mockResolvedValue(mockGeneratedEmail);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsService,
        {
          provide: PrismaService,
          useValue: {
            lead: {
              create: leadCreateMock,
              update: leadUpdateMock,
              findMany: leadFindManyMock,
            },
          },
        },
        {
          provide: AIService,
          useValue: {
            analyzeLead: analyzeLeadMock,
            generateEmail: generateEmailMock,
          },
        },
      ],
    }).compile();

    service = module.get<LeadsService>(LeadsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createLead', () => {
    it('calls prisma.lead.create with DTO data and returns leadId and receivedAt', async () => {
      const result = await service.createLead(validDto);

      expect(leadCreateMock).toHaveBeenCalledWith({
        data: {
          name: validDto.name,
          email: validDto.email,
          message: validDto.message,
        },
      });
      expect(leadCreateMock).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Lead received successfully');
      expect(result.data.leadId).toBe(mockCreatedLead.id);
      expect(result.data.receivedAt).toBe(
        mockCreatedLead.createdAt.toISOString(),
      );
    });

    it('on AI success: calls analyzeLead and generateEmail, updates lead with score/analysis/generatedEmail, returns them', async () => {
      const result = await service.createLead(validDto);

      expect(analyzeLeadMock).toHaveBeenCalledTimes(1);
      expect(analyzeLeadMock).toHaveBeenCalledWith(mockCreatedLead);
      expect(generateEmailMock).toHaveBeenCalledTimes(1);
      expect(generateEmailMock).toHaveBeenCalledWith(
        mockCreatedLead,
        mockAnalysis,
      );
      expect(leadUpdateMock).toHaveBeenCalledWith({
        where: { id: mockCreatedLead.id },
        data: {
          score: mockAnalysis.score,
          analysis: mockAnalysis,
          generatedEmail: mockGeneratedEmail,
        },
      });
      expect(result.data.analysis).toEqual(mockAnalysis);
      expect(result.data.generatedEmail).toBe(mockGeneratedEmail);
      expect(result.warning).toBeUndefined();
    });

    it('on AI failure: lead saved, prisma.lead.update not called, response has warning and no analysis', async () => {
      analyzeLeadMock.mockRejectedValue(new Error('Groq timeout'));

      const result = await service.createLead(validDto);

      expect(leadCreateMock).toHaveBeenCalledTimes(1);
      expect(leadUpdateMock).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data.leadId).toBe(mockCreatedLead.id);
      expect(result.data.receivedAt).toBe(
        mockCreatedLead.createdAt.toISOString(),
      );
      expect(result.data.analysis).toBeUndefined();
      expect(result.data.generatedEmail).toBeUndefined();
      expect(result.warning).toBe(
        'AI analysis failed, lead saved successfully',
      );
    });

    it('on AI success but prisma.lead.update fails: throws (database error surfaced to client)', async () => {
      leadUpdateMock.mockRejectedValueOnce(
        new PrismaClientKnownRequestError('Connection lost', {
          code: 'P1001',
          clientVersion: '6.0',
        }),
      );

      await expect(service.createLead(validDto)).rejects.toThrow(
        ServiceUnavailableException,
      );
      expect(leadUpdateMock).toHaveBeenCalledTimes(1);
    });

    it('maps DTO fields correctly (name, email, message)', async () => {
      await service.createLead(validDto);

      expect(leadCreateMock).toHaveBeenCalledWith({
        data: {
          name: 'Max Müller GmbH',
          email: 'max@mueller-gmbh.de',
          message: 'Wir suchen eine CRM-Lösung. Budget ca. 15.000€, Start Q2.',
        },
      });
    });

    it('throws BadRequestException on PrismaClientValidationError', async () => {
      leadCreateMock.mockRejectedValue(
        new PrismaClientValidationError('Invalid data', {
          clientVersion: '6.0',
        }),
      );

      await expect(service.createLead(validDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws ConflictException on P2002 (unique constraint)', async () => {
      const err = new PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '6.0',
      });
      leadCreateMock.mockRejectedValue(err);

      await expect(service.createLead(validDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws ServiceUnavailableException on connection error (P1001)', async () => {
      const err = new PrismaClientKnownRequestError('Connection refused', {
        code: 'P1001',
        clientVersion: '6.0',
      });
      leadCreateMock.mockRejectedValue(err);

      await expect(service.createLead(validDto)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('throws InternalServerErrorException on generic Prisma error', async () => {
      leadCreateMock.mockRejectedValue(new Error('Unknown DB error'));

      await expect(service.createLead(validDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('getAllLeads', () => {
    it('returns array of leads and count from database', async () => {
      const leads = [mockCreatedLead];
      leadFindManyMock.mockResolvedValue(leads);

      const result = await service.getAllLeads();

      expect(leadFindManyMock).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
      expect(leadFindManyMock).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe(mockCreatedLead.id);
      expect(result.data[0].name).toBe(mockCreatedLead.name);
      expect(result.data[0].email).toBe(mockCreatedLead.email);
      expect(result.data[0].message).toBe(mockCreatedLead.message);
      expect(result.data[0].createdAt).toBe(
        mockCreatedLead.createdAt.toISOString(),
      );
      expect(result.data[0].updatedAt).toBe(
        mockCreatedLead.updatedAt.toISOString(),
      );
      expect(result.count).toBe(1);
    });

    it('includes score, analysis, generatedEmail when present on lead', async () => {
      const leadWithAi = {
        ...mockCreatedLead,
        score: 85,
        analysis: {
          score: 85,
          budget: 10000,
          urgency: 'high',
          reasoning: 'Good fit',
        },
        generatedEmail: 'Dear customer, thank you...',
      };
      leadFindManyMock.mockResolvedValue([leadWithAi]);

      const result = await service.getAllLeads();

      expect(result.data[0].score).toBe(85);
      expect(result.data[0].analysis).toEqual(leadWithAi.analysis);
      expect(result.data[0].generatedEmail).toBe(leadWithAi.generatedEmail);
    });

    it('returns empty array and count 0 when no leads exist', async () => {
      leadFindManyMock.mockResolvedValue([]);

      const result = await service.getAllLeads();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.count).toBe(0);
    });

    it('orders by createdAt DESC (newest first)', async () => {
      await service.getAllLeads();

      expect(leadFindManyMock).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
    });

    it('throws ServiceUnavailableException when database unavailable', async () => {
      const err = new PrismaClientKnownRequestError('Connection refused', {
        code: 'P1001',
        clientVersion: '6.0',
      });
      leadFindManyMock.mockRejectedValue(err);

      await expect(service.getAllLeads()).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('throws InternalServerErrorException on generic error', async () => {
      leadFindManyMock.mockRejectedValue(new Error('DB error'));

      await expect(service.getAllLeads()).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
