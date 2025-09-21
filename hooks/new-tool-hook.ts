import { useRef, useState, useCallback } from "react";
import { AgentStreamEventType, type AgentStreamEvent } from "@/lib/agent/stream-events";
import { MemoryContext } from "@/lib/memory/types";

// Phase-based state machine enums
export const ToolingPhase = {
  Idle: 'idle',
  Starting: 'starting', 
  ToolsRunning: 'tools-running',
  StreamingText: 'streaming-text',
  Finished: 'finished',
  Error: 'error'
} as const;

export type ToolingPhase = typeof ToolingPhase[keyof typeof ToolingPhase];

export const ToolStatus = {
  Called: 'called',
  Completed: 'completed'
} as const;

export type ToolStatus = typeof ToolStatus[keyof typeof ToolStatus];

// Tool information interface
interface ToolInfo {
  name: string;
  status: ToolStatus;
  label?: string;
}

interface CompletedToolInfo extends ToolInfo {
  result: unknown;
  status: typeof ToolStatus.Completed;
}

// Consolidated state interface
interface ToolingState {
  phase: ToolingPhase;
  activeTools: Map<string, ToolInfo>;
  completedTools: Map<string, CompletedToolInfo>;
  dataCache: Record<string, unknown>;
  lastCompletedTool: CompletedToolInfo | null;
  error: string | null;
  assistantText: string;
  events: AgentStreamEvent[];
  allToolsFinished: boolean; // Set to true only when TextStart is received
}

// Hook return interface
interface UseNewToolCallingStreamApi {
  // Consolidated state
  toolingState: ToolingState;
  
  // Convenience getters
  isIdle: boolean;
  isProcessing: boolean;
  isStreamingText: boolean;
  isFinished: boolean;
  hasError: boolean;
  isAllToolsFinished: boolean;
  
  // Tool-specific info
  activeToolCount: number;
  completedToolCount: number;
  lastCompletedTool: CompletedToolInfo | null;
  
  // Legacy compatibility
  assistantText: string;
  dataCache: Record<string, unknown>;
  events: AgentStreamEvent[];
  
  // Actions
  sendMessages: (messages: Array<{ role: string; content: string }>, payload?: unknown) => Promise<void>;
  sendQuery: (args: SendQueryPayload<any>) => Promise<void>;
  abort: () => void;
  isLoading: boolean;
}

interface SendQueryPayload<T> {
  query: string;
  payload?: {
    memoryContext: MemoryContext;
    messages?: Array<{ role: string; content: string }>;
  } & T;
}

const initialState: ToolingState = {
  phase: ToolingPhase.Idle,
  activeTools: new Map(),
  completedTools: new Map(),
  dataCache: {},
  lastCompletedTool: null,
  error: null,
  assistantText: "",
  events: [],
  allToolsFinished: false
};

