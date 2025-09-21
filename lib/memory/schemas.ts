import { z } from 'zod';

export const SummarySchema = z.object({
  summary: z.string().max(280),
});
export type SummaryJSON = z.infer<typeof SummarySchema>;

export const UserProfileSchema = z.object({
  profile: z.object({
    explicit: z.string().max(1200).default(''),
    implicit: z.string().max(1200).default(''),
  }),
  assistant: z
    .object({
      tone: z.string().max(100).optional(),
      style: z.string().max(100).optional(),
      frustration_triggers: z.array(z.string().max(100)).max(5).optional(),
      engagement_patterns: z.string().max(200).optional(),
    })
    .optional(),
  flags: z
    .object({
      explicitChanged: z.boolean().optional(),
      implicitChanged: z.boolean().optional(),
      assistantChanged: z.boolean().optional(),
    })
    .optional(),
});
export type UserProfileJSON = z.infer<typeof UserProfileSchema>;

export const EntitySchema = z.object({
  name: z.string(),
  aliases: z.array(z.string()).optional(),
  type: z.enum(['person','project','org','term','other']).optional(),
  meta: z.record(z.any()).optional(),
});

export const RelationSchema = z.object({
  a: z.string(),
  r: z.string(),
  b: z.string(),
  t: z.number(),
  note: z.string().optional(),
});

export const FacetsSchema = z.object({
  graph: z.object({
    entities: z.record(EntitySchema).optional(),
    relations: z.array(RelationSchema).optional(),
  }).optional(),
  tasks: z.object({
    active: z.array(z.object({ id: z.string(), title: z.string(), due: z.number().optional() })).default([]),
    history: z.array(z.string()).default([]),
  }).optional(),
  style: z.object({
    brevity: z.enum(['short','medium','long']).optional(),
    format: z.enum(['bullets','paragraphs','code-first']).optional(),
  }).optional(),
  tools: z.record(z.object({ ok: z.number().default(0), fail: z.number().default(0), avgMs: z.number().optional(), lastOkAt: z.number().optional() })).optional(),
  safety: z.object({ blockedTopics: z.array(z.string()).optional(), piiSeen: z.boolean().optional() }).optional(),
  timeline: z.array(z.object({ t: z.number(), note: z.string() })).optional(),
});
export type FacetsJSON = z.infer<typeof FacetsSchema>;

export type SchemaKey = 'summary'|'user'|'facets';


