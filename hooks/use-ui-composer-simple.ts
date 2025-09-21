"use client";

import { useState, useCallback, useRef } from 'react';

export interface UIComposerRequest {
  query: string;
  assistantResponse: string;
  dataPayload: Record<string, unknown>;
}

export interface UIToolResult {
  id: string;
  name: string;
  result: Record<string, unknown>;
}

export function useUIComposer(
  endpoint: string = '/api/ui-composer',
  onComponentGenerated?: (component: UIToolResult) => void
) {
  const [isComposing, setIsComposing] = useState(false);
  const [uiComponents, setUIComponents] = useState<UIToolResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const composeUI = useCallback(async (request: UIComposerRequest) => {
    setIsComposing(true);
    setUIComponents([]);
    setError(null);

    // Abort previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      const decoder = new TextDecoder();
      const components: UIToolResult[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));    
              if (data.type === 'data-ui-tool-result') {
                // Normalize component to include a stable id
                const normalized = {
                  id: data.id || crypto.randomUUID?.() || String(Date.now()),
                  name: data.data?.name,
                  result: data.data?.result,
                } as UIToolResult;
                components.push(normalized);
                setUIComponents([...components]); // Update state with new component
                onComponentGenerated?.(normalized); // Notify parent component
              }
            } catch (e) {
              // Ignore parsing errors for malformed JSON
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('[UI Composer] Error:', err);
        setError(err.message);
      }
    } finally {
      setIsComposing(false);
      abortControllerRef.current = null;
    }
  }, [endpoint]);

  const reset = useCallback(() => {
    setUIComponents([]);
    setError(null);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    isComposing,
    uiComponents,
    error,
    composeUI,
    reset,
  };
}
