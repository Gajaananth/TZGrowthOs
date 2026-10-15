import { z } from 'zod';
import { SINGLISH_EXAMPLES } from './examples/singlish.js';
import { TANGLISH_EXAMPLES } from './examples/tanglish.js';

export const CampaignGenerationSchema = z.object({
  captions: z.object({
    en: z.string().min(10),
    si: z.string().min(10),
    ta: z.string().min(10),
    singlish: z.string().min(10),
    tanglish: z.string().min(10),
  }),
  call_to_action: z.object({
    en: z.string(),
    si: z.string(),
    ta: z.string(),
    singlish: z.string(),
    tanglish: z.string(),
  }),
  hashtags: z.union([
    z.array(z.string()).min(3),
    z.object({
      en: z.array(z.string()),
      si: z.array(z.string()),
      ta: z.array(z.string()),
      singlish: z.array(z.string()),
      tanglish: z.array(z.string()),
    }),
  ]),
  trending_tags_advice: z.string().optional(),
  poster_concept: z.string(),
  image_prompt: z.string(),
  platform_variations: z.object({
    facebook: z.string().optional(),
    instagram: z.string().optional(),
    tiktok: z.string().optional(),
    whatsapp: z.string().optional(),
  }),
});

export type CampaignGenerationOutput = z.infer<typeof CampaignGenerationSchema>;

export function buildCampaignPrompt(params: {
  productName: string;
  category: string;
  priceLkr: number;
  description?: string;
  businessName: string;
  city: string;
  brandTone: string;
  objective: string;
  platforms: string[];
  festivalName?: string;
  festivalRules?: string[];
}): string {
  const {
    productName,
    category,
    priceLkr,
    description,
    businessName,
    city,
    brandTone,
    objective,
    platforms,
    festivalName,
    festivalRules,
  } = params;

  return `
You are the Lead Creative Marketing Strategist for "${businessName}", a retail business in ${city}, Sri Lanka.
Tone of Voice: ${brandTone || 'friendly, authentic, local, trusted'}.

Create a comprehensive marketing campaign for the following product:
- Product: ${productName}
- Category: ${category}
- Price: Rs. ${priceLkr.toLocaleString('en-US', { minimumFractionDigits: 2 })}
- Product Details: ${description || 'Authentic Sri Lankan product'}
- Marketing Objective: ${objective}
- Target Platforms: ${platforms.join(', ')}
${festivalName ? `- Linked Festival / Season: ${festivalName}` : ''}
${festivalRules && festivalRules.length > 0 ? `- Cultural Guidelines to follow:\n${festivalRules.map(r => '  * ' + r).join('\n')}` : ''}

CRITICAL LINGUISTIC INSTRUCTIONS:
1. English ("en"): Professional, engaging, and localized for Sri Lankan English speakers.
2. Sinhala ("si"): Written strictly in authentic Sinhala Unicode script (e.g. "අපගේ උසස් තත්ත්වයේ..."). Natural, warm phrasing.
3. Tamil ("ta"): Written strictly in authentic Tamil Unicode script (e.g. "எங்களின் தரமான தயாரிப்பு..."). Natural, respectful phrasing.
4. Singlish ("singlish"): Written in Latin/English alphabet mimicking natural Sri Lankan Sinhala speech. Examples of style:
${JSON.stringify(SINGLISH_EXAMPLES.slice(0, 2), null, 2)}
5. Tanglish ("tanglish"): Written in Latin/English alphabet mimicking natural Sri Lankan Tamil speech. Examples of style:
${JSON.stringify(TANGLISH_EXAMPLES.slice(0, 2), null, 2)}
6. Hashtags ("hashtags"): Provide localized, high-engagement hashtags for all 5 languages:
   - "en": E.g. ["#SriLanka", "#ColomboShopping", "#IslandwideDelivery", "#RetailLK"]
   - "si": E.g. ["#ලංකාවේනිෂ්පාදන", "#අඩුමමිලට", "#සිංහලවෙළඳාම", "#කොළඹ"]
   - "ta": E.g. ["#இலங்கை", "#கொழும்பு", "#சிறந்தவிலை", "#டெலிவரி"]
   - "singlish": E.g. ["#LankaDeals", "#AdumaMilata", "#GedaratamaDelivery", "#SuperBadu"]
   - "tanglish": E.g. ["#SemmaOffer", "#NallaQuality", "#ColomboKada", "#VeetukkeDelivery"]
7. Call to Action: Tailored for Sri Lankan e-commerce habits (mentioning WhatsApp orders, islandwide cash on delivery, or DM to order).
8. Trending Tags Advice: A 1-2 sentence tip recommending which tags are most viral in Sri Lanka right now.
9. Poster Concept: Clear visual art direction describing the banner layout, typography placement, and Sri Lankan aesthetic motifs.
10. Image Prompt: Photorealistic text-to-image prompt.

Generate strictly in the requested JSON structure.
`;
}
