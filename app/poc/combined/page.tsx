"use client";

import React, { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Send } from "lucide-react";
import { useNewToolCallingStream } from "@/hooks/new-tool-hook";
import { UIRenderer } from "@/components/ui-composer-simple/ui-renderer";
import { AgentStreamEventType } from "@/lib/agent/stream-events";

export default function CombinedTestPage() {
  const [query, setQuery] = useState("");
  const [components, setComponents] = useState<any[]>([]);
  const [statusText, setStatusText] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [assistantText, setAssistantText] = useState<string>("");

  const tools = useNewToolCallingStream("/api/agent/combined");
  const {
    toolingState,
    isLoading,
    sendMessages,
    lastCompletedTool,
    events,
  } = tools;

  useEffect(() => {
    // Collect UI components progressively (same shape as main app expects)
    if (toolingState.completedTools.size === 0) return;
    const uiComponents = Array.from(toolingState.completedTools.entries()).map(([toolId, toolInfo]) => ({
      id: toolId,
      name: toolInfo.name,
      result: toolInfo.result as Record<string, unknown>
    }));
    setComponents(uiComponents);
  }, [toolingState.completedTools]);

  useEffect(() => {
    // Minimal status text from last completed tool
    if (lastCompletedTool) {
      setStatusText(lastCompletedTool.label || lastCompletedTool.name);
    }
  }, [lastCompletedTool]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q || isLoading) return;
    setComponents([]);
    setStatusText("Starting...");
    await sendMessages([
      { role: "user", content: q }
    ], {
      memoryContext: undefined,
      previousTools: [],
      query: q,
      toolResults: {},
    });
    setStatusText(null);
    inputRef.current?.focus();
  };


  useEffect(() => {
    const streamFinishedEvent = events.find((event) => (
      event.type === AgentStreamEventType.Custom 
      && event.data.message === "respond-text-finished"
    ));
    
    const deltaEvent = events.filter((event) => (
      event.type === AgentStreamEventType.TextDelta
    ));

    if(deltaEvent && !streamFinishedEvent) {
      setAssistantText(prev => (deltaEvent.map((event) => event.delta).join("") ?? ""));
    }
  }, [events])

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="sticky top-0 bg-gray-50/80 backdrop-blur supports-[backdrop-filter]:bg-gray-50/60 p-3 z-10">
          <form onSubmit={onSubmit} className="flex gap-2">
            <Input
              ref={inputRef}
              className="flex-1 border-none shadow-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              placeholder="Try: Show Amir's projects"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading || !query.trim()}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>

        {statusText && (
          <div className="pb-2 flex items-center gap-2 text-gray-500">
            <Loader2 className="h-3 w-3 animate-spin" />
            <div className="text-xs">{statusText}</div>
          </div>
        )}

        {/* Assistant streamed text (if the agent chose to call respond) */}
        {assistantText && assistantText.trim().length > 0 && (
          <div className="prose prose-sm max-w-none pt-4 pb-2">
            {assistantText}
          </div>
        )}

        <div className="mt-4">
          {components.length > 0 && (
            <UIRenderer components={components} />
          )}
        </div>
      </div>
    </div>
  );
}


