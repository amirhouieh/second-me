import { z } from "zod";
import { DataToolName } from "./names";
import { tool as createTool } from "ai";
import { assistantIdentityPrompt } from "../../prompt.shared";

const inputSchema = z.object({});

const outputSchema = z.string().describe("Eveything about the AI assistant");

export type TInput = z.infer<typeof inputSchema>;
export type TOutput = z.infer<typeof outputSchema>;

export const def = {
    name: DataToolName.WhoAmI,
    description: "Get everything about yourself (the AI assistant). When user asks who you are, or what you can do, or what topics you can talk about, you should call this tool.",
    inputSchema,
    outputSchema,
};

export const tool = createTool<TInput, TOutput>({
    description: def.description,
    inputSchema: def.inputSchema,
    outputSchema: def.outputSchema,
    async execute() {
        return assistantIdentityPrompt()
    },
}); 
