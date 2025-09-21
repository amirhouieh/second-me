import { z } from 'zod';
import schema from './schema.facets';
import prompt from './prompt.facets';
import ingestPrompt from './prompt.facets.ingest';

export const memPromptFacets = {
  schema,
  prompt,
  ingestPrompt
};

export type TMemPromptFacetsJSON = z.infer<typeof schema>;