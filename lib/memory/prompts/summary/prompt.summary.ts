// snapshotSummary.prompt.ts
export default function (vars: {
  q: string;
  assistant: string;
  hints?: string;
  context?: string;
  payload?: Object;
}) {
  const { q, hints, assistant, payload, context } = vars;
  return `You are the Snapshot Summarizer in a memory layer.

TASK
Produce a single-line, mini-report of the latest exchange (not a paraphrase) between the user and the LLM assistant. Capture what user asked, the intent/topic, what the assistant did, and the concrete outcome.

INPUTS:
User query: "${q}"
Assistant response: "${assistant}"

CONTEXT:
${context ? `Context (optional):\n${context}` : ''}
${hints ? `====\nHints (optional):\n${hints}` : ''}
${payload ? `====\nPayload (optional - retrieved data, tools, etc.):\n${JSON.stringify(payload)}` : ''}`;
}