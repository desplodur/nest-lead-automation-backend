import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import nock from 'nock';
import { AIService } from './ai.service';
import type { LeadForAnalysis } from './interfaces/lead-analysis.interface';

const GROQ_BASE = 'https://api.groq.com';
const LEAD: LeadForAnalysis = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Tech Startup GmbH',
  email: 'cto@startup.de',
  message: 'We need CRM. Budget 20,000€. Start Q2.',
};

describe('AIService', () => {
  let service: AIService;
  const apiKey = 'test-groq-key';

  beforeAll(() => {
    process.env.GROQ_API_KEY = apiKey;
  });

  afterAll(() => {
    delete process.env.GROQ_API_KEY;
  });

  beforeEach(async () => {
    nock.cleanAll();
    const module: TestingModule = await Test.createTestingModule({
      providers: [AIService],
    }).compile();
    service = module.get<AIService>(AIService);
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('analyzeLead', () => {
    it('returns analysis with score, budget, urgency, reasoning for valid lead', async () => {
      nock(GROQ_BASE)
        .post('/openai/v1/chat/completions', (body) => {
          return body.model === 'llama-3.3-70b-versatile' && body.messages?.length >= 1;
        })
        .reply(200, {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  score: 87,
                  budget: 20000,
                  urgency: 'medium',
                  reasoning: 'Clear use case, realistic budget.',
                }),
              },
            },
          ],
        });

      const result = await service.analyzeLead(LEAD);

      expect(result.score).toBe(87);
      expect(result.budget).toBe(20000);
      expect(result.urgency).toBe('medium');
      expect(result.reasoning).toContain('Clear use case');
    });

    it('extracts budget from message (e.g. "Budget 15k€")', async () => {
      nock(GROQ_BASE)
        .post('/openai/v1/chat/completions')
        .reply(200, {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  score: 75,
                  budget: 15000,
                  urgency: 'high',
                  reasoning: 'Budget 15k mentioned.',
                }),
              },
            },
          ],
        });

      const result = await service.analyzeLead({
        ...LEAD,
        message: 'Budget 15k€, need soon.',
      });

      expect(result.budget).toBe(15000);
      expect(result.urgency).toBe('high');
    });

    it('returns valid score in 0-100 range', async () => {
      nock(GROQ_BASE)
        .post('/openai/v1/chat/completions')
        .reply(200, {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  score: 95,
                  budget: null,
                  urgency: 'low',
                  reasoning: 'Good fit.',
                }),
              },
            },
          ],
        });

      const result = await service.analyzeLead(LEAD);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.score).toBe(95);
    });

    it('clamps score to 0-100 when API returns out of range', async () => {
      nock(GROQ_BASE)
        .post('/openai/v1/chat/completions')
        .reply(200, {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  score: 150,
                  budget: null,
                  urgency: 'medium',
                  reasoning: 'High.',
                }),
              },
            },
          ],
        });

      const result = await service.analyzeLead(LEAD);
      expect(result.score).toBe(100);
    });

    it('uses fallback when response is invalid JSON', async () => {
      nock(GROQ_BASE)
        .post('/openai/v1/chat/completions')
        .reply(200, {
          choices: [{ message: { content: 'Not valid JSON at all' } }],
        });

      const result = await service.analyzeLead(LEAD);

      expect(result.score).toBe(50);
      expect(result.budget).toBeNull();
      expect(result.urgency).toBe('medium');
      expect(result.reasoning).toContain('default applied');
    });

    it.skip('throws on timeout (axios instance used by client bypasses axios.post spy)', async () => {
      const postSpy = jest.spyOn(axios, 'post').mockRejectedValueOnce(new Error('timeout of 10000ms exceeded'));
      await expect(service.analyzeLead(LEAD)).rejects.toThrow('timeout');
      postSpy.mockRestore();
    });

    it('throws on 429 rate limit', async () => {
      nock(GROQ_BASE)
        .post('/openai/v1/chat/completions')
        .reply(429, { error: { message: 'Rate limit' } });

      await expect(service.analyzeLead(LEAD)).rejects.toThrow('rate limit');
    });

    it('returns default analysis when GROQ_API_KEY is not set', async () => {
      const orig = process.env.GROQ_API_KEY;
      delete process.env.GROQ_API_KEY;

      const result = await service.analyzeLead(LEAD);

      expect(result.score).toBe(50);
      expect(result.budget).toBeNull();
      expect(result.urgency).toBe('medium');
      process.env.GROQ_API_KEY = orig;
    });
  });

  describe('generateEmail', () => {
    it('generates email with company name and mentions budget when present', async () => {
      const analysis = {
        score: 85,
        budget: 20000 as number | null,
        urgency: 'medium' as const,
        reasoning: 'Good lead.',
      };

      nock(GROQ_BASE)
        .post('/openai/v1/chat/completions')
        .reply(200, {
          choices: [
            {
              message: {
                content:
                  'Dear Tech Startup GmbH,\n\nThank you for reaching out. We would be glad to discuss your CRM needs and your budget of 20,000€.\n\nBest regards',
              },
            },
          ],
        });

      const result = await service.generateEmail(LEAD, analysis);

      expect(result).toContain('Tech Startup');
      expect(result).toContain('20,000');
    });

    it('returns appropriate length (150-250 words acceptable)', async () => {
      const analysis = {
        score: 70,
        budget: null as number | null,
        urgency: 'low' as const,
        reasoning: 'Okay.',
      };
      const words = Array(180).fill('word').join(' ');

      nock(GROQ_BASE)
        .post('/openai/v1/chat/completions')
        .reply(200, {
          choices: [{ message: { content: words } }],
        });

      const result = await service.generateEmail(LEAD, analysis);
      const wordCount = result.trim().split(/\s+/).length;
      expect(wordCount).toBeGreaterThanOrEqual(150);
      expect(wordCount).toBeLessThanOrEqual(250);
    });

    it('throws on API error', async () => {
      const analysis = {
        score: 50,
        budget: null as number | null,
        urgency: 'medium' as const,
        reasoning: 'Default',
      };
      nock(GROQ_BASE)
        .post('/openai/v1/chat/completions')
        .reply(500, { error: { message: 'Internal error' } });

      await expect(service.generateEmail(LEAD, analysis)).rejects.toThrow();
    });
  });
});
