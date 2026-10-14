import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { getPool } from '../../db/connection.js';

let genAI: GoogleGenerativeAI | null = null;

export function getGeminiClient(): GoogleGenerativeAI {
  if (genAI) return genAI;

  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables');
  }

  genAI = new GoogleGenerativeAI(apiKey);
  return genAI;
}

export function getGeminiModel(customModelName?: string): GenerativeModel {
  const client = getGeminiClient();
  const modelName = customModelName || process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  return client.getGenerativeModel({ model: modelName });
}

export interface LogAiRunParams {
  userId?: string;
  feature: string;
  model: string;
  latencyMs: number;
  success: boolean;
  tokensIn?: number;
  tokensOut?: number;
  errorMessage?: string;
}

export async function logAiRun(params: LogAiRunParams): Promise<void> {
  try {
    const pool = getPool();
    await pool.query(
      `INSERT INTO ai_runs (user_id, feature, model, latency_ms, success, tokens_in, tokens_out, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        params.userId || null,
        params.feature,
        params.model,
        params.latencyMs,
        params.success,
        params.tokensIn || null,
        params.tokensOut || null,
        params.errorMessage || null,
      ]
    );
  } catch (err: any) {
    // Non-blocking error logging
    console.error('[AI Log] Failed to record AI run:', err.message);
  }
}
