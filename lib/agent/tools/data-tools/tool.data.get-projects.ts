import { z } from "zod";
import { tool as _tool } from "ai";
import { unbody } from "@/lib/unbody/unbody.clients";
import { DataToolName } from './names';

export const inputSchema = z.object({
  concepts: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe("Extract 1–5 concise keywords/tech terms from the user's query; do not leave empty."),
  count: z.number().min(1).max(10).default(5),
});

export const outputSchema = z.array(
  z.object({
    title: z.string(),
    summary: z.string(),
    keywords: z.array(z.string()),
    content: z.string(),
    id: z.string(),
    slug: z.string(),
    images: z.array(z.object({ url: z.string(), width: z.number(), height: z.number(), autoCaption: z.string(), autoOCR: z.string(), alt: z.string() })),
  })
);

export type TInput = z.infer<typeof inputSchema>;
export type TOutput = z.infer<typeof outputSchema>;

export const def = {
  name: DataToolName.GetProjects,
  description:
    "Get portfolio projects. Always populate 'concepts' (1–5 keywords/technologies) derived from the user's query.",
  label: 'Getting relevant projects…',
  doneLabel: 'Projects retrieved',
  inputSchema,
  outputSchema,
};

export const tool = _tool<TInput, TOutput>({
  description: def.description,
  inputSchema: def.inputSchema,
  async execute({ concepts, count }) {

    const qb = unbody.get.googleDoc.select(
      "title",
      "autoSummary",
      "autoKeywords",
      "text",
      "remoteId",
      "slug",
      "blocks.ImageBlock.url",
      "blocks.ImageBlock.width",
      "blocks.ImageBlock.height",
      "blocks.ImageBlock.autoCaption",
      "blocks.ImageBlock.autoOCR",
      "blocks.ImageBlock.alt",
    );

    console.log(qb.search.about(concepts.join(" ")).limit(count).getGraphQuery());

    const { data: { payload } } = await qb.search.about(concepts.join(" ")).limit(count).exec();

    console.log(payload[0].blocks);

    const items = payload.map((doc: any) => ({
      title: String(doc.title || "Untitled Project"),
      summary: String(doc.autoSummary || ""),
      keywords: Array.isArray(doc.autoKeywords) ? doc.autoKeywords : [],
      content: String(doc.text || ""),
      id: String(doc.remoteId || ""),
      slug: String(doc.slug || ""),
      images: (doc.blocks as any) || [],
    }));
    
    return def.outputSchema.parse(items);
  },
});


