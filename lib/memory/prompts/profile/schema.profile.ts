import { z } from 'zod';

const BulletText = z
  .string()
  .max(700, 'Max 700 characters')
  .transform(s => s.trim())
  .transform(s => s.replace(/\s+\n/g, '\n')) // normalize spaces before newlines
  .transform(s => s.split(/\r?\n/).map(l => l.trim()).filter(Boolean).slice(0, 7).join('\n')); // ≤7 lines

const ShortText = z
  .string()
  .max(100)
  .transform(s => s.trim());


const UserProfileSchema = z.object({
  explicit: BulletText
    .describe(
      'EXPLICIT: user-stated facts/preferences/desires/intentions/goals; concise bullet lines joined by \n.'
    )
    .default(''),
  implicit: BulletText
    .describe(
      'IMPLICIT: cautiously inferred tendencies (hedged); MUST NOT restate explicit; concise bullet lines joined by \n.'
    )
    .default(''),
});

const AssistantSchema = z.object({
  tone: ShortText
    .optional()
    .describe('Assistant tone to adopt; may be explicitly requested by user or inferred')
    .default('conversational'),

  style: ShortText
    .optional()
    .describe('Assistant communication style to adopt (e.g., direct, playful, detailed)')
    .default('direct'),

  frustration_triggers: z.array(
    z.string())
    .max(5)
    .optional()
    .describe('Short triggers to avoid to reduce user frustration')
    .default([]),

  engagement_patterns:
    z.string()
      .max(200)
      .optional()
      .describe('Concise note on what keeps the user engaged')
      .default(''),

});


const FlagsSchema = z.object({
  explicitChanged: z.boolean()
    .default(false)
    .describe('Flag to indicate if the explicit profile has changed'),

  implicitChanged: z.boolean()
    .default(false)
    .describe('Flag to indicate if the implicit profile has changed'),

  assistantChanged: z.boolean()
    .default(false)
    .describe('Flag to indicate if the assistant has changed'),
})

const schema = z.object({
  profile: UserProfileSchema
    .describe('User profile content: explicit statements vs model-inferred tendencies'),

  assistant: AssistantSchema
    .describe('Assistant interaction policy derived from user requests and inferred preferences'),

  flags: FlagsSchema
    .describe('Flags to indicate if the profile or assistant has changed'),
});

export default schema;


