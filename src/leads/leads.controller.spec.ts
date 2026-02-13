import { Test, TestingModule } from '@nestjs/testing';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';

describe('LeadsController', () => {
  let controller: LeadsController;
  let service: LeadsService;

  const mockResponse = {
    success: true,
    message: 'Lead received successfully',
    data: {
      leadId: '550e8400-e29b-41d4-a716-446655440000',
      receivedAt: '2026-02-13T12:00:00.000Z',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeadsController],
      providers: [
        {
          provide: LeadsService,
          useValue: {
            createLead: jest.fn().mockReturnValue(mockResponse),
          },
        },
      ],
    }).compile();

    controller = module.get<LeadsController>(LeadsController);
    service = module.get<LeadsService>(LeadsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const validDto: CreateLeadDto = {
      name: 'Max Müller GmbH',
      email: 'max@mueller-gmbh.de',
      message: 'Wir suchen eine CRM-Lösung. Budget ca. 15.000€, Start Q2.',
    };

    it('calls service.createLead with the DTO and returns the result', () => {
      const result = controller.create(validDto);

      const createLeadMock = service.createLead as jest.Mock;
      expect(createLeadMock).toHaveBeenCalledWith(validDto);
      expect(createLeadMock).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
    });
  });
});
