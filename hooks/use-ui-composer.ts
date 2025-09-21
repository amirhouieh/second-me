"use client";

import { useState, useCallback } from 'react';
import { useToolCallingStream } from '@/hooks/use-tool-calling-stream';

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

export function useUIComposer(endpoint: string = '/api/ui-composer') {
  const [uiComponents, setUIComponents] = useState<UIToolResult[]>([]);

  const {
    isLoading: isComposing,
    assistantText: composerText,
    sendMessages: sendComposerRequest,
    abort,
    status,
    events,
  } = useToolCallingStream(endpoint);

  // Extract UI tool results from events
  const uiToolResults = events
    .filter((event: any) => event?.type === 'ui-tool-result')
    .map((event: any) => event.data as UIToolResult);

  const composeUI = useCallback(async (request: UIComposerRequest) => {
    setUIComponents([]);
    await sendComposerRequest([], request);
  }, [sendComposerRequest]);

  const reset = useCallback(() => {
    setUIComponents([]);
    abort?.();
  }, [abort]);

  return {
    isComposing,
    composerText,
    uiComponents: uiToolResults,
    status,
    events,
    composeUI,
    reset,
    abort,
  };
}