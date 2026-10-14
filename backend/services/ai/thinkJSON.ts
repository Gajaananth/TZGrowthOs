import { z } from 'zod';
import { getGeminiModel, logAiRun } from './gemini.js';

export interface ThinkJSONOptions<T> {
  prompt: string;
  systemInstruction?: string;
  schema: z.ZodType<T>;
  featureName: string;
  userId?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Clean potential markdown wrappers from Gemini JSON responses
 */
function cleanJsonOutput(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.substring(3);
  }

  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }

  return cleaned.trim();
}

/**
 * Execute a Gemini prompt and validate output against a Zod schema with audit logging
 */
export async function thinkJSON<T>(options: ThinkJSONOptions<T>): Promise<T> {
  const {
    prompt,
    systemInstruction,
    schema,
    featureName,
    userId,
    temperature = 0.2,
  } = options;

  const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const startTime = Date.now();

  try {
    const model = getGeminiModel();

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      systemInstruction: systemInstruction ? { role: 'system', parts: [{ text: systemInstruction }] } : undefined,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature,
      },
    });

    const response = await result.response;
    const rawText = response.text();
    const cleanedText = cleanJsonOutput(rawText);

    const parsedJson = JSON.parse(cleanedText);
    const validatedData = schema.parse(parsedJson);

    const latencyMs = Date.now() - startTime;
    const usage = response.usageMetadata;

    await logAiRun({
      userId,
      feature: featureName,
      model: modelName,
      latencyMs,
      success: true,
      tokensIn: usage?.promptTokenCount,
      tokensOut: usage?.candidatesTokenCount,
    });

    return validatedData;
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    await logAiRun({
      userId,
      feature: featureName,
      model: modelName,
      latencyMs,
      success: false,
      errorMessage: err.message,
    });

    console.error(`[thinkJSON] Error in ${featureName}:`, err.message);
    throw err;
  }
}
