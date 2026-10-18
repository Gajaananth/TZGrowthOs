import { z } from 'zod';
import { SINGLISH_EXAMPLES } from './examples/singlish.js';
import { TANGLISH_EXAMPLES } from './examples/tanglish.js';

export const CampaignGenerationSchema = z.preprocess((val: any) => {
  if (!val || typeof val !== 'object') return val;
  const normalized = { ...val };

  // If Gemini placed captions under content.{lang}.caption
  if (!normalized.captions && normalized.content && typeof normalized.content === 'object') {
    normalized.captions = {
      en: normalized.content.en?.caption || normalized.content.en?.body || '',
      si: normalized.content.si?.caption || normalized.content.si?.body || '',
      ta: normalized.content.ta?.caption || normalized.content.ta?.body || '',
      singlish: normalized.content.singlish?.caption || normalized.content.singlish?.body || '',
      tanglish: normalized.content.tanglish?.caption || normalized.content.tanglish?.body || '',
    };
  }

  // If Gemini placed CTA under content.{lang}.cta
  if (!normalized.call_to_action && normalized.content && typeof normalized.content === 'object') {
    normalized.call_to_action = {
      en: normalized.content.en?.cta || 'Order via WhatsApp or call for Islandwide Delivery!',
      si: normalized.content.si?.cta || 'ඇණවුම් සඳහා WhatsApp කරන්න හෝ අමතන්න!',
      ta: normalized.content.ta?.cta || 'ஆர்டர் செய்ய WhatsApp அல்லது அழையுங்கள்!',
      singlish: normalized.content.singlish?.cta || 'Order karanna danma WhatsApp karanna!',
      tanglish: normalized.content.tanglish?.cta || 'Order panna ippove WhatsApp pannunga!',
    };
  }

  // If poster_concept is an object with layout/typography/visual_elements
  if (normalized.poster_concept && typeof normalized.poster_concept === 'object') {
    const pc = normalized.poster_concept;
    normalized.poster_concept = [pc.layout, pc.typography ? `Typography: ${pc.typography}` : '', pc.visual_elements ? `Visuals: ${pc.visual_elements}` : ''].filter(Boolean).join(' | ');
  }

  if (!normalized.platform_variations) {
    normalized.platform_variations = {};
  }

  return normalized;
}, z.object({
  captions: z.object({
    en: z.string().min(5),
    si: z.string().min(5),
    ta: z.string().min(5),
    singlish: z.string().min(5),
    tanglish: z.string().min(5),
  }),
  call_to_action: z.object({
    en: z.string(),
    si: z.string(),
    ta: z.string(),
    singlish: z.string(),
    tanglish: z.string(),
  }),
  hashtags: z.union([
    z.array(z.string()).min(1),
    z.object({
      en: z.array(z.string()).optional().default([]),
      si: z.array(z.string()).optional().default([]),
      ta: z.array(z.string()).optional().default([]),
      singlish: z.array(z.string()).optional().default([]),
      tanglish: z.array(z.string()).optional().default([]),
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
  }).optional().default({}),
}));

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

Generate strictly matching this JSON schema (raw JSON object, no markdown wrappers):
{
  "captions": {
    "en": "Engaging Sri Lankan English caption",
    "si": "ස්වභාවික සිංහල යුනිකෝඩ් සිරස්තලය",
    "ta": "இயற்கையான தமிழ் யூனிகோட் தலைப்பு",
    "singlish": "Lively conversational Singlish caption with Avurudu/festive vibe",
    "tanglish": "Conversational Tanglish caption for local shoppers"
  },
  "call_to_action": {
    "en": "WhatsApp or call for Islandwide Delivery!",
    "si": "දිවයින පුරා බෙදාහැරීම සඳහා දැන්ම WhatsApp කරන්න!",
    "ta": "இலங்கை முழுவதும் துரித விநியோகத்திற்கு இப்போதே WhatsApp செய்யுங்கள்!",
    "singlish": "Islandwide delivery thiyanawa. Danma WhatsApp karanna!",
    "tanglish": "Islandwide delivery irukku. Ippove WhatsApp pannunga!"
  },
  "hashtags": {
    "en": ["#SriLanka", "#ColomboShopping", "#RetailLK"],
    "si": ["#ලංකාවේනිෂ්පාදන", "#කොළඹ", "#වෙළඳාම"],
    "ta": ["#இலங்கை", "#கொழும்பு", "#பொருட்கள்"],
    "singlish": ["#LankaDeals", "#GedaratamaDelivery"],
    "tanglish": ["#PuthanduOffers", "#VeetukkeDelivery"]
  },
  "trending_tags_advice": "Advice on viral local retail hashtags",
  "poster_concept": "Detailed creative art direction for poster layout and colors",
  "image_prompt": "Ultra-detailed photorealistic commercial product photography prompt"
}
`;
}
