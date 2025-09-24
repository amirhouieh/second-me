import { z } from "zod";
import { tool as _tool, generateObject } from "ai";
import { DataToolName } from './names';
import { cvSchema } from '../types.cv';
import { parseQuerySchema } from './tool.data.parse-query';

const inputSchema = z.object({
  parsedQuery: parseQuerySchema,
  query: z.string(),
  resumeSketch: cvSchema,
});

const outputSchema = z.object({
    highlightedExperiences: z.array(z.number())
        .optional()
        .describe('Indices of highlighted experiences related to the query'),
    highlightedEducations: z.array(z.number())
        .optional()
        .describe('Indices of highlighted educations related to the query'),
    collapsedByDefault: z.boolean().optional().describe('In case of any highlighted items, whether the rest of the resume should be collapsed by default'),
});

export type TInput = z.infer<typeof inputSchema>;
export type TOutput = z.infer<typeof outputSchema>;

export const def = {
    name: DataToolName.GetResumeMeta as any,
    description: "Only be called if the user query indicates that we probably should highlight some items in the resume. Infer resume view meta (highlighted indices, collapse) based on the query.",
    label: 'Selecting resume highlights…',
    doneLabel: 'Resume meta ready',
    inputSchema,
    outputSchema,
};

export const tool = _tool<TInput, TOutput>({
    description: def.description,
    inputSchema: def.inputSchema,
    async execute({ parsedQuery, query, resumeSketch }) {
        const { object } = await generateObject({
            model: 'openai/gpt-4.1',
            schema: outputSchema,
            messages: [
                {
                    role: 'system',
                    content: `You are part of an portfolio app, the followings is the resume of an owner of the website.
                a user has send a query and our tool calling has decided that we proably can highlight some items in the resume.
                your job is to look into the resume and run it against the auery and see if any of items from work experience or education or skills are related to the query.
                if you find any, return the index of the item in the resume.
                if you don't find any, return an empty array.
                if you are not sure, return an empty array.
                if you are not sure, return an empty array.

                here is the resume:
                ${JSON.stringify(resumeSketch)}
                `
                },
                {
                    role: 'user',
                    content: `user query:Query: ${query}
                `
                }
            ]
        });
        return object;
    },
});
