import { z } from "zod";
import { tool as createTool } from "ai";
import { MemoryContext } from "@/lib/memory/types";


export const def = {
  name: "getMemoryContext",
  description: "Get current memory context including historic and live snapshots, user learning and relationship data. Use when you need to understand user & conversation context for better responses.",
  inputSchema: z.object({}).describe("No input required"),
  label: "Getting memory context...",
  doneLabel: "Memory context retrieved",
};


export const tool = (memoryContext: MemoryContext) => createTool({
    description: def.description,
    inputSchema: def.inputSchema,
    async execute() {
      return memoryContext;
    },
  });