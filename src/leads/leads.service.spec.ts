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
import { PrismaService } from '../prisma/prisma.service';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';

describe('LeadsService', () => {
  let service: LeadsService;
  let leadCreateMock: jest.Mock;
  let leadFindManyMock: jest.Mock;

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
    createdAt: new Date('2026-02-13T10:30:00.000Z'),
    updatedAt: new Date('2026-02-13T10:30:00.000Z'),
  };

  beforeEach(async () => {
    leadCreateMock = jest.fn().mockResolvedValue(mockCreatedLead);
    leadFindManyMock = jest.fn().mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsService,
        {
          provide: PrismaService,
          useValue: {
            lead: {
              create: leadCreateMock,
              findMany: leadFindManyMock,
            },
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
