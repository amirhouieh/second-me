import { z } from "zod";
import { tool as _tool } from "ai";
import { DataToolName } from './names';

const inputSchema = z.object({
  query: z.string().describe('The original user query'),
  intent: z.string().optional().describe('Parsed intent, if available'),
  entities: z.array(z.string()).optional().describe('Parsed entities, if available'),
});

const outputSchema = z.object({
  items: z.array(z.object({ label: z.string(), message: z.string() })).min(1).max(6),
});

export type TInput = z.infer<typeof inputSchema>;
export type TOutput = z.infer<typeof outputSchema>;

export const def = {
  name: DataToolName.GetFollowUps as any,
  description: "Generate 2–4 concise, relevant follow-up suggestions (label + message)",
  label: 'Thinking of follow-ups…',
  doneLabel: 'Follow-ups ready',
  inputSchema,
  outputSchema,
};

export const tool = _tool<TInput, TOutput>({
  description: def.description,
  inputSchema: def.inputSchema,
  async execute({ query, intent, entities }) {
    // Simple heuristic; in production you might delegate to an LLM or rules
    const suggestions: Array<{ label: string; message: string }> = [];
    const topic = (entities && entities[0]) || (intent || 'this topic');
    suggestions.push({ label: `More on ${topic}`, message: `Tell me more about ${topic}` });
    suggestions.push({ label: 'Show projects', message: 'Show me related projects' });
    suggestions.push({ label: 'Show experience', message: 'Show experience highlights' });

    return outputSchema.parse({ items: suggestions.slice(0, 4) });
  },
});
