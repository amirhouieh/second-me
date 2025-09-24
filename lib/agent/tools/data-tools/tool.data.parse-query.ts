import { z } from "zod";
import { tool as createTool } from "ai";
import { DataToolName } from "./names";

// Define the schema once. This now serves as both input and output.
export const parseQuerySchema = z.object({
  intent: z.enum([
    "greeting",
    "chitchat",
    "clarification_needed",
    "data_request",
    "task_request",
  ]).describe("The user's intent"),

  concepts: z.array(z.string()).default(["A list of keywords/tech terms from the user's query to be used for searching for relevant data and history."]),
  entities: z.array(z.string()).default(["A list of entities from the user's query to be used for searching for relevant data and history."]),

  years: z.array(z.number()).default([]),
  confidence: z.number().min(0).max(1),
});

export type TParseQuery = z.infer<typeof parseQuerySchema>;

export const def = {
  name: DataToolName.ParseQuery,
  description:
    "REQUIRED FIRST STEP. Analyzes the user's raw query to determine the core intent and extract key information. The model must provide all fields in this schema when calling the tool.",
  label: "Understanding your query…",
  doneLabel: "Query understood",
  inputSchema: parseQuerySchema,
  outputSchema: parseQuerySchema,
};

export const tool = createTool<TParseQuery, TParseQuery>({
  description: def.description,
  inputSchema: def.inputSchema,
  outputSchema: def.outputSchema,
  async execute(input): Promise<TParseQuery> {
    // Simply validate the provided input and return it as the result.
    const parsed = parseQuerySchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(`Invalid parseQuery input: ${parsed.error.message}`);
    }
    return parsed.data;
  },
});
