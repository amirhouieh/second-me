export async function createTfjsUseEmbedder(): Promise<{ embed: (t: string) => Promise<number[]> }> {
  const worker = new Worker(new URL('./tfuse-worker.ts', import.meta.url), { type: 'module' });
  let id = 0;
  const pending = new Map<number, (v: number[]) => void>();
  let ready = false;

  worker.onmessage = (e: MessageEvent) => {
    const data: any = e.data;
    if (data?.type === 'ready') {
      ready = true;
      return;
    }
    const { id, vec } = data as { id: number; vec: number[] };
    const resolve = pending.get(id);
    if (resolve) {
      resolve(vec);
      pending.delete(id);
    }
  };

  return {
    embed(text: string) {
      return new Promise<number[]>(resolve => {
        const rid = ++id;
        pending.set(rid, resolve);
        worker.postMessage({ id: rid, text });
      });
    },
  };
}


