import { z } from 'zod';

import schema from './schema.summary';
import prompt from './prompt.summary';

export const memPromptSummary = {
  schema,
  prompt,
};

export type TMemPromptSummaryJSON = z.infer<typeof schema>;