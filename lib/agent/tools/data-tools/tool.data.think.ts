import { z } from "zod";
import { tool as createTool } from "ai";
import { DataToolName } from "./names";


export const inputSchema = z.object({
  goal: z.string().describe("The user's true underlying goal."),
  gaps: z.string().describe("What information is missing to fulfill this goal."),
  plan: z.string().describe("The strategic plan of which tools to call to fill the gaps."),
});

export const outputSchema = z.object({
  result: z.string().describe("The result of the tool call."),
});

export const def = {
  name: DataToolName.Think,
  description: "Internal tool for the AI to reason and form a plan. This is the agent's scratchpad.",
  inputSchema: inputSchema,
  label: "Planing next steps...",
  doneLabel: "Planing completed",
  outputSchema: outputSchema,
};

export const tool = createTool({
    description: def.description,
    inputSchema: def.inputSchema,
    outputSchema: def.outputSchema,
    async execute() {
      // This tool is a no-op. Its purpose is to force the LLM to structure its thinking.
      return {
        result: "Planing completed.",
      };
    },
  });