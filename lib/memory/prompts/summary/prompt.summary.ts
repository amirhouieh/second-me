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

IMPORTANT:
- Did assiatant responded or ended the conversation with a follow-up question? If yes, then the conversation is not ended yet. you need to capture that.
- If assistant is answering a question, you need to capture that.
- If assistant is providing information, you need to capture that.
- If assistant is asking a question, you need to capture that.
- If assistant is ending the conversation, you need to capture that.
- If assistant is providing a list of options, you need to capture that.
- Is there any relation between now and previous messages? If yes, you need to capture that.
- Is there anything that shows user's requiring something from previous messages? If yes, you need to capture that.

INPUTS:
User query: "${q}"
Assistant response: "${assistant}"

CONTEXT:
${context ? `Context (optional):\n${context}` : ''}
${hints ? `====\nHints (optional):\n${hints}` : ''}
${payload ? `====\nPayload (optional - retrieved data, tools, etc.):\n${JSON.stringify(payload)}` : ''}`;
}