// src/ai/flows/generate-x-share-message.ts
'use server';

/**
 * @fileOverview Generates engaging share messages for X (Twitter) when a user places a bet.
 *
 * - generateXShareMessage - A function that generates the share message.
 * - GenerateXShareMessageInput - The input type for the generateXShareMessage function.
 * - GenerateXShareMessageOutput - The return type for the generateXShareMessage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateXShareMessageInputSchema = z.object({
  prediction: z.string().describe('The prediction being made in the bet.'),
  betAmount: z.number().describe('The amount being bet.'),
  potentialWinnings: z.number().describe('The potential winnings if the bet is successful.'),
  opponentUsername: z.string().describe('The username of the opponent in the bet.'),
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
  prompt: `Generate a short, engaging, and viral share message for X (Twitter) to promote a bet.

  The message should include:
  - The prediction: {{{prediction}}}
  - The bet amount: {{{betAmount}}}
  - The potential winnings: {{{potentialWinnings}}}
  - The opponent's username: {{{opponentUsername}}}

  The message should be designed to encourage followers to participate and drive viral growth.
  Make it fun, exciting and a little bit provocative.
  Include relevant hashtags like #bet #prediction #challenge.
  Keep the message under 280 characters.
  Example: "I just bet {{{betAmount}}} that {{{prediction}}} against @{{{opponentUsername}}}! If I win, I get {{{potentialWinnings}}}! Think you can beat me? #bet #challenge"
  
  Ensure the message is tailored for X and includes relevant emojis to enhance engagement.
  
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
