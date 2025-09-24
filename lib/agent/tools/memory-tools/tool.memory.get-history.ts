import { z } from "zod";
import { tool as createTool } from "ai";
import { MemoryContext } from "@/lib/memory/types";


export const inputSchema = z.object({
  id: z.string().optional(),
  from: z.number().int().min(0).optional(),
  to: z.number().int().min(0).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

export const outputSchema = z.array(z.object({
  id: z.string(),
  t: z.number(),
  q: z.string(),
  assistant: z.string(),
  payload: z.object({}),
  summary: z.string(),
  vec: z.array(z.number()),
  tokens: z.object({ in: z.number(), out: z.number() }).optional(),
}));


export const def = {
  name: "getHistoricConversations",
  description: "Return historic conversation turns (from memory). Use for anytime you need to get the history of the conversation.",
  inputSchema: inputSchema,
  outputSchema: outputSchema,
  label: "Reading the history...",
  doneLabel: "History retrieved",
};

export const tool = (memoryContext: MemoryContext) => createTool({
    description: def.description,
    inputSchema: def.inputSchema,
    outputSchema: def.outputSchema,
    async execute({ id, from, to, limit, offset }) {
      if (id) return memoryContext.recall?.find((s: any) => s.id === id) ?? null;

      if (typeof from === "number" && typeof to === "number") {
        const a = Math.max(0, Math.min(from, memoryContext.recall?.length ?? 0));
        const b = Math.max(0, Math.min(to + 1, memoryContext.recall?.length ?? 0)); // inclusive 'to'
        return memoryContext.recall?.slice(a, b) ?? [];
      }

      const off = typeof offset === "number" ? offset : 0;
      const lim = typeof limit === "number" ? limit : 20;
      return memoryContext.recall?.slice(off, off + lim) ?? [];
    },
  });      

