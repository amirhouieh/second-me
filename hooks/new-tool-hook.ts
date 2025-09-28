import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { AgentStreamEventType, type AgentStreamEvent } from "@/lib/agent/stream-events";

type Messages = Array<{ role: string; content: string }>;

interface StreamState {
  isStreaming: boolean;
  events: AgentStreamEvent[];
  assistantText: string;
  error: string | null;
  results: Record<string, unknown>;
  status: AgentStreamEventType | null;
  currentTool: string | null;
}

type StreamAction =
  | { type: "RESET" }
  | { type: "START" }
  | { type: "EVENT"; evt: AgentStreamEvent }
  | { type: "ERROR"; error: string }
  | { type: "FINISH" }
  | { type: "ABORT"; reason?: string };

const initialState: StreamState = {
  isStreaming: false,
  events: [],
  assistantText: "",
  error: null,
  results: {},
  status: null,
  currentTool: null,
};

function reduceEvent(prev: StreamState, evt: AgentStreamEvent): StreamState {
  let next: StreamState = {
    ...prev,
    events: [...prev.events, evt],
    status: evt.type,
  };

  switch (evt.type) {
    case AgentStreamEventType.ToolStarted: {
      const tool = (evt as any).toolName ?? null;
      if (tool) next.currentTool = tool;
      break;
    }
    case AgentStreamEventType.ToolResult: {
      const { name, result } = (evt as any).data ?? {};
      if (name) next.results = { ...prev.results, [name]: result };
      break;
    }
    case AgentStreamEventType.TextDelta: {
      const delta = (evt as any).delta ?? "";
      if (delta) next.assistantText = prev.assistantText + String(delta);
      break;
    }
    case AgentStreamEventType.AssistantMessage: {
      const content = Array.isArray((evt as any).message?.content)
        ? (evt as any).message.content
        : [];
      const text = content
        .filter((p: any) => p?.type === "text")
        .map((p: any) => p.text ?? "")
        .join("");
      if (text) next.assistantText = prev.assistantText + text;
      break;
    }
    case AgentStreamEventType.Start: {
      next.isStreaming = true;
      break;
    }
    case AgentStreamEventType.Finish: {
      next.isStreaming = false;
      next.currentTool = null;
      break;
    }
    case AgentStreamEventType.Error: {
      next.error = (evt as any).errorText || "Unknown error occurred";
      next.isStreaming = false;
      next.currentTool = null;
      break;
    }
    case AgentStreamEventType.Abort: {
      next.error = "Stream aborted";
      next.isStreaming = false;
      next.currentTool = null;
      break;
    }
  }
  return next;
}

function reducer(state: StreamState, action: StreamAction): StreamState {
  switch (action.type) {
    case "RESET":
      return initialState;
    case "START":
      return { ...initialState, isStreaming: true };
    case "EVENT":
      return reduceEvent(state, action.evt);
    case "ERROR":
      return { ...state, isStreaming: false, error: action.error, currentTool: null };
    case "FINISH":
      return { ...state, isStreaming: false, currentTool: null };
    case "ABORT":
      return { ...state, isStreaming: false, error: action.reason ?? "Manually aborted", currentTool: null };
    default:
      return state;
  }
}

type Callbacks = {
  onEvent?: (evt: AgentStreamEvent) => void;
  onFinish?: () => void;
  onError?: (error: string) => void;
};

type UseStreamingApi = {
  state: StreamState;
  sendMessages: (messages: Messages, payload?: unknown) => Promise<void>;
  abort: () => void;
  reset: () => void;
};

