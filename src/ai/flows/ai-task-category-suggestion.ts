'use server';
/**
 * @fileOverview This file provides a Genkit flow for suggesting task categories based on a task description.
 *
 * - aiTaskCategorySuggestion - A function that suggests relevant task categories.
 * - AiTaskCategorySuggestionInput - The input type for the aiTaskCategorySuggestion function.
 * - AiTaskCategorySuggestionOutput - The return type for the aiTaskCategorySuggestion function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiTaskCategorySuggestionInputSchema = z.object({
  taskDescription: z.string().describe('The description of the new task.'),
  existingCategories: z.array(z.string()).optional().describe('An optional list of existing task categories.'),
});
export type AiTaskCategorySuggestionInput = z.infer<typeof AiTaskCategorySuggestionInputSchema>;

const AiTaskCategorySuggestionOutputSchema = z.object({
  suggestedCategories: z.array(z.string()).describe('A list of suggested task categories.'),
});
export type AiTaskCategorySuggestionOutput = z.infer<typeof AiTaskCategorySuggestionOutputSchema>;

export async function aiTaskCategorySuggestion(input: AiTaskCategorySuggestionInput): Promise<AiTaskCategorySuggestionOutput> {
  return aiTaskCategorySuggestionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiTaskCategorySuggestionPrompt',
  input: {schema: AiTaskCategorySuggestionInputSchema},
  output: {schema: AiTaskCategorySuggestionOutputSchema},
  prompt: `You are a helpful assistant that suggests task categories.
Based on the following task description and optionally existing categories, suggest up to 3 relevant categories for the task.
Prioritize categories from the existing list if they are a good fit. If no existing categories fit, suggest new, appropriate categories.

Task Description: {{{taskDescription}}}

{{#if existingCategories}}
Existing Categories:
{{#each existingCategories}}- {{{this}}}
{{/each}}
{{/if}}
`,
});

const aiTaskCategorySuggestionFlow = ai.defineFlow(
  {
    name: 'aiTaskCategorySuggestionFlow',
    inputSchema: AiTaskCategorySuggestionInputSchema,
    outputSchema: AiTaskCategorySuggestionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
