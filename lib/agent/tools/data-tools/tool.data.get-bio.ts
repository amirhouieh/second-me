import { z } from "zod";
import { tool as _tool } from "ai";
import { DataToolName } from './names';

export const inputSchema = z.object({});

export const outputSchema = z.object({
  bio: z.string().describe("Amir's biography"),
  pictures: z.array(z.object({ url: z.string(), alt: z.string() })).describe("Array of pictures of Amir"),
  socialLinks: z.array(z.object({ name: z.string(), url: z.string() })),
});

export type TInput = z.infer<typeof inputSchema>;
export type TOutput = z.infer<typeof outputSchema>;

export const def = {
  name: DataToolName.GetBio,
  description:
    "Get anything about Amir from his biography to background, his habits to appearance info. Use when users ask more personal or general questions about Amir.",
  label: "Getting Amir's bio…",
  doneLabel: "Bio ready",
  inputSchema,
  outputSchema,
};

export const tool = _tool<TInput, TOutput>({
  description: def.description,
  inputSchema: def.inputSchema,
  async execute(): Promise<TOutput> {
    const out = {
      bio: "Amir is a software engineer focused on AI, computer vision, and modern web.",
      pictures: [{ url: "/profile.png", alt: "Amir's profile picture" }],
      socialLinks: [
        { name: "GitHub", url: "https://github.com/amir-s" },
        { name: "LinkedIn", url: "https://www.linkedin.com/in/amir-s" },
        { name: "Twitter", url: "https://twitter.com/amir-s" },
      ],
    };
    return def.outputSchema.parse(out);
  },
});