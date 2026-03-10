'use server';
/**
 * @fileOverview A Genkit flow for AI-powered autocompletion of time entry notes.
 *
 * - suggestTimeEntryNoteCompletion - A function that suggests autocompletions for time entry notes.
 * - SuggestTimeEntryNoteCompletionInput - The input type for the suggestTimeEntryNoteCompletion function.
 * - SuggestTimeEntryNoteCompletionOutput - The return type for the suggestTimeEntryNoteCompletion function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestTimeEntryNoteCompletionInputSchema = z.object({
  currentNotePartial: z
    .string()
    .describe('The partial note text the user has entered so far.'),
  pastNotes: z
    .array(z.string())
    .describe(
      'A list of past notes for similar tasks or projects, used to inform suggestions.'
    ),
});
export type SuggestTimeEntryNoteCompletionInput = z.infer<
  typeof SuggestTimeEntryNoteCompletionInputSchema
>;

const SuggestTimeEntryNoteCompletionOutputSchema = z.object({
  suggestedCompletion: z
    .string()
    .describe('The AI-suggested autocompletion for the note.'),
});
export type SuggestTimeEntryNoteCompletionOutput = z.infer<
  typeof SuggestTimeEntryNoteCompletionOutputSchema
>;

export async function suggestTimeEntryNoteCompletion(
  input: SuggestTimeEntryNoteCompletionInput
): Promise<SuggestTimeEntryNoteCompletionOutput> {
  return suggestTimeEntryNoteCompletionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'timeEntryNoteAutocompletionPrompt',
  input: {schema: SuggestTimeEntryNoteCompletionInputSchema},
  output: {schema: SuggestTimeEntryNoteCompletionOutputSchema},
  prompt: `You are an AI assistant specialized in providing concise and relevant autocompletions for time entry notes.

Based on the user's 'currentNotePartial' and the provided 'pastNotes', suggest a single, short completion that the user might be typing.
The suggestion should seamlessly continue the 'currentNotePartial'. Only provide the completion, not the original partial note.
If no relevant completion can be made, return an empty string.

Past Notes:
{{#each pastNotes}}- {{{this}}}
{{/each}}

Current partial note: "{{{currentNotePartial}}}"

Example:
User input: "Working on feature a"
Past notes: ["Working on feature alpha integration", "Working on feature beta bug fix"]
Suggested Completion: "lpha integration"

User input: "Updated d"
Past notes: ["Updated documentation", "Updated database schema"]
Suggested Completion: "ocumentation"

User input: "Meeting with c"
Past notes: ["Meeting with client John Doe", "Meeting with project team"]
Suggested Completion: "lient John Doe"

User input: "Reviewed pr"
Past notes: ["Reviewed pull request #123", "Reviewed project plan"]
Suggested Completion: "oject plan"

Return only the suggested completion as a string.`,
});

const suggestTimeEntryNoteCompletionFlow = ai.defineFlow(
  {
    name: 'suggestTimeEntryNoteCompletionFlow',
    inputSchema: SuggestTimeEntryNoteCompletionInputSchema,
    outputSchema: SuggestTimeEntryNoteCompletionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
