import { MemoryEngine } from './engine';
import { createTfjsUseEmbedder } from './embedders/tfuse/createTfjsUseEmbedder';
import { zodToJsonSchema } from 'zod-to-json-schema';

const engineRef: { current: MemoryEngine | null } = { current: null };

export async function initMemoryEngine(): Promise<MemoryEngine> {
  if (engineRef.current) return engineRef.current;
  const embedder = await createTfjsUseEmbedder();
  // Function callers (you can swap to your own routes/SDKs)
  const llmJson = async <T>(prompt: string, zodSchema: any): Promise<T> => {
    const schema = zodToJsonSchema(zodSchema);
    const res = await fetch('/api/llm/json', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt, schema }) });
    if (!res.ok) {
      const msg = await res.text();
      throw new Error(`llmJson failed: ${msg || res.status}`);
    }
    return await res.json();
  };

  const engine = await MemoryEngine.create({
    embed: embedder.embed,
    llmJson,
    recentN: 5,
    recallK: 3,
    autoAdjustLearnings: true,
  });
  engineRef.current = engine;
  return engine;
}


