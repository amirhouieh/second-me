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

const oai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const model = oai("gpt-4o");

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const messages = body?.messages;
  const payload = body?.payload ?? body?.data ?? {};
  const memoryContext = payload?.memoryContext as MemoryContext | undefined;
  const toolResults = (payload?.toolResults ?? {}) as Record<string, unknown>;
  const previousTools = (payload?.previousTools ?? []) as PreviousTool[];
  const query = (payload?.query ?? "") as string;

  // Safe fallback for missing memory context to avoid runtime errors in prompts
  const memoryContextSafe: MemoryContext = (memoryContext as any) ?? ({
    learnings: {
      ingestableUser: "",
      ingestableFacets: "",
    },
    recentSummary: [],
    recallSummary: [],
    recent: [],
    recall: [],
    activeTask: null,
  } as any);

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      writer.write({ type: AgentStreamEventType.Start, messageId: crypto.randomUUID?.() || "combined-msg" });

      const assistantInputSchema = z.object({
        query: z.string().optional(),
      });

      const assistantTool = createTool({
        description: "Generate and stream the assistant's preamble text for the user.",
        inputSchema: assistantInputSchema,
        async execute(input: { query?: string } = {}) {
          const preambleAccumulator: { text: string } = { text: "" };
          const resp = streamText({
            model,
            // system: promptSystemResponseAgent(memoryContextSafe as MemoryContext, (toolResults || {}) as Record<string, unknown>, previousTools || []).content,
            system: `Your a bot that just tells one line jokes and ends with an emoji! nothing else.`,
            messages:
              messages && messages.length > 0
                ? messages
                : [{ role: "user", content: input.query || query || "" }],
            onFinish: () => {
                writer.write({ type: AgentStreamEventType.Custom, data: { message: "respond-text-finished" } });
            }
          });
          writer.merge(resp.toUIMessageStream());
          return {
            type: "respond.result",
            ok: true,
          } as const;
        },
      });

      const uiInputSchema = z.object({
        preamble: z.string().optional(),
        query: z.string().optional(),
        data: z.unknown().optional(),
      });

      const uiTool = createTool({
        description:
          "Compose and stream UI (skeleton first, then components keyed by skeletonId).",
        inputSchema: uiInputSchema,
        async execute(input: { preamble?: string; query?: string; data?: unknown } = {}) {
          const skeletonToolName = "layoutSkeleton";
          const allToolNames = Object.keys(atomicUITools);
          const contentToolNames = allToolNames.filter((n) => n !== skeletonToolName);

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
              {
                role: "user",
                content:
                  `Assistant's Preamble: "${(input.preamble || "").replaceAll('"', '\\"')}"\n` +
                  `Original User Query: "${(input.query || query || "").replaceAll('"', '\\"')}"\n` +
                  `Data Payload: ${JSON.stringify(input.data ?? toolResults ?? {}, null, 2)}`,
              },
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
                  type: AgentStreamEventType.DataToolResult,
                  id: chunk.toolCallId,
                  data: { name: chunk.toolName, result: (chunk as any).output },
                });
              }
            },
            onFinish: () => {
              writer.write({ type: AgentStreamEventType.TextStart, id: "ui-text-start" });
              console.log(`ui onFinish: ${JSON.stringify(omit(ui, ["id", "toolCallId", "providerMetadata"]))}`);
            },
          });

          writer.merge(ui.toUIMessageStream());
          await ui;
          return { type: "ui.result", ok: true } as const;
        },
      });

      const orchestrator = streamText({
        model,
        messages: [
          {
            role: "system",
            content: `
You are an orchestrator. You MUST do at least one of the following for every query:
- Call "assistant" to generate a short preamble for the user (streamed).
- Call "ui" to render UI (skeleton first, then content; streamed).
Often do BOTH. If both, call "assistant" first and then "ui", passing the preamble as input.

Rules:
- Usually the "assistant" should be called most of the time to make this feel more natural and human like. 
- If only UI is needed, skip text and call "ui" directly.
- If only text is needed, call "assistant" only.
- Do not output normal assistant text yourself. Communicate via tool calls.
            `.trim(),
          },
          ...(messages && messages.length > 0 ? ([] as any[]).concat(messages) : [{ role: "user", content: query || "" }]),
        ],
        tools: {
          assistant: assistantTool,
          ui: uiTool,
        },
        stopWhen: stepCountIs(25),
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
              type: AgentStreamEventType.DataToolResult,
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
            // writer.write({ type: AgentStreamEventType.Finish })
        },
      });

    console.log(`orchestrator onFinish: ${JSON.stringify(omit(orchestrator, ["id", "toolCallId", "providerMetadata"]))}`);
    writer.merge(orchestrator.toUIMessageStream());
    writer.write({ type: AgentStreamEventType.Finish });
    },
  });

  return createUIMessageStreamResponse({ stream });
}


