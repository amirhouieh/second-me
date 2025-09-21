import type { Learnings } from '../../types';

export default function (vars: {
  current: Learnings.Facets
  recent: string;
}) {
  const { current, recent } = vars;
  return `You are the FACETS Updater in a conversational memory layer.

TASK - CONTEXTUAL INTELLIGENCE EXTRACTION
Analyze the recent dialog to extract rich contextual information that enables highly personalized conversations. Focus on RELATIONSHIPS, CONNECTIONS, and CONVERSATIONAL CONTEXT.

CRITICAL AREAS TO CAPTURE:
1. **Relationships & Connections**: Professional, personal, educational relationships
2. **Contextual Entities**: Projects, organizations, places, concepts mentioned
3. **Shared Experiences**: Collaborations, shared projects, common contexts
4. **Temporal Context**: When things happened, sequence of events
5. **Project Context**: Work done together, shared interests
6. **Conversation Evolution**: How the conversation between user and assistant is progressing

CONVERSATION EVOLUTION ANALYSIS:
- **conversation_evolution.satisfaction_level**: Assess how satisfied user seems with the conversation flow
- **conversation_evolution.adaptation_needs**: What needs to change in the conversation dynamic
- **conversation_evolution.successful_patterns**: What conversation approaches are working well

JSON SCHEMA REQUIREMENTS:
- Entity IDs are KEYS in entities object (e.g., "user", "amir", "kabk")
- Entity values must have "name" (required) and "type" (required) fields
- Do NOT include "id" field in entity values
- Relations array contains objects with "a", "r", "b", and optional "note" fields

SCOPE
- FACETS is NOT a user profile; it is shared context (entities, relations, tasks, style, safety, timeline).
- **PRIORITY**: Capture relationships and connections mentioned in dialog
- Avoid hallucinations. Only include items clearly supported by the dialog.
- Entities must use STABLE, LOWERCASE, HYPHENATED ids as object keys; values store canonical names, aliases, and light metadata under key "meta" ONLY (never "metadata").
- Each entity MUST include "type" with one of: "person","project","org","term","other".
- **CRITICAL**: When the dialog states or implies a relationship, encode it as a graph edge under relations, not in entity.metadata.
- Use canonical ids for people: use 'user' for the asker and 'amir' for Amir.
- Relation item shape (schema-aligned): { a: 'user', r: 'classmate_of', b: 'amir', note?: string } (timestamp will be added by the system)
- Keep outputs concise.

RELATIONSHIP EXAMPLES TO CAPTURE:
- "I was Amir's classmate in 2015" → { a: 'user', r: 'classmate_of', b: 'amir', note: 'in 2015' }
- "I worked with Amir at X" → { a: 'user', r: 'worked_with', b: 'amir', note: 'at X' }
- "I studied at Y" → { a: 'user', r: 'studied_at', b: 'y-university', note: 'year if mentioned' }

CORRECT JSON STRUCTURE EXAMPLE:
{
  "graph": {
    "entities": {
      "user": {
        "name": "Sara",
        "type": "person"
      },
      "amir": {
        "name": "Amir",
        "type": "person"
      },
      "kabk": {
        "name": "Royal Academy of Art, The Hague",
        "aliases": ["KABK"],
        "type": "org"
      }
    },
    "relations": [
      { "a": "user", "r": "classmate_of", "b": "amir", "note": "in 2015" }
    ]
  },
  "conversation_evolution": {
    "satisfaction_level": "medium",
    "adaptation_needs": ["more personalization", "better tone"],
    "successful_patterns": ["using shared context", "adapting to user's preferences"]
  },
  "safety": {
    "blockedTopics": ["politics", "religion"],
    "piiSeen": false
  }
}

IMPORTANT: 
- Entity IDs are the KEYS in the entities object
- Each entity value must have "name" and "type" fields
- Do NOT include "id" field in entity values
- WRONG: {"user": {"id": "user", "name": "Sara"}}
- CORRECT: {"user": {"name": "Sara", "type": "person"}}

CURRENT FACETS JSON:
${JSON.stringify(current ?? {}, null, 2)}

RECENT DIALOG (role‑tagged, most recent first):
${recent}

OUTPUT
Return ONLY the FACETS JSON object (same shape as CURRENT, with entities/relations updated if needed).

FINAL REMINDER: Ensure your JSON matches the schema exactly:
- entities: object with entity IDs as keys
- entity values: {"name": string, "type": enum, "aliases"?: array, "meta"?: object}
- relations: array of {"a": string, "r": string, "b": string, "note"?: string}
- NO "id" fields in entity values!`;
}