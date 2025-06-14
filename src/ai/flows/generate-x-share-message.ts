
// src/ai/flows/generate-x-share-message.ts
'use server';

/**
 * @fileOverview Generates engaging share messages for X (Twitter).
 *
 * - generateXShareMessage - A function that generates the share message.
 * - GenerateXShareMessageInput - The input type for the generateXShareMessage function.
 * - GenerateXShareMessageOutput - The return type for the generateXShareMessage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateXShareMessageInputSchema = z.object({
  predictionText: z.string().describe('The core text of the prediction or event.'),
  outcomeDescription: z.string().describe('A short description of the outcome or current state, e.g., "I WON", "I just SOLD my bet for", "I\'m betting YES that", "My bet is LIVE on".'),
  betAmount: z.number().optional().describe('The original amount bet, if relevant to the share message.'),
  finalAmount: z.number().optional().describe('The final amount, such as winnings, sell value, or potential payout. To be used with currency.'),
  currency: z.string().optional().default('$').describe('The currency symbol or code (e.g., "$", "SOL", "XP"). Default is "$".'),
  opponentUsername: z.string().optional().describe('The username of the opponent, if applicable.'),
  callToAction: z.string().optional().describe('A custom call to action to include, e.g., "Think you can beat me?", "What\'s your take?".'),
});
export type GenerateXShareMessageInput = z.infer<typeof GenerateXShareMessageInputSchema>;

const GenerateXShareMessageOutputSchema = z.object({
  shareMessage: z.string().describe('The generated share message for X.'),
});
export type GenerateXShareMessageOutput = z.infer<typeof GenerateXShareMessageOutputSchema>;

export async function generateXShareMessage(input: GenerateXShareMessageInput): Promise<GenerateXShareMessageOutput> {
  return generateXShareMessageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateXShareMessagePrompt',
  input: {schema: GenerateXShareMessageInputSchema},
  output: {schema: GenerateXShareMessageOutputSchema},
  prompt: `Generate a short, engaging, and viral share message for X (Twitter) based on a user's betting activity on WinBig.

Context:
- Prediction: "{{{predictionText}}}"
- User's situation: "{{{outcomeDescription}}}"
{{#if finalAmount}}
- Amount involved: {{{finalAmount}}} {{{currency}}}
{{else if betAmount}}
- Bet amount: {{{betAmount}}} {{{currency}}}
{{/if}}
{{#if opponentUsername}}
- Against: @{{{opponentUsername}}}
{{/if}}

Instructions:
1. Craft a message under 280 characters.
2. Make it sound exciting, fun, or a bit provocative depending on the context.
3. If an opponent is mentioned, incorporate them naturally.
4. If a 'finalAmount' (like winnings or sell value) is provided, highlight it.
5. Include relevant hashtags like #WinBig, #prediction, #bet, #crypto, #sports, etc., based on the prediction.
6. Include 1-2 relevant emojis to enhance engagement.
7. If a 'callToAction' is provided, try to weave it in. If not, create a general one like "Join the action on #WinBig!" or "What do you predict?".

Examples based on input:

- If 'outcomeDescription' is "I WON" and 'finalAmount' is 50:
  "BOOM! 🚀 Just WON 50 {{{currency}}} on WinBig predicting: '{{{predictionText}}}'! Feeling like a legend. #WinBig #Winner"

- If 'outcomeDescription' is "I just SOLD my bet for" and 'finalAmount' is 30:
  "Cashed out! 💰 Sold my bet on '{{{predictionText}}}' for 30 {{{currency}}} on WinBig. Smart moves! #Trading #WinBig"

- If 'outcomeDescription' is "I'm betting YES that" and 'betAmount' is 10 and 'opponentUsername' is 'RivalJoe':
  "Locked in! 🎲 Betting 10 {{{currency}}} that '{{{predictionText}}}' against @RivalJoe on WinBig. {{{callToAction}}} #Challenge #WinBig"
  
- If 'outcomeDescription' is "My bet is LIVE on" and 'potentialWinnings' is 19:
  "My bet is LIVE on WinBig! 🔥 '{{{predictionText}}}' - watching this one closely. Potential for 19 {{{currency}}}! What's your take? #WinBig #LiveBet"

Prioritize making the message engaging and natural-sounding for X.
If '{{{callToAction}}}' is provided, use it. Otherwise, come up with a suitable one.

Share Message:`, 
});

const generateXShareMessageFlow = ai.defineFlow(
  {
    name: 'generateXShareMessageFlow',
    inputSchema: GenerateXShareMessageInputSchema,
    outputSchema: GenerateXShareMessageOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

// Example usage (for testing):
// async function test() {
//   const exampleWon: GenerateXShareMessageInput = {
//     predictionText: "Bitcoin will hit $100k by EOY",
//     outcomeDescription: "I WON BIG!",
//     finalAmount: 150,
//     currency: "SOL",
//     callToAction: "Who's next?"
//   };
//   const exampleLiveBet: GenerateXShareMessageInput = {
//     predictionText: "The Lakers will win the championship",
//     outcomeDescription: "I'm betting YES that",
//     betAmount: 20,
//     currency: "$",
//     opponentUsername: "LeBronFan23",
//     callToAction: "Think they'll lose?"
//   };
//   const wonMessage = await generateXShareMessage(exampleWon);
//   console.log("Won message:", wonMessage.shareMessage);
//   const liveBetMessage = await generateXShareMessage(exampleLiveBet);
//   console.log("Live bet message:", liveBetMessage.shareMessage);
// }
// test();
