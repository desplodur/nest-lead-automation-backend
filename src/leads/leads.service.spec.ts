import { Test, TestingModule } from '@nestjs/testing';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';

describe('LeadsService', () => {
  let service: LeadsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LeadsService],
    }).compile();

    service = module.get<LeadsService>(LeadsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createLead', () => {
    const validDto: CreateLeadDto = {
      name: 'Max Müller GmbH',
      email: 'max@mueller-gmbh.de',
      message: 'Wir suchen eine CRM-Lösung. Budget ca. 15.000€, Start Q2.',
    };

    it('returns success with leadId and receivedAt', () => {
      const result = service.createLead(validDto);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Lead received successfully');
      expect(result.data).toBeDefined();
      expect(result.data.leadId).toBeDefined();
      expect(result.data.receivedAt).toBeDefined();
    });

    it('generates a valid UUID v4 for leadId', () => {
      const result = service.createLead(validDto);
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(result.data.leadId).toMatch(uuidRegex);
    });

    it('returns ISO 8601 timestamp for receivedAt', () => {
      const before = new Date().toISOString();
      const result = service.createLead(validDto);
      const after = new Date().toISOString();

      expect(result.data.receivedAt).toBeDefined();
      expect(new Date(result.data.receivedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(before).getTime(),
      );
      expect(new Date(result.data.receivedAt).getTime()).toBeLessThanOrEqual(
        new Date(after).getTime() + 1000,
      );
    });

    it('generates a new leadId on each call', () => {
      const first = service.createLead(validDto);
      const second = service.createLead(validDto);
      expect(first.data.leadId).not.toBe(second.data.leadId);
    });
  });
});
