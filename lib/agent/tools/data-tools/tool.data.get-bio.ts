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
      bio: `
I’m Amir, a founder and engineer focused on applied AI. My work centers on adaptive systems, the memory layer, and generative AI—areas I’ve explored since 2018. I believe software should feel more human (which is not the same as making software human).

Since 2018 i’ve mostly ignored the “what problem can ai solve?” question. i think it limits us. i’d rather start from first principles and ask how ai changes the way we build and interact with knowledge, software, and the physical world.

i graduated from art academy by building an open-source browser called re. after that i co-founded suslib (2018) — a small, mission-driven r&d studio exploring how ai could reshape knowledge interaction, smart cities, and public spaces. we built autonomous “libraries” that used computer vision and machine learning to recognize both content and human intention, partnering with places like the royal dutch library and dutch railways.

in 2024 i started unbody — an ai-native backend for developers who want ai as the foundation, not just a feature. we’ve grown to a community of 5,000+ developers and are running pilots from healthcare to saas.

outside of tech i cook a lot (mostly persian street food), build furniture, and keep myself busy with home renovations. i live in rotterdam with my wife. born and raised in iran, i’ve been in the netherlands since 2012. i like cars. i like sports too, but i’m terrible at staying consistent.

***

### Core Expertise & Areas of Focus
- Tool making (open source)
- AI-native architecture & strategy – building products where AI is the foundation, not an add-on
- Agentic systems & RAG – designing advanced retrieval-augmented generation workflows
- Developer GTM – taking complex AI tools to market and growing open-source communities
- Applied AI engineering – turning experimental ideas into scalable, production-ready systems
- Smart cities & IoT – designing and deploying advanced IoT systems
- State management for generative UIs – creating new UI patterns for AI-driven data flows

IF MORE DETAILS ARE NEEDED, CALL THE \`getResume\` and \`getProjects\` and/or \`getTalks\` tools.
      `,
      pictures: [{ url: "/profile.png", alt: "Amir's profile picture" }],
      socialLinks: [
        { name: "GitHub", url: "https://github.com/amir-houieh" },
        { name: "LinkedIn", url: "https://www.linkedin.com/in/amirhouieh" },
        { name: "Twitter", url: "https://twitter.com/amirhouieh" },
      ],
    };
    return def.outputSchema.parse(out);
  },
});