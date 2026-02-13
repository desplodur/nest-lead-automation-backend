import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import type {
  LeadAnalysis,
  LeadForAnalysis,
} from './interfaces/lead-analysis.interface';

/** Groq API base URL (OpenAI-compatible). @see https://console.groq.com/docs/api-reference */
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

/** Production model: Llama 3.3 70B. @see https://console.groq.com/docs/models */
const GROQ_MODEL = 'llama-3.3-70b-versatile';

const TIMEOUT_MS = 10_000;

const DEFAULT_ANALYSIS: LeadAnalysis = {
  score: 50,
  budget: null,
  urgency: 'medium',
  reasoning: 'Analysis failed, default applied',
};

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);

  /** Axios client for Groq Chat Completions API (baseURL + default headers per docs). */
  private createGroqClient(apiKey: string) {
    return axios.create({
      baseURL: GROQ_BASE_URL,
      timeout: TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    });
  }

  /**
   * Calls Groq API to analyze a lead and extract score, budget, urgency, reasoning.
   * Returns default analysis on timeout, invalid JSON, or API errors.
   */
  async analyzeLead(lead: LeadForAnalysis): Promise<LeadAnalysis> {
    const apiKey = process.env.GROQ_API_KEY?.trim();
    if (!apiKey) {
      this.logger.warn('GROQ_API_KEY not set, returning default analysis');
      return DEFAULT_ANALYSIS;
    }

    const prompt = `You are a sales lead qualification expert. Analyze this lead:

Company: ${lead.name}
Email: ${lead.email}
Message: ${lead.message}

Provide analysis in JSON format:
{
  "score": 0-100 (fit score),
  "budget": number or null (extracted from message),
  "urgency": "low|medium|high",
  "reasoning": "brief explanation of score"
}

Only respond with valid JSON, no other text.`;

    try {
      const client = this.createGroqClient(apiKey);
      const response = await client.post<GroqChatResponse>(
        '/chat/completions',
        {
          model: GROQ_MODEL,
          messages: [
            {
              role: 'system',
              content:
                'You are a sales lead qualification expert. Respond only with valid JSON.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
          max_completion_tokens: 500,
        },
      );

      const content = response.data?.choices?.[0]?.message?.content?.trim();
      if (!content) {
        this.logger.warn('Groq returned empty content');
        return DEFAULT_ANALYSIS;
      }

      return this.parseAnalysisResponse(content);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<{
          error?: { message?: string };
        }>;
        const status = axiosError.response?.status;
        const message =
          axiosError.response?.data?.error?.message ?? axiosError.message;
        this.logger.warn(`Groq API error (${status}): ${message}`);
        if (status === 429) {
          throw new Error('Groq rate limit exceeded');
        }
      }
      if (error instanceof Error) {
        this.logger.warn(`AI analysis failed: ${error.message}`);
        if (
          error.message.includes('timeout') ||
          error.message.includes('ETIMEDOUT')
        ) {
          throw new Error('Groq request timeout');
        }
      }
      throw error;
    }
  }

  /**
   * Parses AI JSON and validates structure. Returns DEFAULT_ANALYSIS on invalid data.
   */
  private parseAnalysisResponse(content: string): LeadAnalysis {
    try {
      const raw = JSON.parse(content) as Record<string, unknown>;
      const score =
        typeof raw.score === 'number'
          ? Math.min(100, Math.max(0, raw.score))
          : 50;
      const budget =
        typeof raw.budget === 'number'
          ? raw.budget
          : raw.budget === null
            ? null
            : null;
      const urgency = this.normalizeUrgency(raw.urgency);
      const reasoning =
        typeof raw.reasoning === 'string'
          ? raw.reasoning
          : DEFAULT_ANALYSIS.reasoning;
      return { score, budget, urgency, reasoning };
    } catch {
      this.logger.warn('Invalid JSON from Groq, using default analysis');
      return DEFAULT_ANALYSIS;
    }
  }

  private normalizeUrgency(value: unknown): LeadAnalysis['urgency'] {
    const s = String(value).toLowerCase();
    if (s === 'low' || s === 'medium' || s === 'high') return s;
    return 'medium';
  }

  /**
   * Generates a personalized email (150–200 words) for the lead using analysis context.
   */
  async generateEmail(
    lead: LeadForAnalysis,
    analysis: LeadAnalysis,
  ): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY?.trim();
    if (!apiKey) {
      this.logger.warn('GROQ_API_KEY not set');
      return '';
    }

    const prompt = `You are a professional sales representative. Write a personalized email response to this lead:

Company: ${lead.name}
Their message: ${lead.message}
Lead score: ${analysis.score}/100
Budget: ${analysis.budget ?? 'not specified'}
Urgency: ${analysis.urgency}

Write a professional, friendly email that:
- Thanks them for reaching out
- Addresses their specific needs
- Mentions the budget if appropriate
- Suggests next steps
- Keep it concise (150-200 words)

Only respond with the email text, no subject line.`;

    try {
      const client = this.createGroqClient(apiKey);
      const response = await client.post<GroqChatResponse>(
        '/chat/completions',
        {
          model: GROQ_MODEL,
          messages: [
            {
              role: 'system',
              content:
                'You are a professional sales rep. Reply with email body only, no subject.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.5,
          max_completion_tokens: 500,
        },
      );

      const content = response.data?.choices?.[0]?.message?.content?.trim();
      return content ?? '';
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<{
          error?: { message?: string };
        }>;
        const status = axiosError.response?.status;
        const message: string =
          axiosError.response?.data?.error?.message ?? axiosError.message;
        this.logger.warn(`Groq email error (${status}): ${message}`);
      } else if (error instanceof Error) {
        this.logger.warn(`Email generation failed: ${error.message}`);
      }
      throw error;
    }
  }
}

interface GroqChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
}
