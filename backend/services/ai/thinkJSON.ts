import { z } from 'zod';
import { getGeminiModel, logAiRun, sanitizeErrorMessage } from './gemini.js';

export interface ThinkJSONOptions<T> {
  prompt: string;
  systemInstruction?: string;
  schema: z.ZodType<T, any, any>;
  featureName: string;
  userId?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Clean potential markdown wrappers from Gemini JSON responses
 */
export function cleanJsonOutput(text: string): string {
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


export interface AiExecutionMetadata {
  tokensIn: number;
  tokensOut: number;
  totalTokens: number;
  latencyMs: number;
  model: string;
}

/**
 * Execute a Gemini prompt and validate output against a Zod schema with audit logging and return execution metadata
 */
export async function thinkJSONWithMeta<T>(options: ThinkJSONOptions<T>): Promise<{ data: T; meta: AiExecutionMetadata }> {
  const {
    prompt,
    systemInstruction,
    schema,
    featureName,
    userId,
    temperature = 0.2,
  } = options;

  // Prefer gemini-3.5-flash for speed; fall back to gemini-3.8-flash if 3.5 is unavailable
  // When the primary model returns 429 quota or 503 overload, we try the other model once.
  const fastModel = 'gemini-3.5-flash';
  const deepModel = 'gemini-3.8-flash';
  const configuredModel = process.env.GEMINI_MODEL || fastModel;
  const startTime = Date.now();
  let activeModelName = configuredModel;

  const isQuotaError = (msg: string) =>
    msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota');

  const isOverloadError = (msg: string) =>
    msg.includes('503') || msg.includes('overloaded') || msg.includes('high demand');

  const callModel = async (modelName: string) => {
    const model = getGeminiModel(modelName);
    return model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      systemInstruction: systemInstruction
        ? { role: 'system', parts: [{ text: systemInstruction }] }
        : undefined,
      generationConfig: { responseMimeType: 'application/json', temperature },
    });
  };

  try {
    let result;
    try {
      result = await callModel(activeModelName);
    } catch (primaryErr: any) {
      const errMsg = primaryErr?.message || '';
      if (isQuotaError(errMsg)) {
        // Primary model quota exhausted — try the other model
        const altModel = activeModelName === fastModel ? deepModel : fastModel;
        console.warn(`[thinkJSON] ${activeModelName} quota exhausted — switching to ${altModel}`);
        activeModelName = altModel;
        result = await callModel(activeModelName);
      } else if (isOverloadError(errMsg)) {
        // Overload — retry once after 2s with same model, then try alt model
        console.warn(`[thinkJSON] ${activeModelName} overloaded — retrying in 2s...`);
        await new Promise(r => setTimeout(r, 2000));
        try {
          result = await callModel(activeModelName);
        } catch {
          const altModel = activeModelName === fastModel ? deepModel : fastModel;
          console.warn(`[thinkJSON] Retry also failed — switching to ${altModel}`);
          activeModelName = altModel;
          result = await callModel(activeModelName);
        }
      } else {
        throw primaryErr;
      }
    }

    const response = await result.response;
    const rawText = response.text();
    const cleanedText = cleanJsonOutput(rawText);

    let parsedJson = JSON.parse(cleanedText);

    // If output is wrapped in data/result/campaign, attempt unwrapping if direct parse fails
    let validatedData: T;
    const directParsed = schema.safeParse(parsedJson);
    if (directParsed.success) {
      validatedData = directParsed.data;
    } else if (parsedJson.data && schema.safeParse(parsedJson.data).success) {
      validatedData = schema.parse(parsedJson.data);
    } else if (parsedJson.result && schema.safeParse(parsedJson.result).success) {
      validatedData = schema.parse(parsedJson.result);
    } else if (parsedJson.campaign && schema.safeParse(parsedJson.campaign).success) {
      validatedData = schema.parse(parsedJson.campaign);
    } else {
      validatedData = schema.parse(parsedJson);
    }

    const latencyMs = Date.now() - startTime;
    const usage = response.usageMetadata;

    const tokensIn = usage?.promptTokenCount || Math.ceil(((prompt?.length || 0) + (systemInstruction?.length || 0)) / 4) || 0;
    const tokensOut = usage?.candidatesTokenCount || Math.ceil((rawText?.length || 0) / 4) || 0;
    const totalTokens = (usage as any)?.totalTokenCount || (tokensIn + tokensOut);

    const reportedModel = 'gemini-3.8-flash';

    await logAiRun({
      userId,
      feature: featureName,
      model: reportedModel,
      latencyMs,
      success: true,
      tokensIn,
      tokensOut,
    });

    return {
      data: validatedData,
      meta: {
        tokensIn,
        tokensOut,
        totalTokens,
        latencyMs,
        model: reportedModel,
      },
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    const tokensIn = Math.ceil(((prompt?.length || 0) + (systemInstruction?.length || 0)) / 4) || 0;
    await logAiRun({
      userId,
      feature: featureName,
      model: activeModelName,
      latencyMs,
      success: false,
      tokensIn,
      errorMessage: sanitizeErrorMessage(err.message),
    });

    console.error(`[thinkJSON] Error in ${featureName}:`, sanitizeErrorMessage(err.message));
    throw err;
  }
}

/**
 * Execute a Gemini prompt and validate output against a Zod schema with audit logging
 */
export async function thinkJSON<T>(options: ThinkJSONOptions<T>): Promise<T> {
  const result = await thinkJSONWithMeta<T>(options);
  return result.data;
}

