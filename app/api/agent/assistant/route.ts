import { NextRequest } from "next/server";
import { createOpenAI } from "@ai-sdk/openai";
import {
  streamText,
  stepCountIs,
  createUIMessageStream,
  createUIMessageStreamResponse,
  tool as createTool,
} from "ai";

import { AgentStreamEventType, ToolCallStatus } from "@/lib/agent/stream-events";
import { promptSystemResponseAgent } from "@/lib/agent/prompt.system.response-agent";
import { systemPromptUIComposer } from "@/lib/agent/prompt.system-ui-generator";
import { atomicUITools } from "@/lib/agent/tools/ui-atomic-simple";
import z from "zod";

import type { MemoryContext } from "@/lib/memory/types";
import type { PreviousTool } from "@/lib/agent/types";
import { omit } from "@/lib/utils";
import { liveContextPrompt } from "@/lib/agent/prompt.shared";

const oai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const model = oai("gpt-4o");

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const {
    messages,
    payload: {
      memoryContext,
      toolResults,
      previousTools,
    },
  }: {
    messages: any[];
    payload: {
      memoryContext: MemoryContext;
      toolResults: Record<string, unknown>;
      previousTools: PreviousTool[];
    }
  } = await req.json();

  let preamble = "";

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      writer.write({ type: AgentStreamEventType.Start, messageId: crypto.randomUUID?.() || "combined-msg" });

      const assistantInputSchema = z.object({
        query: z.string().optional(),
      });

      const textResponseTool = createTool({
        description: "Generate and stream the assistant's preamble text for the user.",
        inputSchema: assistantInputSchema,
        async execute(input: { query?: string } = {}) {
          const preambleAccumulator: { text: string } = { text: "" };
          const resp = streamText({
            model,
            system: promptSystemResponseAgent(
              memoryContext,
              toolResults,
              previousTools,
            ).content,
            messages,
            onChunk: ({ chunk }) => {
              if (chunk.type === "text-delta") {
                writer.write({ type: AgentStreamEventType.Custom, data: { message: "text-delta", delta: chunk.text } });
                if(chunk.text) {
                  preamble += chunk.text;
                }
              }
            },
            onFinish: () => {
              writer.write({ type: AgentStreamEventType.Custom, data: { message: "respond-text-finished" } });
            }
          });
          writer.merge(resp.toUIMessageStream());
          await resp;
          return {
            type: "respond.result",
            preamble,
            data: { preamble },
            ok: true,
          } as const;
        },
      });

      const uiInputSchema = z.object({
        preamble: z.string().optional(),
        query: z.string().optional(),
        data: z.unknown().optional(),
      });

      const uiResponseTool = createTool({
        description:
          "Compose and stream UI (skeleton first, then components keyed by skeletonId).",
        inputSchema: uiInputSchema,
        async execute(input: { preamble?: string; query?: string; data?: unknown } = {}) {
          const skeletonToolName = "layoutSkeleton";
          const allToolNames = Object.keys(atomicUITools);
          const contentToolNames = allToolNames.filter((n) => n !== skeletonToolName);

          console.log("input: ", input);
          const ui = streamText({
            model,
            messages: [
              {
                role: "system",
                content: systemPromptUIComposer({
                  skeletonToolName,
                  contentToolNames,
                  previousTools: previousTools || [],
                }),
              },
              ...messages,
              { role: "user", content: "<required style>minimalistic, typography based, monochrome</required style>" },
            ],
            tools: atomicUITools,
            stopWhen: stepCountIs(20),
            onChunk: ({ chunk }) => {
              if (chunk.type === "tool-call") {
                writer.write({
                  type: AgentStreamEventType.DataToolStatus,
                  id: chunk.toolCallId,
                  data: { name: chunk.toolName, status: ToolCallStatus.Called, label: chunk.toolName } as any,
                });
              } else if (chunk.type === "tool-result") {
                writer.write({
                  type: AgentStreamEventType.DataToolStatus,
                  id: chunk.toolCallId,
                  data: { name: chunk.toolName, status: ToolCallStatus.Completed, label: chunk.toolName } as any,
                });
                writer.write({
                  type: AgentStreamEventType.ToolResult,
                  id: chunk.toolCallId,
                  data: { name: chunk.toolName, result: (chunk as any).output },
                });
              }
            },
            onFinish: () => {
              writer.write({ type: AgentStreamEventType.TextStart, id: "ui-text-start" });
            },
          });

          writer.merge(ui.toUIMessageStream());
          await ui;
          return { type: "ui.result", ok: true } as const;
        },
      });


      const orchestratorSystemPrompt = `
  You are an orchestrator. You MUST do at least one of the following for every query:
  - Call "textResponse" to generate a short preamble for the user (streamed).
  - Call "uiResponse" to render UI (skeleton first, then content; streamed).
  - Often do BOTH. If both, call "textResponse" first and then "uiResponse", passing the preamble as input.
  
  **IMPORTANT**
  - YOU DO NOT NEED TO RESPOND TO THE USER'S QUERY. JUST CALL THE APPROPRIATE TOOLS.
  - YOU DO NOT NEED TO GENERATE ANY TEXT YOURSELF. JUST CALL THE APPROPRIATE TOOLS.
  
  <Logic>
  - Always look at the <LiveContext>, <RetrievedData>, <PreviousTools> and what the user has asked to decide what to call.
  - Think intelligently. Ask yourself, what is the best way to respond to the user's query? 
  - Should I respond using just text, or it makes sense to render some UI components? Or both?
  
  <Examples>
  <Example1>
  - User Query: "Who is Amir?"
  - Retrieved Data from "getBio" or "getResume"
  - Response: 'textResponse' & 'uiResponse'
  - Reason: The question is asking a general question about Amir, we have also got various data about him, so it makes sense to render some UI components  to show the user the data and accompanying text to add a human touch.
  </Example1>
  <Example2>
  - User Query: "Show me his projects"
  - Retrieved Data "getProjects"
  - Response: 'textResponse' & 'uiResponse'
  - Reason: This is a no brainer, we have the data, so we should render some UI components to show the user the data.
  </Example2>
  
  <Example3>
  - User Query: "I know amir from old days"
  - Retrieved Data "getBio" or "getResume"
  - Response: 'textResponse'
  - Reason: While we have the data, this is a chitchat and so it does not make sense to render any UI components, we should respond with a text response.
  </Example3>
  
  <Example4>
  - User Query: "What is Amir's favorite color?"
  - Response: 'textResponse'
  - Reason: This is a no brainer, we have the data, so we should render some UI components to show the user the data.
  </Example4>
  </Examples>
  </Logic>

  <ThingsToKeepInMind>
  - Sometimes we have the data, but we hsould know that the agent perior to you, which is responsible for retrieving the data, sometimes do retrive data for some stuff not to responde to the user's query, but mainly to update its memory and the learnings. 
  </ThingsToKeepInMind>
  
  ${liveContextPrompt(memoryContext, previousTools)}
  
  <RetrievedData>
    ${JSON.stringify(toolResults, null, 2)}
  </RetrievedData>
  
  <PreviousTools>
    ${JSON.stringify(previousTools, null, 2)}
  </PreviousTools>
  
  Rules:
  - Usually the "textResponse" should be called most of the time to make this feel more natural and human like. 
  - If only UI is needed, skip text and call "ui" directly.
  - If only text is needed, call "textResponse" only.
  - CRITICAL: **Do not output normal assistant text yourself. Communicate via tool calls.**
              `.trim();

      console.log(preamble);

      const orchestrator = streamText({
        model,
        messages: [
          {
            role: "system",
            content: orchestratorSystemPrompt,
          },
          ...messages,
        ],
        tools: {
          textResponse: textResponseTool,
          uiResponse: uiResponseTool,
        },
        stopWhen: stepCountIs(25),
        onChunk: ({ chunk }) => {
          if (chunk.type === "tool-call") {
            console.log("tool-call: ", chunk.toolName);
            writer.write({
              type: AgentStreamEventType.DataToolStatus,
              id: chunk.toolCallId,
              data: { name: chunk.toolName, status: ToolCallStatus.Called, label: chunk.toolName } as any,
            });
          } else if (chunk.type === "tool-result") {
            writer.write({
              type: AgentStreamEventType.DataToolStatus,
              id: chunk.toolCallId,
              data: { name: chunk.toolName, status: ToolCallStatus.Completed, label: chunk.toolName } as any,
            });
            writer.write({
              type: AgentStreamEventType.ToolResult,
              id: chunk.toolCallId,
              data: { name: chunk.toolName, result: (chunk as any).output },
            });
          }
        },
        onAbort: () => writer.write({ type: AgentStreamEventType.Abort }),
        onError: (e) =>
          writer.write({
            type: AgentStreamEventType.Error,
            errorText: (e as any)?.error instanceof Error ? (e as any).error.message : String((e as any)?.error),
          }),
        onFinish: () => {
          console.log("onFinish");
          writer.write({ type: AgentStreamEventType.Finish })
        },
      });

      writer.merge(orchestrator.toUIMessageStream());
    },
  });

  return createUIMessageStreamResponse({ stream });
}


