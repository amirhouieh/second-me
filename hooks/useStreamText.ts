'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AgentStreamEventType, type AgentStreamEvent } from '@/lib/agent/stream-events';

type UseStreamTextOptions = {
  api?: string;
  memoryContext?: unknown;
  toolResults?: unknown;
};

type SendPayload = {
  prompt?: string;
  messages?: Array<{ role: string; content: string }>;
  data?: unknown;
};

type UseStreamText = {
  output: string;
  isStreaming: boolean;
  error: string | null;
  send: (payload: SendPayload) => Promise<void>;
  stop: () => void;
  reset: () => void;
  // Event-driven API to match other hooks
  events: AgentStreamEvent[];
  status: AgentStreamEventType | null;
};

export function useStreamText(options: UseStreamTextOptions = {}): UseStreamText {
  const { api = '/api/agent/respond', memoryContext, toolResults } = options;

  const [output, setOutput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [events, setEvents] = useState<AgentStreamEvent[]>([]);
  const [status, setStatus] = useState<AgentStreamEventType | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    setOutput('');
    setError(null);
  }, []);

  const send = useCallback(
    async (payload: SendPayload) => {
      setError(null);
      setOutput('');
      setIsStreaming(true);
      setEvents([]);
      setStatus(AgentStreamEventType.Start);

      const ac = new AbortController();
      abortRef.current = ac;

      try {
        const body = {
          messages:
            payload?.messages && payload.messages.length > 0
              ? payload.messages
              : [{ role: 'user', content: payload?.prompt ?? '' }],
          data: payload?.data ?? undefined,
        };

        const res = await fetch(api, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: ac.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error(`HTTP ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let accumulated = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // SSE frames are separated by double newlines
          let idx;
          while ((idx = buffer.indexOf('\n\n')) !== -1) {
            const frame = buffer.slice(0, idx).trim();
            buffer = buffer.slice(idx + 2);

            if (!frame.startsWith('data:')) continue;
            const jsonStr = frame.replace(/^data:\s?/, '');
            if (!jsonStr) continue;

            try {
              const evt = JSON.parse(jsonStr);
              switch (evt.type) {
                case 'start': {
                  setStatus(AgentStreamEventType.Start);
                  // Start event in our schema requires messageId; omit pushing to events
                  break;
                }
                case 'start-step': {
                  setEvents(prev => [...prev, { type: AgentStreamEventType.StartStep }]);
                  break;
                }
                case 'text-start': {
                  setStatus(AgentStreamEventType.TextStart);
                  setEvents(prev => [...prev, { type: AgentStreamEventType.TextStart, id: evt.id }]);
                  break;
                }
                case 'text-delta': {
                  if (typeof evt.delta === 'string') {
                    accumulated += evt.delta;
                    setOutput(accumulated);
                    setEvents(prev => [...prev, { type: AgentStreamEventType.TextDelta, id: evt.id, delta: evt.delta }]);
                    setStatus(AgentStreamEventType.TextDelta);
                  }
                  break;
                }
                case 'text-end': {
                  setEvents(prev => [...prev, { type: AgentStreamEventType.TextEnd, id: evt.id }]);
                  setStatus(AgentStreamEventType.TextEnd);
                  break;
                }
                case 'assistant-message': {
                  setEvents(prev => [...prev, { type: AgentStreamEventType.AssistantMessage, message: evt.message }]);
                  break;
                }
                case 'finish': {
                  setEvents(prev => [...prev, { type: AgentStreamEventType.Finish }]);
                  setStatus(AgentStreamEventType.Finish);
                  break;
                }
                case 'error': {
                  setEvents(prev => [...prev, { type: AgentStreamEventType.Error }]);
                  setStatus(AgentStreamEventType.Error);
                  break;
                }
                default: {
                  // ignore other UI message events for now
                  break;
                }
              }
            } catch {
              // ignore non-JSON or keep-alive
            }
          }
        }
      } catch (err) {
        if ((err as Error)?.name !== 'AbortError') {
          setError((err as Error)?.message ?? 'Stream failed');
          setStatus(AgentStreamEventType.Error);
          setEvents(prev => [...prev, { type: AgentStreamEventType.Error }]);
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [api, memoryContext, toolResults]
  );

  // Cleanup on unmount
  useEffect(() => () => abortRef.current?.abort(), []);

  return { output, isStreaming, error, send, stop, reset, events, status };
}


