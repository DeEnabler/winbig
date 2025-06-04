
// src/ai/flows/generate-predictions-from-trends-flow.ts
'use server';

/**
 * @fileOverview Generates bettable prediction cards based on trending X topics.
 *
 * - generatePredictionsFromTrends - A function that takes trending topics and generates predictions.
 * - GeneratePredictionsInput - The input type for the function.
 * - GeneratePredictionsOutput - The return type for the function.
 * - PredictionCardSchema - The Zod schema for a single generated prediction.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PredictionCardSchema = z.object({
  id: z.string().describe("A unique ID for the prediction (e.g., generated UUID or hash)."),
  text: z.string().describe("The engaging question for the prediction. Must be a 'Yes' or 'No' question."),
  category: z.string().describe("A relevant category (e.g., Politics, Crypto, Sports, Technology, Entertainment)."),
  endsAt: z.string().datetime().describe("ISO 8601 datetime string for when the prediction outcome is known (e.g., within 1 to 7 days from now)."),
  imageUrl: z.string().url().describe("URL for an image related to the prediction. Use 'https://placehold.co/600x400.png'."),
  aiHint: z.string().min(1).describe("1-2 relevant keywords for an image related to the prediction (e.g., 'election debate', 'crypto chart'). This will be used for image search later."),
  payoutTeaser: z.string().describe("A catchy teaser for potential payout, e.g., 'Bet $5 → Win $9.50'."),
  streakCount: z.number().min(0).default(0).optional().describe("Optional: A small number (0-5) for a mock 'streak count'. Default to 0."),
  facePileCount: z.number().min(0).default(0).optional().describe("Optional: A small number (0-50) for mock 'bettors already in'. Default to 0."),
  sourceTrend: z.string().describe("The original trending topic that inspired this prediction."),
});
export type PredictionCard = z.infer<typeof PredictionCardSchema>;


const GeneratePredictionsInputSchema = z.object({
  trendingTopics: z.array(z.string()).describe('A list of trending topics from X or other sources.'),
  count: z.number().min(1).max(10).default(5).describe('The number of prediction cards to generate.'),
});
export type GeneratePredictionsInput = z.infer<typeof GeneratePredictionsInputSchema>;

const GeneratePredictionsOutputSchema = z.object({
  predictions: z.array(PredictionCardSchema).describe('An array of generated prediction cards.'),
});
export type GeneratePredictionsOutput = z.infer<typeof GeneratePredictionsOutputSchema>;


export async function generatePredictionsFromTrends(input: GeneratePredictionsInput): Promise<GeneratePredictionsOutput> {
  return generatePredictionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generatePredictionsFromTrendsPrompt',
  input: {schema: GeneratePredictionsInputSchema},
  output: {schema: GeneratePredictionsOutputSchema},
  prompt: `You are an expert in creating engaging, viral prediction questions for a betting app called ViralBet.
Given a list of trending topics, generate a specified number of unique, bettable prediction cards.

Each prediction MUST:
1. Be a clear 'Yes' or 'No' question.
2. Be concise and suitable for a card display.
3. Be based on one of the provided trending topics.
4. Have a relevant category assigned (e.g., Politics, Crypto, Sports, Technology, Entertainment, Current Events).
5. Include the source trend.
6. Be interesting and likely to spark debate or betting interest.
7. Avoid overly niche or obscure topics unless they are widely trending.
8. Generate a unique ID for each prediction (e.g. a short random alphanumeric string like "pred_abc123").
9. Assign a plausible future ISO 8601 datetime string for 'endsAt' for when the prediction outcome will be known (e.g., generally within 1 to 7 days from the current date).
10. For 'imageUrl', provide the placeholder URL: 'https://placehold.co/600x400.png'.
11. For 'aiHint', provide 1-2 relevant keywords based on the prediction text for a future image search (e.g., 'election debate', 'crypto chart', 'football match'). This is mandatory.
12. Generate a 'payoutTeaser', e.g., 'Bet $5 → Win $9.50' or 'Bet 10 SOL → Potential 19 SOL'.
13. Optionally, provide a small 'streakCount' (0-5, default 0) and 'facePileCount' (0-50, default 0) if it makes sense for the topic.

Trending Topics:
{{#each trendingTopics}}
- {{{this}}}
{{/each}}

Generate {{count}} prediction cards.
`,
});

const generatePredictionsFlow = ai.defineFlow(
  {
    name: 'generatePredictionsFlow',
    inputSchema: GeneratePredictionsInputSchema,
    outputSchema: GeneratePredictionsOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    
    if (output?.predictions) {
      output.predictions = output.predictions.map((p, index) => ({
        ...p,
        id: p.id && p.id.length > 3 ? p.id : `genPred_${Date.now()}_${index}`,
        // Ensure defaults if model omits optional fields
        streakCount: p.streakCount ?? 0,
        facePileCount: p.facePileCount ?? 0,
        imageUrl: p.imageUrl || 'https://placehold.co/600x400.png', // Ensure placeholder
      }));
    }
    
    return output!;
  }
);

