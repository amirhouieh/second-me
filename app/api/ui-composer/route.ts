import { NextRequest } from "next/server";
import { streamText, stepCountIs,createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { atomicUITools } from "@/lib/agent/tools/ui-atomic-simple";
import { AgentStreamEventType, ToolCallStatus } from "@/lib/agent/stream-events";
import { systemPromptUIComposer } from "@/lib/agent/prompt.system-ui-generator";
import { PreviousTool } from "@/lib/agent/types";
import { previousDataTools } from "@/lib/agent/prompt.shared";
import { liveContextPrompt } from "@/lib/agent/prompt.shared";

const oai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const model = oai("gpt-4o");

export const runtime = "nodejs";

export async function POST(req: NextRequest) {  
  const { messages, payload: {
    dataToolResults,
    memoryContext,
    previousTools,
    assistantResponse
  } } = await req.json();


  const systemPrompt = systemPromptUIComposer();
  const userPrompt = (`
    Original User Query: "${messages[0].content}"
    assistantResponse: "${assistantResponse}" 
    Data Payload: ${JSON.stringify(dataToolResults, null, 2)}
    ${previousDataTools(previousTools)}
    ${liveContextPrompt(memoryContext, previousTools)}
  `)

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      writer.write({ type: AgentStreamEventType.Start, messageId: crypto.randomUUID?.() || 'ui-msg' });

      const s = streamText({
        model,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: userPrompt
          },
          // {
          //   role: "user",
          //   content: `<required style>minimalistic</required style>`
          // }
        ],
        tools: atomicUITools,
        stopWhen: stepCountIs(20),
        onChunk: ({ chunk }) => {
          switch (chunk.type) {
            case 'tool-call': {
              writer.write({
                type: AgentStreamEventType.DataToolStatus,
                id: chunk.toolCallId,
                data: { name: chunk.toolName, status: ToolCallStatus.Called, label: chunk.toolName } as any,
              });
              break;
            }
            case 'tool-result': {
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
              break;
            }
            default:
              break;
          }
        },
        onFinish: (e) => {
          console.log(`🏁 UI Route Complete: ${e.toolCalls?.length || 0} tools, ${e.toolResults?.length || 0} results`);
          
          if (e.toolCalls && e.toolCalls.length > 0) {
            e.toolCalls.forEach((toolCall: any) => {
              if (toolCall.error) {
                console.error(`❌ Tool ${toolCall.toolName} failed:`, toolCall.error);
              }
            });
          }
          
          writer.write({ type: AgentStreamEventType.TextStart, id: 'ui-text-start' });
          writer.write({ type: AgentStreamEventType.Finish });
        },
      });

      writer.merge(s.toUIMessageStream());
    },
  });

  return createUIMessageStreamResponse({ stream });
}