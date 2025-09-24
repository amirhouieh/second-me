import { TSnapshot, type LearningsState, MemoryContext, MemoryState, TaskContext } from './types';

import { memPromptSummary, type TMemPromptSummaryJSON } from './prompts/summary';
import { memPromptUserProfile, type TMemPromptUserProfileJSON } from './prompts/profile';
import { memPromptFacets, type TMemPromptFacetsJSON } from './prompts/facets';
import { memPromptOrchestrator, TMemPromptOrchestratorJSON } from './prompts/orchestrator';

import { cosineTopK } from './utils';

import type { ZodTypeAny } from 'zod';
import { omit } from '../utils';

export type EmbedFn = (text: string) => Promise<number[]>;  // L2-normalized
export type LlmJsonFn = <T = unknown>(prompt: string, schema: ZodTypeAny) => Promise<T>;

export type StoreFns = {
  load?: () => Promise<MemoryState>;
  save?: (state: MemoryState) => Promise<void>;
  appendSnapshot?: (snap: TSnapshot) => Promise<void>;
  updateLearnings?: (l: LearningsState) => Promise<void>;
  clear?: () => Promise<void>;
  onChange?: (state: MemoryState) => void | Promise<void>;
};

type EngineOpts = {
  embed: EmbedFn;
  llmJson: LlmJsonFn;
  store?: StoreFns;
  recentN?: number;
  recallK?: number;
  autoAdjustLearnings?: boolean;
  enableFacets?: boolean;
};

type PrepareInput = { q: string; hint?: string };

type CommitInput = {
  id: string;
  q: string;
  assistant: string;
  payload: Object;
  hints?: string
  tokens?: { in?: number; out?: number };
  custom?: any;
};

type LearningsDecision = {
  prev: LearningsState;
  next: LearningsState;
  changed: boolean;
  source: 'rewrite' | 'manual';
  prompt?: string;
  t: number;
};

const defaultUser = memPromptUserProfile.schema.parse({ profile: {}, assistant: {}, flags: {} });
const defaultFacets = memPromptFacets.schema.parse({});

const defaultState: MemoryState = {
  snapshots: [],
  learnings: {
    user: defaultUser,
    facets: defaultFacets,
    ingestableUser: memPromptUserProfile.ingestPrompt(defaultUser),
    ingestableFacets: memPromptFacets.ingestPrompt(defaultFacets)
  },
  activeTask: null,
};

export class MemoryEngine {
  private generate: LlmJsonFn

  static async create(opts: EngineOpts) {
    const e = new MemoryEngine(opts);
    await e.init();
    return e;
  }

  private constructor(private opts: EngineOpts) {
    this.generate = this.opts.llmJson;
  }

  private state: MemoryState = defaultState;
  private listeners = {
    snapshot: new Set<(s: TSnapshot) => void>(),
    learnings: new Set<(l: LearningsState, d?: LearningsDecision) => void>(),
  };

  private async init() {
    if (this.opts.store?.load) {
      const loaded = await this.opts.store.load();
      if (loaded) this.state = loaded;
    }
  }

  on(evt: 'snapshot', fn: (s: TSnapshot) => void): () => void;
  on(evt: 'learnings', fn: (l: LearningsState, d?: LearningsDecision) => void): () => void;
  on(evt: 'snapshot' | 'learnings', fn: any) {
    if (evt === 'snapshot') {
      this.listeners.snapshot.add(fn);
      return () => this.listeners.snapshot.delete(fn);
    }
    this.listeners.learnings.add(fn);
    return () => this.listeners.learnings.delete(fn);
  }

  private emitSnapshot(s: TSnapshot) {
    this.listeners.snapshot.forEach(fn => fn(s));
  }
  private emitLearnings(l: LearningsState, d?: LearningsDecision) {
    this.listeners.learnings.forEach(fn => fn(l, d));
  }
  private async persist() {
    await this.opts.store?.save?.(this.state);
    await this.opts.store?.onChange?.(this.state);
  }