export function useNewToolCallingStream(endpoint: string = "/api/agent"): UseNewToolCallingStreamApi {
  const [state, setState] = useState<ToolingState>(initialState);
  const [isLoading, setIsLoading] = useState(false);
  
  // Control refs
  const abortRef = useRef<AbortController | null>(null);
  const streamIdRef = useRef(0);

  const resetState = useCallback(() => {
    setState({
      ...initialState,
      phase: ToolingPhase.Starting,
      activeTools: new Map(),
      completedTools: new Map(),
      dataCache: {},
      events: [],
      allToolsFinished: false
    });
  }, []);

  const updateState = useCallback((updater: (prev: ToolingState) => Partial<ToolingState>) => {
    setState(prev => ({ ...prev, ...updater(prev) }));
  }, []);

  const processEvent = useCallback((evt: AgentStreamEvent) => {
    switch (evt.type) {
      case AgentStreamEventType.Start: {
        updateState(() => ({
          phase: ToolingPhase.Starting,
          events: [evt],
          error: null
        }));
        break;
      }

      case AgentStreamEventType.DataToolStatus: {
        const { name, status, label } = (evt as any).data;
        const toolId = (evt as any).id;
        
        if (status === 'called') {
          updateState(prev => {
            const newActiveTools = new Map(prev.activeTools);
            newActiveTools.set(toolId, { name, status: ToolStatus.Called, label });
            
            return {
              phase: ToolingPhase.ToolsRunning,
              activeTools: newActiveTools,
              events: [...prev.events, evt]
            };
          });
        }
        break;
      }

      case AgentStreamEventType.DataToolResult: {
        const { name, result } = (evt as any).data;
        const toolId = (evt as any).id;
        
        updateState(prev => {
          const newActiveTools = new Map(prev.activeTools);
          const newCompletedTools = new Map(prev.completedTools);
          
          // Get label from active tool if available
          const activeTool = newActiveTools.get(toolId);
          const label = activeTool?.label;
          
          // Move from active to completed
          newActiveTools.delete(toolId);
          const completedTool: CompletedToolInfo = {
            name,
            result,
            status: ToolStatus.Completed,
            label
          };
          newCompletedTools.set(toolId, completedTool);
          
          return {
            activeTools: newActiveTools,
            completedTools: newCompletedTools,
            dataCache: { ...prev.dataCache, [name]: result },
            lastCompletedTool: completedTool,
            events: [...prev.events, evt]
          };
        });
        break;
      }

      case AgentStreamEventType.TextStart: {
        updateState(prev => ({
          phase: ToolingPhase.StreamingText,
          allToolsFinished: true, // This is the definitive signal that all tools are done
          events: [...prev.events, evt]
        }));
        break;
      }

      case AgentStreamEventType.TextDelta: {
        const delta = (evt as any).delta ?? "";
        if (delta) {
          updateState(prev => ({
            assistantText: prev.assistantText + delta,
            events: [...prev.events, evt]
          }));
        }
        break;
      }

      case AgentStreamEventType.AssistantMessage: {
        const content = Array.isArray((evt as any).message?.content)
          ? (evt as any).message.content
          : [];
        const text = content
          .filter((p: any) => p.type === "text")
          .map((p: any) => p.text)
          .join("");
        
        if (text) {
          updateState(prev => ({
            assistantText: prev.assistantText + text,
            events: [...prev.events, evt]
          }));
        }
        break;
      }

      case AgentStreamEventType.Finish: {
        updateState(prev => ({
          phase: ToolingPhase.Finished,
          events: [...prev.events, evt]
        }));
        break;
      }

      case AgentStreamEventType.Error: {
        const errorText = (evt as any).errorText || "Unknown error occurred";
        updateState(prev => ({
          phase: ToolingPhase.Error,
          error: errorText,
          events: [...prev.events, evt]
        }));
        break;
      }

      case AgentStreamEventType.Abort: {
        updateState(prev => ({
          phase: ToolingPhase.Error,
          error: "Stream aborted",
          events: [...prev.events, evt]
        }));
        break;
      }

      // Handle other events by just adding to events array
      case AgentStreamEventType.StartStep:
      case AgentStreamEventType.FinishStep:
      case AgentStreamEventType.DataToolsResultAvailable: {
        updateState(prev => ({
          events: [...prev.events, evt]
        }));
        break;
      }

      default: {
        // Unknown event type - just add to events
        updateState(prev => ({
          events: [...prev.events, evt]
        }));
        break;
      }
    }
  }, [updateState]);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    streamIdRef.current += 1;
    setIsLoading(false);
    
    updateState(() => ({
      phase: ToolingPhase.Error,
      error: "Manually aborted"
    }));
  }, [updateState]);

  const sendMessages = useCallback(async (
    messages: Array<{ role: string; content: string }>,
    payload?: unknown
  ) => {
    if (isLoading) return;

    // New stream starts
    streamIdRef.current += 1;
    const myStreamId = streamIdRef.current;

    setIsLoading(true);
    resetState();

    // Ensure only one active fetch
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, payload }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) throw new Error("Failed to connect");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (myStreamId !== streamIdRef.current) break; // Stream was superseded/aborted

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n");
        buffer = parts.pop() || "";

        for (let rawLine of parts) {
          if (myStreamId !== streamIdRef.current) break;

          let line = rawLine.trim();
          if (!line) continue;
          // Skip SSE comment/event-name lines
          if (line.startsWith(":") || line.startsWith("event:")) continue;
          if (line.startsWith("data: ")) line = line.slice(6);
          if (!line || line === "[DONE]") continue;

          try {
            const evt = JSON.parse(line) as AgentStreamEvent;
            processEvent(evt);
          } catch (err) {
            console.error("Failed to parse event", err);
          }
        }
      }
    } catch (e) {
      console.error((e as Error).message);
      updateState(() => ({
        phase: ToolingPhase.Error,
        error: (e as Error).message
      }));
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [isLoading, resetState, processEvent, updateState, endpoint]);

  const sendQuery = useCallback(async ({ query, payload }: SendQueryPayload<any>) => {
    const trimmed = (query ?? "").trim();
    if (!trimmed) return;
    const messages = payload?.messages || [];
    await sendMessages([...(messages || []), { role: "user", content: trimmed }], payload);
  }, [sendMessages]);

  // Computed values - use the definitive allToolsFinished flag set by TextStart
  const isAllToolsFinished = state.allToolsFinished;
  
  return {
    // Consolidated state
    toolingState: state,
    
    // Convenience getters
    isIdle: state.phase === ToolingPhase.Idle,
    isProcessing: state.phase === ToolingPhase.Starting || state.phase === ToolingPhase.ToolsRunning || state.phase === ToolingPhase.StreamingText,
    isStreamingText: state.phase === ToolingPhase.StreamingText,
    isFinished: state.phase === ToolingPhase.Finished,
    hasError: state.phase === ToolingPhase.Error,
    isAllToolsFinished,
    
    // Tool-specific info
    activeToolCount: state.activeTools.size,
    completedToolCount: state.completedTools.size,
    lastCompletedTool: state.lastCompletedTool,
    
    // Legacy compatibility
    assistantText: state.assistantText,
    dataCache: state.dataCache,
    events: state.events,
    
    // Actions
    sendMessages,
    sendQuery,
    abort,
    isLoading
  };
}

// Export types for consumers
export type { ToolingState, CompletedToolInfo, ToolInfo };
