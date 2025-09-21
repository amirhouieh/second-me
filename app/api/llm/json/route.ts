import { NextRequest, NextResponse } from 'next/server';
import { generateObject, jsonSchema } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

const oai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: NextRequest) {
  const { prompt, schema } = await req.json();
  const zSchema = jsonSchema(schema);
  try {
    const { object } = await generateObject({
      model: oai('gpt-4o-mini'),
      schema: zSchema,
      prompt: prompt,
    });
    return NextResponse.json(object);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    console.error('API Error:', errorMessage);
    return NextResponse.json({
        error: 'Failed to generate JSON.',
        details: errorMessage
    });
  }


}


