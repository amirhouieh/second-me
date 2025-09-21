import { z } from 'zod';
import schema from './schema.profile';
import prompt from './prompt.profile';
import ingestPrompt from './prompt.profile.ingest';

export const memPromptUserProfile = {
    schema,
    prompt,
    ingestPrompt
}

export type TMemPromptUserProfileJSON = z.infer<typeof schema>;