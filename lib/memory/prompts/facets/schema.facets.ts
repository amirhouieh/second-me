// facets.schema.ts
import { z } from 'zod';

const EntitySchema = z.object({
  name: z.string().describe('Canonical label for this entity id.'),
  aliases: z.array(z.string()).max(16).optional().describe('Alternative names; short strings.'),
  type: z.enum(['person','project','org','term','other']).describe('Coarse type; choose conservatively.'),
  meta: z.record(z.any()).optional().describe('Light attributes (e.g., url, repo). Keep small.'),
}).strict().describe('Entity value; the RECORD KEY is the stable id (lowercase, hyphenated).');

const RelationSchema = z.object({
  a: z.string().describe('Entity id (source).'),
  r: z.string().max(32).describe('Short relation label/verb, e.g., "works_on","met","owns".'),
  b: z.string().describe('Entity id (target).'),
  t: z.number().optional().describe('Epoch ms timestamp for when this relation was asserted/seen.'),
  note: z.string().max(140).optional().describe('Short note or context.'),
}).describe('Directed edge: a -r-> b at time t.');

const schema = z.object({
  graph: z.object({
    entities: z.record(EntitySchema).optional().describe('Map from stable entity id → entity payload.'),
    relations: z.array(RelationSchema).max(1000).optional().describe('List of recent relations (dedupe a|r|b; keep most recent).'),
  }).optional().describe('Lightweight knowledge graph mirror.'),
  conversation_evolution: z.object({
    satisfaction_level: z.enum(['low', 'medium', 'high']).optional().describe('Current user satisfaction with conversations'),
    adaptation_needs: z.array(z.string()).max(10).optional().describe('Areas where assistant needs to adapt'),
    successful_patterns: z.array(z.string()).max(10).optional().describe('Conversation patterns that work well'),
  }).optional().describe('Conversational learning and adaptation tracking between user and assistant'),
  safety: z.object({
    blockedTopics: z.array(z.string()).max(50).optional().describe('Topics to avoid.'),
    piiSeen: z.boolean().optional().describe('Has PII appeared recently?'),
  }).optional().describe('Safety/guardrail notes.'),
})
  // cap entities count to ≤200 when present
  .superRefine((val, ctx) => {
    const ents = val.graph?.entities ? Object.keys(val.graph.entities) : [];
    if (ents.length > 200) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'entities must be ≤ 200',
        path: ['graph','entities'],
      });
    }
  });

export default schema;