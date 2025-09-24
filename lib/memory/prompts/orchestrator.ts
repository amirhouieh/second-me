import { z } from 'zod';

export const schema = z.object({
  action: z.enum(['START_TASK', 'CONTINUE_TASK', 'END_TASK', 'NO_TASK']),
  taskType: z.string().optional(),
  state: z.record(z.any()).optional(),
});

export type TMemPromptOrchestratorJSON = z.infer<typeof schema>;

export const memPromptOrchestrator = {
  schema,
  prompt: (vars: { userQuery: string; recentHistory: string; activeTask: any | null; }) => `
You are a Task Orchestrator agent within a memory system. Your job is to analyze the user's latest query and decide if it's part of a complex, multi-step task.

CURRENT TIME: ${new Date().toISOString()}

=== ACTIVE TASK (The "Whiteboard") ===
${vars.activeTask ? JSON.stringify(vars.activeTask, null, 2) : "No active task."}

=== RECENT CONVERSATION HISTORY ===
${vars.recentHistory}

=== LATEST USER QUERY ===
"${vars.userQuery}"

=== YOUR TASK ===
Based on the user's query, the conversation history, and any active task, decide the correct action.
- If the query starts a new complex task (e.g., planning something, writing a multi-part document), choose START_TASK.
- If a task is active and the query is a clear continuation of it, choose CONTINUE_TASK and UPDATE the state object.
- If a task is active and the query clearly ends it (e.g., "that's perfect, thanks!"), choose END_TASK.
- If the query is a simple question, a greeting, or unrelated to the active task, choose NO_TASK.

Return ONLY the JSON object with your decision.
`,
};


