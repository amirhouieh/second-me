import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-wasm';
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm';
import '@tensorflow/tfjs-backend-cpu';
import * as use from '@tensorflow-models/universal-sentence-encoder';

let model: use.UniversalSentenceEncoder | null = null;

async function ensure() {
  if (!model) {
    try {
      // Serve WASM assets locally from /public/tfjs/*
      // Ensure these files exist in public/tfjs/:
      //  - tfjs-backend-wasm.wasm
      //  - tfjs-backend-wasm-simd.wasm
      //  - tfjs-backend-wasm-threaded-simd.wasm
      setWasmPaths('/tfjs/');
      await tf.setBackend('wasm');
      await tf.ready();
    } catch {
      await tf.setBackend('cpu');
      await tf.ready();
    }
    model = await use.load();
    // announce readiness
    (postMessage as any)({ type: 'ready' });
  }
}

onmessage = async (e: MessageEvent) => {
  const { id, text } = e.data as { id: number; text: string };
  await ensure();
  const emb = await model!.embed([text]);
  const v = (await emb.array()) as number[][];
  const vec = v[0] ?? [];
  const norm = Math.hypot(...vec);
  const out = vec.map(x => x / (norm || 1));
  (emb as any).dispose?.();
  (postMessage as any)({ id, vec: out });
};


