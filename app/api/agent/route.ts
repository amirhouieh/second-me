import { NextRequest } from "next/server";
import { streamText, stepCountIs, createUIMessageStream, createUIMessageStreamResponse, tool } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

import { 
  retrievalTools, 
  retrievalToolsMap,
} from "@/lib/agent/tools";

import { AgentStreamEventType, ToolCallStatus } from "@/lib/agent/stream-events";
import { promptSystemDataRetrieve } from "@/lib/agent/prompt.system.data-retrive";
import { z } from "zod";

const oai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const model = oai("gpt-4o");

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { messages, payload: { 
    snapshots,
    memoryContext
  }} = await req.json();

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      writer.write({ type: AgentStreamEventType.Start, messageId: crypto.randomUUID?.() || 'msg' });
      const retrievalContext: Record<string, unknown> = {};
      const s = streamText({
        model,
        messages: ([
          promptSystemDataRetrieve(memoryContext),
          ...messages,
        ] as any),
        tools: {
          getMemoryContext: tool({
            description: "Get current memory context including user profile and relationship data. Use when you need to understand user context for better responses.",
            inputSchema: z.object({}).describe("No input required"),
            async execute() {
              return memoryContext;
            },
          }),
          getHistoricConversations: tool({
            description: "Return historic snapshots (client memory). Use for quoting/export.",
            inputSchema: z
              .object({
                id: z.string().optional(),
                from: z.number().int().min(0).optional(),
                to: z.number().int().min(0).optional(),
                limit: z.number().int().min(1).max(100).optional(),
                offset: z.number().int().min(0).optional(),
              })
              .refine(
                (v) =>
                  !!v.id ||
                  (typeof v.from === "number" && typeof v.to === "number") ||
                  typeof v.limit === "number",
                { message: "Provide id OR (from,to) OR (limit[,offset])." }
              ),
            async execute({ id, from, to, limit, offset }) {
              if (id) return snapshots.find((s: any) => s.id === id) ?? null;

              if (typeof from === "number" && typeof to === "number") {
                const a = Math.max(0, Math.min(from, snapshots.length));
                const b = Math.max(0, Math.min(to + 1, snapshots.length)); // inclusive 'to'
                return snapshots.slice(a, b);
              }

              const off = typeof offset === "number" ? offset : 0;
              const lim = typeof limit === "number" ? limit : 20;
              return snapshots.slice(off, off + lim);
            },
          }),
          ...retrievalToolsMap
        },
        stopWhen: stepCountIs(20),
        onChunk: ({ chunk }) => {
          switch (chunk.type) {
            case 'tool-call': {
              const def = retrievalTools.find(tool => tool.def.name === chunk.toolName)?.def;
              const label = def?.label || chunk.toolName;
              console.log("is being called:", chunk.toolName);
              writer.write({
                type: AgentStreamEventType.DataToolStatus,
                id: chunk.toolCallId,
                data: { name: chunk.toolName, status: ToolCallStatus.Called, label } as any,
              });
              break;
            }
            case 'tool-result': {
              const def = retrievalTools.find(tool => tool.def.name === chunk.toolName)?.def;
              const label = def?.doneLabel || def?.label || chunk.toolName;
              console.log("is completed:", chunk.toolName);
              writer.write({
                type: AgentStreamEventType.DataToolStatus,
                id: chunk.toolCallId,
                data: { name: chunk.toolName, status: ToolCallStatus.Completed, label } as any,
              });
              writer.write({
                type: AgentStreamEventType.DataToolResult,
                id: chunk.toolCallId,
                data: { name: chunk.toolName, result: (chunk as any).output },
              });
              (retrievalContext as any)[chunk.toolName] = (chunk as any).output;
              break;
            }
            default:
              break;
          }
        },
        onAbort: () => {
          writer.write({ type: AgentStreamEventType.Abort });
        },
        onError: (e) => {
          writer.write({ type: AgentStreamEventType.Error, errorText: e.error instanceof Error ? e.error.message : String(e.error) });
        },
        onFinish: (e) => {
          writer.write({ type: AgentStreamEventType.Finish });
        },
      });
      writer.merge(s.toUIMessageStream());
    },
  });

  return createUIMessageStreamResponse({ stream });
}




