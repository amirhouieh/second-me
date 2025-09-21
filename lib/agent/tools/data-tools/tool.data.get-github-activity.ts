import { z } from "zod";
import { tool as _tool } from "ai";
import { DataToolName } from './names';

export const getGithubActivityInputSchema = z.object({
  timeframe: z.enum(["week", "month", "year"]).default("month"),
});
export type GetGithubActivityInput = z.infer<typeof getGithubActivityInputSchema>;

export const getGithubActivityOutputSchema = z.object({
  timeframe: z.string(),
  contributions: z.number(),
  streak: z.number(),
  topLanguages: z.array(z.string()),
  recentRepos: z.array(z.object({ name: z.string(), stars: z.number() })),
});
export type GetGithubActivityOutput = z.infer<typeof getGithubActivityOutputSchema>;

export const def = {
  name: DataToolName.GetGithubActivity,
  description: "Get GitHub activity ONLY when user asks about GitHub/contributions/repos",
  label: "Fetching latest GitHub activity…",
  doneLabel: "GitHub activity ready",
  inputSchema: getGithubActivityInputSchema,
  outputSchema: getGithubActivityOutputSchema,
};

export const tool = _tool<GetGithubActivityInput, GetGithubActivityOutput>({
  description: def.description,
  inputSchema: def.inputSchema,
  async execute({ timeframe }) {
    const out = {
      timeframe,
      contributions: 142,
      streak: 12,
      topLanguages: ["TypeScript", "Python", "JavaScript"],
      recentRepos: [
        { name: "vision-utils", stars: 42 },
        { name: "next-ai-portfolio", stars: 27 },
      ],
    };
    return def.outputSchema.parse(out);
  },
});


