import { useState, useCallback, useRef } from 'react';
import { ERagStage, IRagState, RagState } from './use-agentic-rag';

export interface UseProjectSearchOptions {
  onComplete?: (results: any) => void;
  onError?: (error: string) => void;
  onResults?: (results: any[]) => void;
}

interface SearchResult {
  title: string;
  autoSummary: string;
  autoKeywords: string[];
  remoteId: string;
  url?: string;
  __typename: string;
  _additional: {
    certainty: number;
  };
}

export function useProjectSearch(options: UseProjectSearchOptions = {}) {
  const [state, setState] = useState<RagState>({
    stage: {
      [ERagStage.Status]: { key: ERagStage.Status, status: 'done' },
      [ERagStage.Understanding]: { key: ERagStage.Understanding, status: 'done' },
      [ERagStage.Retrieval]: { key: ERagStage.Retrieval, status: 'done' },
      [ERagStage.Generation]: { key: ERagStage.Generation, status: 'done' },
      [ERagStage.Valuation]: { key: ERagStage.Valuation, status: 'done' },
      [ERagStage.Final]: { key: ERagStage.Final, status: 'done' },
      [ERagStage.Error]: { key: ERagStage.Error, status: 'done' },
    },
    progress: 0,
    output: {},
  });

  const [results, setResults] = useState<SearchResult[]>([]);
  const [answer, setAnswer] = useState<string>('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const updateStage = useCallback((stage: ERagStage, status: 'loading' | 'done' | 'error') => {
    setState(prev => ({
      ...prev,
      stage: {
        ...prev.stage,
        [stage]: { key: stage, status, error: undefined }
      }
    }));
  }, []);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) return;

    // Reset state
    setResults([]);
    setAnswer('');
    setError(null);
    setIsSearching(true);
    setState(prev => ({
      ...prev,
      progress: 0,
      output: {},
      stage: {
        [ERagStage.Status]: { key: ERagStage.Status, status: 'loading' },
        [ERagStage.Understanding]: { key: ERagStage.Understanding, status: 'loading' },
        [ERagStage.Retrieval]: { key: ERagStage.Retrieval, status: 'loading' },
        [ERagStage.Generation]: { key: ERagStage.Generation, status: 'loading' },
        [ERagStage.Valuation]: { key: ERagStage.Valuation, status: 'loading' },
        [ERagStage.Final]: { key: ERagStage.Final, status: 'loading' },
        [ERagStage.Error]: { key: ERagStage.Error, status: 'done' },
      }
    }));

    // Abort previous search
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to start search');
      }

      updateStage(ERagStage.Status, 'done');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const event of events) {
          const lines = event.split('\n');
          const eventType = lines[0]?.replace('event: ', '');
          const dataLine = lines[1]?.replace('data: ', '');
          
          if (!dataLine) continue;
          
          try {
            const data = JSON.parse(dataLine);

            switch (eventType) {
              case ERagStage.Understanding:
                updateStage(ERagStage.Understanding, 'done');
                setState(prev => ({ ...prev, progress: 25 }));
                break;

              case ERagStage.Retrieval:
                updateStage(ERagStage.Retrieval, 'done');
                setState(prev => ({ ...prev, progress: 50 }));
                if (data.output?.results) {
                  setResults(data.output.results);
                  options.onResults?.(data.output.results);
                }
                break;

              case ERagStage.Generation:
                updateStage(ERagStage.Generation, 'done');
                setState(prev => ({ ...prev, progress: 75 }));
                if (data.output?.answer) {
                  setAnswer(data.output.answer);
                }
                break;

              case ERagStage.Final:
                updateStage(ERagStage.Final, 'done');
                setState(prev => ({ ...prev, progress: 100 }));
                setIsSearching(false);
                options.onComplete?.(data.output);
                break;

              case 'error':
                const errorMsg = data.message || 'Search failed';
                setError(errorMsg);
                setIsSearching(false);
                options.onError?.(errorMsg);
                break;
            }
          } catch (parseError) {
            console.warn('Failed to parse search event:', parseError);
          }
        }
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        const errorMsg = `Search failed: ${err instanceof Error ? err.message : String(err)}`;
        setError(errorMsg);
        setIsSearching(false);
        options.onError?.(errorMsg);
      }
    } finally {
      abortControllerRef.current = null;
    }
  }, [options, updateStage]);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsSearching(false);
    }
  }, []);

  return {
    search,
    cancel,
    results,
    answer,
    isSearching,
    error,
    progress: state.progress,
    stage: state.stage,
  };
}
