/**
 * Urgency level assigned by AI analysis.
 */
export type UrgencyLevel = 'low' | 'medium' | 'high';

/**
 * Structured analysis returned by AI for a lead.
 */
export interface LeadAnalysis {
  score: number;
  budget: number | null;
  urgency: UrgencyLevel;
  reasoning: string;
}

/**
 * Minimal lead data required for AI analysis (matches Prisma Lead subset).
 */
export interface LeadForAnalysis {
  id: string;
  name: string;
  email: string;
  message: string;
}