export function useNewToolCallingStream(
  endpoint = "/api/agent",
  callbacks: Callbacks = {}
): UseStreamingApi {
  const [state, dispatch] = useReducer(reducer, initialState);

  // stable refs (avoid re-subscribing chunks)
  const controllerRef = useRef<AbortController | null>(null);
  const tokenRef = useRef(0);
  const isMountedRef = useRef(true);
  const cbsRef = useRef(callbacks);
  cbsRef.current = callbacks;

  useEffect(() => () => { // unmount cleanup
    isMountedRef.current = false;
    controllerRef.current?.abort();
  }, []);

  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  const abort = useCallback(() => {
    tokenRef.current += 1; // invalidate any active reader
    controllerRef.current?.abort();
    controllerRef.current = null;
    dispatch({ type: "ABORT", reason: "Manually aborted" });
  }, []);

  const safeDispatchEvent = useCallback((evt: AgentStreamEvent) => {
    dispatch({ type: "EVENT", evt });
    cbsRef.current.onEvent?.(evt);
  }, []);

  // tolerant parser: supports SSE (multi-line data:) and NDJSON lines
  const pumpStream = useCallback(
    async (body: ReadableStream<Uint8Array>, myToken: number) => {
      const reader = body.getReader();
      const decoder = new TextDecoder();

      let buffer = "";
      let sseDataLines: string[] = [];

      const flushSseIfAny = () => {
        if (!sseDataLines.length) return;
        const joined = sseDataLines.join("\n").trim();
        sseDataLines = [];
        if (!joined || joined === "[DONE]") return;
        try {
          const evt = JSON.parse(joined) as AgentStreamEvent;
          safeDispatchEvent(evt);
        } catch (err) {
          // swallow parse errors but keep stream alive
          console.error("Failed to parse SSE data:", err, joined);
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (myToken !== tokenRef.current) break; // superseded

        buffer += decoder.decode(value, { stream: true });

        // process line by line
        let nl = buffer.indexOf("\n");
        while (nl !== -1) {
          const rawLine = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          let line = rawLine.replace(/\r$/, ""); // trim CR

          const trimmed = line.trim();
          if (trimmed === "") {
            // end of SSE event
            flushSseIfAny();
          } else if (trimmed.startsWith(":") || trimmed.startsWith("event:")) {
            // ignore SSE comments/event names
          } else if (/^data:\s*/i.test(line)) {
            sseDataLines.push(line.replace(/^data:\s*/i, ""));
          } else {
            // likely NDJSON (or raw JSON per line)
            if (trimmed === "[DONE]") {
              // end signal (common in OpenAI style)
            } else {
              try {
                const evt = JSON.parse(trimmed) as AgentStreamEvent;
                safeDispatchEvent(evt);
              } catch (err) {
                // If this was a partial JSON fragment, keep accumulating
                // Re-attach and break out to read more bytes
                buffer = trimmed + "\n" + buffer;
                break;
              }
            }
          }

          nl = buffer.indexOf("\n");
        }
      }

      // flush any trailing SSE data block
      flushSseIfAny();
    },
    [safeDispatchEvent]
  );

  const sendMessages = useCallback(
    async (messages: Messages, payload?: unknown) => {
      // reject if already streaming to avoid mixed outputs
      if (controllerRef.current) return;

      // new token & controller
      tokenRef.current += 1;
      const myToken = tokenRef.current;

      controllerRef.current?.abort();
      controllerRef.current = new AbortController();

      // start fresh & mark streaming ON in a single atomic action
      dispatch({ type: "START" });

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages, payload }),
          signal: controllerRef.current.signal,
        });

        if (!res.ok) {
          // try to read server error text once
          let msg = `Request failed (${res.status})`;
          try {
            const text = await res.text();
            if (text) msg = `${msg}: ${text}`;
          } catch { /* ignore */ }
          throw new Error(msg);
        }
        if (!res.body) throw new Error("No response body (stream not supported?)");

        await pumpStream(res.body, myToken);

        // finish only if still the current stream
        if (isMountedRef.current && myToken === tokenRef.current) {
          dispatch({ type: "FINISH" });
          cbsRef.current.onFinish?.();
        }
      } catch (e: any) {
        if (myToken !== tokenRef.current) return; // superseded/aborted; ignore
        const msg = e?.name === "AbortError" ? "Aborted" : String(e?.message || e);
        dispatch({ type: "ERROR", error: msg });
        cbsRef.current.onError?.(msg);
      } finally {
        if (myToken === tokenRef.current) {
          controllerRef.current = null;
        }
      }
    },
    [endpoint, pumpStream]
  );

  // memoize return to keep stable identity for consumers
  return useMemo(
    () => ({ state, sendMessages, abort, reset }),
    [state, sendMessages, abort, reset]
  );
}

// re-export for consumers
export type { StreamState };
