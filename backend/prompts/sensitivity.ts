import { z } from 'zod';

export const SensitivityReviewSchema = z.object({
  passed: z.boolean(),
  flags: z.array(z.string()).optional().default([]),
  suggestions: z.array(z.string()).optional().default([]),
  overall_verdict: z.string().optional().default('Approved for local publication.'),
});

export type SensitivityReviewOutput = z.infer<typeof SensitivityReviewSchema>;

export function buildSensitivityPrompt(params: {
  productName: string;
  category: string;
  festivalName?: string;
  festivalRules?: string[];
  captions: {
    en: string;
    si: string;
    ta: string;
    singlish: string;
    tanglish: string;
  };
}): string {
  const { productName, category, festivalName, festivalRules, captions } = params;

  return `
You are a Senior Sri Lankan Cultural Advisor and Brand Safety Officer.
Analyze the following retail marketing copy for cultural, ethnic, and religious sensitivity in Sri Lanka.

Context:
- Product: ${productName} (Category: ${category})
${festivalName ? `- Linked Festival: ${festivalName}` : ''}
${festivalRules && festivalRules.length ? `- Rules to check against:\n${festivalRules.map(r => '  * ' + r).join('\n')}` : ''}

Generated Copy:
- English: ${captions.en}
- Sinhala: ${captions.si}
- Tamil: ${captions.ta}
- Singlish: ${captions.singlish}
- Tanglish: ${captions.tanglish}

Checks to perform:
1. Religious & Ethnic Respect: No offensive, insensitive, or exclusionary phrases.
2. Holiday Appropriateness: If linked to Vesak or Buddhist observance, verify no alcohol, meat, or disrespectful revelry is encouraged.
3. Ramadan/Eid Appropriateness: Verify respect for fasting times vs Eid celebration.
4. Commercial Tone: Friendly and celebratory, without exploitative or misleading claims.

Return strictly matching this JSON schema:
{
  "passed": true,
  "flags": [],
  "suggestions": ["Helpful suggestion or best practice"],
  "overall_verdict": "Clear 1-sentence cultural approval verdict"
}
`;
}
