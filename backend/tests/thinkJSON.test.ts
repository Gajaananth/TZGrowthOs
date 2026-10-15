import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { cleanJsonOutput } from '../services/ai/thinkJSON.js';

describe('thinkJSON parser and schema validator', () => {
  it('cleans standard markdown fenced code blocks with ```json', () => {
    const raw = '```json\n{"name": "Batik Shirt", "price": 4500}\n```';
    const cleaned = cleanJsonOutput(raw);
    expect(cleaned).toBe('{"name": "Batik Shirt", "price": 4500}');
    expect(() => JSON.parse(cleaned)).not.toThrow();
  });

  it('cleans generic markdown code blocks with ```', () => {
    const raw = '```\n{"success": true, "tokens": 120}\n```';
    const cleaned = cleanJsonOutput(raw);
    expect(cleaned).toBe('{"success": true, "tokens": 120}');
    expect(() => JSON.parse(cleaned)).not.toThrow();
  });

  it('leaves pure clean JSON string unchanged', () => {
    const raw = '{"key": "value"}';
    const cleaned = cleanJsonOutput(raw);
    expect(cleaned).toBe('{"key": "value"}');
  });

  it('validates zod schemas on parsed JSON', () => {
    const TestSchema = z.object({
      product: z.string(),
      score: z.number().min(0).max(100),
      channels: z.array(z.string()),
    });

    const validPayload = JSON.parse(cleanJsonOutput('```json\n{"product": "Ceylon Tea", "score": 85, "channels": ["WhatsApp", "Facebook"]}\n```'));
    const validated = TestSchema.parse(validPayload);
    expect(validated.product).toBe('Ceylon Tea');
    expect(validated.score).toBe(85);
    expect(validated.channels).toHaveLength(2);

    const invalidPayload = { product: 123, score: 999 };
    expect(() => TestSchema.parse(invalidPayload)).toThrow();
  });
});