  clearSnapshot(snapshot: TSnapshot): TSnapshot {
    const clone = { ...snapshot };  
    return omit(clone, ['vec', 'tokens']) as TSnapshot;
  }

  getSnapshots(clean = false): TSnapshot[] {
    if (clean) {
      return this.state.snapshots.map(this.clearSnapshot.bind(this)) as TSnapshot[];
    }
    return this.state.snapshots;
  }
  getLearnings() {
    return this.state.learnings;
  }
  recent(n = this.opts.recentN ?? 15): TSnapshot[] {
    return this.state.snapshots.slice(-n)
  }

  async recall(q: string, k = this.opts.recallK ?? 3) {
    const qv = await this.opts.embed(q);
    const withVec = this.state.snapshots.filter(s => Array.isArray((s as any).vec));
    const top = cosineTopK(qv, withVec, k) as TSnapshot[];
    return top;
  }

  async buildMemoryContext(q: string): Promise<MemoryContext> {
    const recent = this.recent().map(this.clearSnapshot.bind(this));
    const recall = await this.recall(q).then(s => s.map(this.clearSnapshot.bind(this)));

    return {
      learnings: this.state.learnings,
      recentSummary: recent.map(s => (
        `${new Date(s.t).toISOString()}:${s.summary}`
      )),
      recallSummary: recall.map(s => (
        `${new Date(s.t).toISOString()}:${s.summary}`
      )),
      recent: recent,
      recall: recall,
      activeTask: this.state.activeTask ?? null,
    };
  }
  
