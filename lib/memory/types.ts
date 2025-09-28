import { TMemPromptUserProfileJSON } from "./prompts/profile";
import { memPromptFacets, TMemPromptFacetsJSON } from "./prompts/facets";

export type ToolCall = {
  name: string;
  phase: 'retrieval' | 'display';
  ok: boolean;
  ms: number;
  summary?: string;
};

export type TSnapshot<T = any> = {
  id: string; 
  t: number;
  q: string;
  assistant: string;
  payload: T;
  summary: string;
  vec?: number[];
  tokens?: { in?: number; out?: number };
};

export type UserPersona = { 
  displayName?: string; 
  tone?: string; 
  brevity?: 'short'|'medium'|'long'; 
  format?: 'bullets'|'paragraphs'|'code-first' 
}

export namespace Learnings {
  export type User = TMemPromptUserProfileJSON;
  export type Facets = TMemPromptFacetsJSON;
}

export type LearningsState = { 
  user: Learnings.User; 
  facets: Learnings.Facets;

  ingestableUser: string;
  ingestableFacets: string;
};

export type MemoryContext = {
  learnings: LearningsState;
  recentSummary: string[];
  recallSummary: string[];

  recall?: TSnapshot[];
  recent?: TSnapshot[];
  activeTask?: TaskContext | null;
};

export type MemoryState = {
  snapshots: TSnapshot[];
  learnings: LearningsState;
  activeTask?: TaskContext | null;
};


// Task Orchestration types
export type TaskContext = {
  taskType: string;
  status: 'active' | 'completed';
  state: Record<string, any>;
  history: string[];
};

