import { z } from 'zod';
import { tool as createTool } from 'ai';
import { DataToolName } from './names';

export const inputSchema = z.object({
  query: z.string().describe('The raw user query'),
  intent: z.string().describe('Primary intent in short words'),
  concepts: z.array(z.string()).describe('Search terms that the user is interested in.'),
  entities: z.array(z.string()).default([]),
  subjects: z.array(z.string()).default([]).describe('Who the query is about: assistant | user | specific third-party names (e.g., "Amir").'),
  years: z.array(z.number()).default([]).describe('Any years explicitly mentioned or strongly implied (e.g., 2015).'),
  confidence: z.number().min(0).max(1),
  missing: z.array(z.string()).default([]),
  memoryContext: z.object({
    userSatisfaction: z.enum(['low', 'medium', 'high']).describe('Current user satisfaction level from memory'),
    preferredTone: z.string().describe('User\'s preferred communication tone from memory'),
    relationshipContext: z.array(z.string()).describe('Relevant relationships from memory that might inform tool selection'),
    adaptationNeeds: z.array(z.string()).describe('Areas where response needs to be adapted based on memory'),
  }).optional().describe('Memory-based context that should influence tool selection and response strategy'),
});

export type TInput = z.infer<typeof inputSchema>;

export const outputSchema = inputSchema;
export type TOutput = z.infer<typeof outputSchema>;

export const def = {
  name: DataToolName.ParseQuery,
  description: 'REQUIRED FIRST STEP: Analyze user query with memory context to extract intent, concepts, entities, subjects, years, confidence level, missing information, AND memory-based adaptation strategy. This guides both tool selection and response personalization.',
  label: 'Understanding your query…',
  doneLabel: 'Query understood',
  inputSchema,
  outputSchema,
};

export const tool = createTool<TInput, TOutput>({
  description: def.description,
  inputSchema: def.inputSchema,
  async execute(input) {
    // The model should provide the analysis when calling this tool
    // This validates the structure and provides feedback
    const parsed = outputSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(`Invalid query analysis: ${parsed.error.message}`);
    }
    
    // Return the validated analysis
    return parsed.data;
  },
});


