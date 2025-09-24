import { NextRequest } from "next/server";
import { streamText, stepCountIs, createUIMessageStream, createUIMessageStreamResponse, tool } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

import {
  retrievalTools,
  retrievalToolsMap,
  memoryToolsMap,
} from "@/lib/agent/tools";

import { AgentStreamEventType, ToolCallStatus } from "@/lib/agent/stream-events";
import { promptSystemDataRetrieve } from "@/lib/agent/prompt.system.data-retrive";
import z from "zod";

const oai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const model = oai("gpt-4o");

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { messages, payload: {
    snapshots,
    memoryContext,
    previousTools,
  } } = await req.json();

const stream = createUIMessageStream({
  execute: async ({ writer }) => {
    writer.write({ type: AgentStreamEventType.Start, messageId: crypto.randomUUID?.() || 'msg' });
    const retrievalContext: Record<string, unknown> = {};
    const s = streamText({
      model,
      messages: ([
        promptSystemDataRetrieve(memoryContext, previousTools),
        ...messages,
      ] as any),
      tools: {
        ...retrievalToolsMap,
        ...memoryToolsMap(memoryContext),
      },
      stopWhen: stepCountIs(20),
      onChunk: ({ chunk }) => {
        switch (chunk.type) {
          case 'tool-call': {
            if (chunk.toolName === 'thought') {
              console.log("🤖 AI is thinking:");
              return; // Do not send a UI event for the thought process
            }
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




