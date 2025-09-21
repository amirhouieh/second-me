import { z } from "zod";

export function shrinkJSON(value: any, maxChars = 600): string {
  try {
    const str = JSON.stringify(value, (_, v) =>
      typeof v === 'string' && v.length > 200 ? v.slice(0, 200) + '…' : v
    );
    return str.length <= maxChars ? str : str.slice(0, maxChars) + '…';
  } catch {
    const s = String(value ?? '');
    return s.length <= maxChars ? s : s.slice(0, maxChars) + '…';
  }
}

export function compactRecent(
  recent: { t: number; q: string; assistant: string; summary: string }[],
  limit = 3
): string {
  return recent
    .slice(-limit)
    .reverse()
    .map(s => `- [${new Date(s.t).toISOString()}]\n  Q: ${s.q}\n  A: ${s.assistant.slice(0,180)}\n  S: ${s.summary}`)
    .join('\n');
}

const dot = (a:number[], b:number[]) => a.reduce((s,v,i)=>s + v*b[i], 0);
export function cosineTopK(queryVec: number[], snaps: { vec?: number[] }[], k: number) {
  const docs = snaps.filter((s): s is { vec: number[] } => Array.isArray(s.vec) && s.vec.length === queryVec.length);
  return docs
    .map((s, idx) => ({ idx, score: dot(queryVec, s.vec!) }))
    .sort((a,b)=> b.score - a.score)
    .slice(0, k)
    .map(x => snaps[x.idx]);
}
