// file: app/api/agent/respond/route.ts

import { NextRequest } from "next/server";
import { convertToModelMessages, streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

import type { MemoryContext } from "@/lib/memory/types";
import { promptSystemResponseAgent } from "@/lib/agent/prompt.system.response-agent";
import { PreviousTool } from "@/lib/agent/types";

const oai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const model = oai("gpt-4o");

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const {
    messages,
    data: {
      memoryContext,
      toolResults,
      previousTools,
    },
  }: {
    messages: any[];
    data: {
      memoryContext: MemoryContext;
      toolResults: Record<string, unknown>;
      previousTools: PreviousTool[];
    }
  } = await req.json();

  const systemPrompt = promptSystemResponseAgent(memoryContext, toolResults, previousTools);
  
  const result = await streamText({
    model,
    system: systemPrompt.content,
    messages: messages,
  });

  return result.toUIMessageStreamResponse();
}