  private async updateLearningsAboutUser(input: CommitInput) {
    const current = this.state.learnings.user;
    const recent = this.recent().reverse();

    const uPrompt = memPromptUserProfile.prompt({
      current,
      recent: recent
        .map(s => `${new Date(s.t).toISOString()} - USER QUERY: ${s.q}`).join('\n')
    });

    const res = await this.generate<TMemPromptUserProfileJSON>(
      uPrompt,
      memPromptUserProfile.schema
    )
      .catch((error) => {
        console.error('[Memory] User profile generation failed:', error);
        return {
          profile: {
            explicit: current.profile?.explicit ?? '',
            implicit: current.profile?.implicit ?? '',
          },
          assistant: (current as any)?.assistant,
          flags: {
            explicitChanged: false,
            implicitChanged: false,
            assistantChanged: false,
          }
        } as TMemPromptUserProfileJSON;
      });


    const proposedExplicit = String(res?.profile?.explicit ?? '').trim();
    const proposedImplicit = String(res?.profile?.implicit ?? '').trim();

    const flags = res?.flags || {};

    const nextUser: any = {
      profile: {
        explicit: flags.explicitChanged === false ?
          current.profile?.explicit
          : proposedExplicit || current.profile?.explicit,

        implicit: flags.implicitChanged === false ?
          current.profile?.implicit
          : proposedImplicit,
      },
      assistant: {
        ...(current as any)?.assistant,
        ...(res as any)?.assistant,
      }
    };

    // Guard: if implicit largely overlaps explicit, keep previous implicit
    const a = (nextUser.profile?.explicit || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
    const b = (nextUser.profile?.implicit || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);

    const overlap = b.length ? b.filter((x: string) => a.includes(x)).length / b.length : 0;

    if (b.length < 3 || overlap >= 0.5)
      nextUser.profile.implicit = current.profile?.implicit;

    // Merge strategy for user.explicit: treat as newline-separated bullets; dedupe
    const mergeBullets = (prevStr: string, nextStr: string) => {
      const p = prevStr.split(/\n+/).map(s => s.trim()).filter(Boolean);
      const n = nextStr.split(/\n+/).map(s => s.trim()).filter(Boolean);
      const merged = Array.from(new Set([...p, ...n]));
      return merged.join('\n').slice(0, 1200);
    };

    return {
      profile: {
        explicit: mergeBullets(current.profile?.explicit, nextUser.profile?.explicit),
        implicit: nextUser.profile?.implicit,
      },
      assistant: nextUser.assistant,
    } as any;
  }

  async updateLearningsAboutFacets(input: CommitInput) {
    const current = this.state.learnings.facets ?? {};
    const recent = this.recent().reverse();

    const fPrompt = memPromptFacets.prompt({
      current,
      recent: recent
        .map(s => `${new Date(s.t).toISOString()} - USER QUERY: ${s.q}\nASSISTANT: ${s.assistant}`)
        .join('\n--\n')
    });

    try {
      const res = await this.generate<TMemPromptFacetsJSON>(
        fPrompt,
        memPromptFacets.schema
      );

      const parsed = memPromptFacets.schema.safeParse(res);
      if (!parsed.success) {
        console.warn('[Memory] Facets parsing failed:', JSON.stringify(parsed.error.issues, null, 2));
        console.warn('[Memory] Raw facets response:', JSON.stringify(res, null, 2));
        console.warn('[Memory] Recent dialog used for facets:', recent.map(s => `${new Date(s.t).toISOString()} - USER: ${s.q}\nASSISTANT: ${s.assistant}`).join('\n--\n'));
        return current ?? {};
      }
      
      // console.log('[Memory] Facets updated successfully:', parsed.data);
      return parsed.data;
    } catch (error) {
      console.error('[Memory] Facets generation failed:', error);
      return current ?? {};
    }
  }

  async learn(input: CommitInput) {
    try {
      const prev = this.state.learnings;
      const enableFacets = this.opts.enableFacets ?? true;

      const [nextUser, nextFacets] = await Promise.all([
        this.updateLearningsAboutUser(input),
        enableFacets ?
          this.updateLearningsAboutFacets(input)
          :
          Promise.resolve((prev.facets ?? {}) as TMemPromptFacetsJSON)
      ] as [Promise<TMemPromptUserProfileJSON>, Promise<TMemPromptFacetsJSON>]);

      const next: LearningsState = {
        user: nextUser,
        facets: nextFacets,
        ingestableUser: memPromptUserProfile.ingestPrompt(nextUser),
        ingestableFacets: memPromptFacets.ingestPrompt(nextFacets)
      };

      const changed = JSON.stringify(prev) !== JSON.stringify(next);

      const decision: LearningsDecision = {
        prev,
        next,
        changed,
        source: 'rewrite',
        t: Date.now()
      };

      if (changed) {
        this.state.learnings = next;
        this.emitLearnings(next, decision);
        if (this.opts.store?.updateLearnings) await this.opts.store.updateLearnings(next);
        else await this.persist();
      } else {
        this.emitLearnings(this.state.learnings, decision);
      }
    } catch {

    }
  }


  private _getRecentHistoryText(n = 5): string {
    return this.recent(n)
      .map(s => `USER: ${s.q}\nASSISTANT: ${s.assistant}`)
      .join('\n---\n');
  }

  private async _orchestrateTask(q: string): Promise<void> {
    const orchestratorPrompt = memPromptOrchestrator.prompt({
      userQuery: q,
      recentHistory: this._getRecentHistoryText(),
      activeTask: this.state.activeTask,
    });

    try {
      const decision = await this.generate<TMemPromptOrchestratorJSON>(
        orchestratorPrompt,
        memPromptOrchestrator.schema
      );

      switch (decision.action) {
        case 'START_TASK': {
          console.log('[Memory] Starting new task:', decision.taskType);
          this.state.activeTask = {
            taskType: decision.taskType as string,
            status: 'active',
            state: decision.state || {},
            history: [`Task started with query: ${q}`],
          } as TaskContext;
          break;
        }

        case 'CONTINUE_TASK': {
          if (this.state.activeTask) {
            console.log('[Memory] Continuing task:', this.state.activeTask.taskType);
            this.state.activeTask.state = decision.state || this.state.activeTask.state;
            this.state.activeTask.history.push(`User query: ${q}`);
          }
          break;
        }

        case 'END_TASK': {
          if (this.state.activeTask) {
            console.log('[Memory] Ending task:', this.state.activeTask.taskType);
            console.log('[Memory] Task ended. Final state:', decision.state);
            this.state.activeTask = null;
          }
          break;
        }

        case 'NO_TASK':
        default: {
          // Simple conversational turn; no changes
          break;
        }
      }
    } catch (error) {
      console.error('[Memory] Task Orchestrator failed:', error);
      // Failsafe to avoid stuck state
      this.state.activeTask = null;
    }
  }

  async commit(input: CommitInput) {
    // Orchestrate task first
    await this._orchestrateTask(input.q);

    const snapshot = new Snapshot(input, this.generate, this.opts.embed);
    await snapshot.summerize();
    await snapshot.embed();

    this.state.snapshots.push(snapshot.json);
    this.emitSnapshot(snapshot.json);

    if (this.opts.store?.appendSnapshot)
      await this.opts.store.appendSnapshot(snapshot.json);
    else
      await this.persist();

    if (this.opts.autoAdjustLearnings)
      await this.learn(input);

    return snapshot.json;
  }

  async setLearnings(l: LearningsState) {
    const prev = this.state.learnings;
    this.state.learnings = l;
    const decision: LearningsDecision = {
      prev,
      next: l,
      changed: (JSON.stringify(prev) !== JSON.stringify(l)),
      source: 'manual',
      t: Date.now()
    };

    this.emitLearnings(l, decision);
    if (this.opts.store?.updateLearnings)
      await this.opts.store.updateLearnings(l);
    else
      await this.persist();
  }

  async clear() {
    const clearedUser = memPromptUserProfile.schema.parse({ profile: {}, assistant: {}, flags: {} });
    const clearedFacets = {} as TMemPromptFacetsJSON;
    this.state = { snapshots: [], learnings: { 
      user: clearedUser, 
      facets: clearedFacets,
      ingestableUser: memPromptUserProfile.ingestPrompt(clearedUser),
      ingestableFacets: memPromptFacets.ingestPrompt(clearedFacets)
    }, activeTask: null } as MemoryState;
    if (this.opts.store?.clear) await this.opts.store.clear();
    else await this.persist();
  }
}


class Snapshot implements TSnapshot {
  id: string;
  t: number;
  q: string;
  assistant: string;
  payload: Object;
  summary: string = "";
  vec?: number[] = [];
  tokens?: { in?: number; out?: number };
  custom?: any;

