import { z } from 'zod';

const collapse = (s: string) => s.replace(/\s+/g, ' ').trim();
const wordCount = (s: string) => (collapse(s).length ? collapse(s).split(' ').length : 0);

const schema = z.object({
  summary: z
    .string()
    .max(200, 'Summary must be ≤ 200 characters')
    .describe(
      'One-line mini-report of the exchange: "<who> asked <topic>; assistant <action> → <outcome>." ' +
      'Use provided displayName if available. No quotes, no links, no hedging. ' +
      'Max 28 words; neutral, factual, specific.'
    )
    .transform(s => s.replace(/\s+/g, ' ').trim())
    .refine(s => wordCount(s) <= 28, { message: 'Summary must be ≤ 28 words' }),
});

export default schema;
