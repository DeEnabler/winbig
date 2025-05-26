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
  // endsAt: z.string().datetime().optional().describe("Optional ISO 8601 datetime string for when the prediction outcome is known."),
  // imageUrl: z.string().url().optional().describe("Optional URL for an image related to the prediction."),
  // aiHint: z.string().optional().describe("Optional 1-2 keywords for image search if imageUrl is not provided."),
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
    // In a real scenario, you might add logic here to fetch live trending topics
    // if input.trendingTopics is empty or needs supplementing.
    // For now, we directly use the provided topics.

    const {output} = await prompt(input);
    
    // Ensure generated IDs are somewhat unique if the model doesn't do it well enough.
    // This is a simple client-side addition; a robust solution might involve checking against a DB.
    if (output?.predictions) {
      output.predictions = output.predictions.map((p, index) => ({
        ...p,
        id: p.id && p.id.length > 3 ? p.id : `genPred_${Date.now()}_${index}`
      }));
    }
    
    return output!;
  }
);