  constructor(
    private opts: CommitInput,
    private generateFn: LlmJsonFn,
    private embedFn: EmbedFn
  ) {
    this.id = opts.id;
    this.t = Date.now();
    this.q = opts.q;
    this.assistant = opts.assistant;
    this.payload = opts.payload;
    this.tokens = opts.tokens;
    this.custom = opts.custom;
  }

  async summerize() {
    const { opts } = this;
    try {
      const res = await this.generateFn<TMemPromptSummaryJSON>(
        memPromptSummary.prompt(opts),
        memPromptSummary.schema
      );
      const raw = String(res?.summary ?? '');
      // strip control characters and cap length
      this.summary = raw.replace(/[\x00-\x1F\x7F]/g, '').slice(0, 280);
    } catch {
      const fallback = `${opts.q.slice(0, 120)} — ${opts.assistant.slice(0, 120)}`;
      this.summary = fallback.replace(/[\x00-\x1F\x7F]/g, '');
    }
  }

  async embed() {
    if (!this.summary) {
      console.warn('Summary is required to embed, cannot proceed');
      return [];
    }

    try {
      const vec = await this.embedFn(this.summary);
      // console.log('[Memory] embed:ok', { len: vec?.length ?? 0 });
      this.vec = vec;
    } catch (e) {
      console.warn('[Memory] embed:fail', (e as Error)?.message);
      this.vec = [];
    }
  }

  get json() {
    return {
      id: this.id,
      t: this.t,
      q: this.q,
      assistant: this.assistant,
      payload: this.payload,
      summary: this.summary,
      vec: this.vec,
      tokens: this.tokens
    };
  }

}