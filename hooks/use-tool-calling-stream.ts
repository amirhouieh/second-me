import { useRef, useState } from "react";
import { AgentStreamEventType, type AgentStreamEvent } from "@/lib/agent/stream-events";
import { MemoryContext } from "@/lib/memory/types";

export interface UseToolCallingStreamState {
  isLoading: boolean;
  events: AgentStreamEvent[];
  assistantText: string;
  status: AgentStreamEventType | null;
  dataCache: Record<string, unknown>;
  executedDataTools: Set<string>;
  dataToolsResultFinished: boolean;
}

interface SendQueryPayload<T> {
  query: string;
  payload?: {
    memoryContext: MemoryContext;
    messages?: Array<{ role: string; content: string }>;
  } & T;
}

export interface UseToolCallingStreamApi extends UseToolCallingStreamState {
  sendQuery: <T extends any>(args: SendQueryPayload<T>) => Promise<void>;
  sendMessages: <T extends any>(messages: Array<{ role: string; content: string }>, payload?: T) => Promise<void>;
  abort: () => void;
}

export function useToolCallingStream(endpoint: string = "/api/agent"): UseToolCallingStreamApi {
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [events, setEvents] = useState<AgentStreamEvent[]>([]);
  const [assistantText, setAssistantText] = useState<string>("");
  const [status, setStatus] = useState<AgentStreamEventType | null>(null);
  const [dataCache, setDataCache] = useState<Record<string, unknown>>({});
  const [executedDataTools, setExecutedDataTools] = useState<Set<string>>(new Set());
  const [dataToolsResultFinished, setDataToolsResultFinished] = useState<boolean>(false);

  // control refs
  const abortRef = useRef<AbortController | null>(null);
  const streamIdRef = useRef(0);

  // logic refs (authoritative, synchronous)
  const executedRef = useRef<Set<string>>(new Set());
  const toolsDoneRef = useRef(false);
  const lastUniqueToolRef = useRef<string | null>(null);

  const resetPerStream = () => {
    setEvents([]);
    setAssistantText("");
    setStatus(AgentStreamEventType.Start);
    setDataCache({});
    // reset executed tools
    const freshSet = new Set<string>();
    executedRef.current = freshSet;
    setExecutedDataTools(freshSet);
    // reset completion flags
    toolsDoneRef.current = false;
    lastUniqueToolRef.current = null;
  };

  const abort = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    streamIdRef.current += 1; // invalidate any in-flight reader
    setIsLoading(false);
    setStatus(AgentStreamEventType.Abort);
  };

  const sendMessages = async (
    messages: Array<{ role: string; content: string }>,
    payload?: unknown
  ) => {
    if (isLoading) return;

    // new stream starts
    streamIdRef.current += 1;
    const myStreamId = streamIdRef.current;

    setIsLoading(true);
    resetPerStream();

    // ensure only one active fetch
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
        if (myStreamId !== streamIdRef.current) break; // stream was superseded/aborted

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n");
        buffer = parts.pop() || "";

        for (let rawLine of parts) {
          if (myStreamId !== streamIdRef.current) break;

          let line = rawLine.trim();
          if (!line) continue;
          // skip SSE comment/event-name lines
          if (line.startsWith(":") || line.startsWith("event:")) continue;
          if (line.startsWith("data: ")) line = line.slice(6);
          if (!line || line === "[DONE]") continue;

          try {
            const evt = JSON.parse(line) as AgentStreamEvent;
            setStatus(evt.type);

            switch (evt.type) {  
              case AgentStreamEventType.TextDelta: {
                const delta = evt.delta ?? "";
                if (delta) setAssistantText((prev) => prev + delta);
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
                if (text) setAssistantText((prev) => prev + text);
                break;
              }

              case AgentStreamEventType.DataToolStatus: {
                setEvents((prev) => [...prev, evt]);
                break;
              }

              case AgentStreamEventType.DataToolResult: {
                const name = evt.data?.name || "tool";
                const result = evt.data?.result;
                setDataCache((prev) => ({ ...prev, [name]: result }));
                setEvents((prev) => [...prev, evt]);
                setExecutedDataTools((prev) => new Set([...prev, name]));
                break;
              }

              case AgentStreamEventType.DataToolsResultAvailable: {
                setEvents((prev) => [...prev, evt]);
                break;
              }

              case AgentStreamEventType.TextStart: {
                setEvents((prev) => [...prev, {
                  ...evt,
                  type: AgentStreamEventType.DataToolsResultFinished,
                }]);
                setDataToolsResultFinished(true);
                break;
              }

              case AgentStreamEventType.Start: {
                setEvents((prev) => [...prev, evt]);
                setDataToolsResultFinished(false);
                break;
              }

              case AgentStreamEventType.Finish: {
                console.log(evt, dataCache);
                setEvents((prev) => [...prev, evt]);
                break;
              }

              case AgentStreamEventType.StartStep:
              case AgentStreamEventType.FinishStep: {
                setEvents((prev) => [...prev, evt]);
                break;
              }
              
              default: {
                // ignore unknown event types
                break;
              }
            }
          } catch (err) {
            console.error("Failed to parse event", err);
          }
        }
      }
    } catch (e) {
      console.error((e as Error).message);
      setStatus(AgentStreamEventType.Error);
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  };

  const sendQuery = async ({ query, payload }: SendQueryPayload<any>) => {
    const trimmed = (query ?? "").trim();
    if (!trimmed) return;
    const messages = payload?.messages || [];
    // Important: put history BEFORE the current user message
    await sendMessages([...(messages || []), { role: "user", content: trimmed }], payload);
  };

  return {
    isLoading,
    events,
    assistantText,
    status,
    dataCache,
    sendQuery,
    sendMessages,
    abort,
    executedDataTools,
    dataToolsResultFinished
  };
}
