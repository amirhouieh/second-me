"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { initMemoryEngine } from "@/lib/memory/init";
import type { MemoryContext, TSnapshot } from "@/lib/memory/types";
import { omit } from "@/lib/utils";
import { DataToolName } from "@/lib/agent/tools/data-tools/names";
import { useNewToolCallingStream } from "@/hooks/new-tool-hook";
import { AgentStreamEventType } from "@/lib/agent/stream-events";
import type { PreviousTool } from "@/lib/agent/types";
import { atomicUITools } from "@/lib/agent/tools/ui-atomic-simple";
import { UIToolResult } from "@/hooks/use-ui-composer-simple";
import { UIRenderer } from "@/components/ui-composer-simple/ui-renderer";


type TSnapshotPayload = {
  dataTools: Record<string, any>;
  uiTools: UIToolResult[];
}

export default function HomePage() {
  const [query, setQuery] = useState("");
  const memoryRef = useRef<Awaited<ReturnType<typeof initMemoryEngine>> | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const [history, setHistory] = useState<TSnapshot<TSnapshotPayload>[]>([]);
  const [currentSnapshot, setCurrentSnapshot] = useState<Partial<TSnapshot<TSnapshotPayload>> | null>(null);
  const [previousTools, setPreviousTools] = useState<PreviousTool[]>([]);
  const [statusText, setStatusText] = useState<string | null>(null);
  const memoryContextRef = useRef<MemoryContext | null>(null);

  const [uiTools, setUiTools] = useState<UIToolResult[]>([]);
  const [assistantText, setAssistantText] = useState("");
  const [isStreamingTextResponseToolFinished, setIsStreamingTextResponseToolFinished] = useState(false);




  const addPreviousTool = (tool: string, type: string) => {
    setPreviousTools(prev => {
      const existing = prev.find(t => t.key === tool);
      return existing
        ? prev.map(t => (t.key === tool ? { ...t, count: t.count + 1 } : t))
        : [...prev, { key: tool, type, count: 1 }];
    });
  };

  const dataTools = useNewToolCallingStream("/api/agent", {
    onEvent: (evt) => {
      if (evt.type === AgentStreamEventType.ToolStarted && (evt as any).toolName) {
        addPreviousTool((evt as any).toolName, "data");
        setStatusText((evt as any).toolName);
      }

      if(evt.type === AgentStreamEventType.Start) {
        console.log("data tools started");
      }

    },
    onFinish: async () => {
      const memoryContext = memoryContextRef.current;
      console.log("data tools finished");
      await assistant.sendMessages(
        [{ role: "user", content: currentSnapshot?.q ?? "" }],
        {
          memoryContext,
          toolResults: dataTools.state.results,
          previousTools,
        }
      );
    },
    onError: (msg) => setStatusText(msg),
  });


  const assistant = useNewToolCallingStream("/api/agent/assistant", {
    onEvent: (evt) => {
      // const _isStreamingTextResponseToolFinished = (
      //   evt.type === AgentStreamEventType.Custom 
      //   && evt.data.message === "respond-text-finished"
      // )

      // console.log(_isStreamingTextResponseToolFinished);

      // if(!isStreamingTextResponseToolFinished && _isStreamingTextResponseToolFinished) {
      //   setIsStreamingTextResponseToolFinished(true);
      // }

      if(evt.type === AgentStreamEventType.Custom) {
        console.log("text-delta: ", (evt as any).data.delta);
        if((evt as any).data.delta) {
          setAssistantText(prev => prev + (evt as any).data.delta||"" as string);
        }
      }

      if (evt.type === AgentStreamEventType.Start) {
        setStatusText("Assistant started");
        setIsStreamingTextResponseToolFinished(false);
        setAssistantText("");
        setUiTools([]);
      }

      if(evt.type === AgentStreamEventType.TextDelta && !isStreamingTextResponseToolFinished) {
        // console.log((evt as any).delta||"" as string, evt)
        // setAssistantText(prev => prev + (evt as any).delta||"" as string);
      }

      if (evt.type === AgentStreamEventType.ToolStarted && (evt as any).toolName) {
        addPreviousTool((evt as any).toolName, "assistant");
        const toolName = (evt as any).toolName;
        const hasUi = toolName === "uiResponse";
        if(hasUi) {
          setStatusText("Generting UI...");
        }
      }

      // Also respond to UI tool lifecycle from DataToolStatus events
      if (evt.type === AgentStreamEventType.DataToolStatus) {
        const name = (evt as any).data?.name as string | undefined;
        const status = (evt as any).data?.status as string | undefined;
        if (name === "uiResponse") {
          if (status === "called") {
            setStatusText("Generating UI…");
            setUiTools([]);
          }
        }
      }

      // Build UI components incrementally from tool results to avoid stale state
      if (evt.type === AgentStreamEventType.ToolResult) {
        const name = (evt as any).data?.name as string | undefined;
        const result = (evt as any).data?.result as Record<string, unknown> | undefined;
        if (!name || !(name in atomicUITools) || !result) return;
        setUiTools(prev => {
          // Replace layoutSkeleton entirely; merge content by skeletonId
          if (name === "layoutSkeleton") {
            const next = prev.filter(c => c.name !== "layoutSkeleton");
            return [...next, { id: `${name}-${evt.id}`, name, result }];
          }
          const skeletonId = (result as any)?.skeletonId as string | undefined;
          let next = prev.filter(c => !(c.name === name && (c.result as any)?.skeletonId === skeletonId));
          return [...next, { id: `${name}-${evt.id}`, name, result }];
        });
      }

      if (
        evt.type === AgentStreamEventType.Start ||
        evt.type === AgentStreamEventType.TextDelta
        ) {
          // setStatusText("Generating response…");
        }
    },
    onFinish: async () => {
      setStatusText("Finished");
      await commit();
      setAssistantText("");
      setUiTools([]);
      setStatusText(null);
      inputRef.current?.focus();
    },
    onError: (msg) => setStatusText(msg),
  });

  const isBusy = dataTools.state.isStreaming || assistant.state.isStreaming;

  // init memory engine + cleanup
  useEffect(() => {
    let mounted = true;
    initMemoryEngine()
      .then((eng) => {
        if (!mounted) return;
        memoryRef.current = eng;
        setHistory([...(eng.getSnapshots(true) || [])]);
        eng.on("snapshot", () => {
          const snaps = eng.getSnapshots(true) || [];
          setHistory(snaps);
        });
      })
      .catch((err) => console.error("initMemoryEngine", err));
    return () => {
      mounted = false;
      dataTools.abort();
      assistant.abort();
      memoryRef.current?.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q || isBusy || !memoryRef.current) return;

    const id = crypto.randomUUID();

    // create a working snapshot
    setCurrentSnapshot({
      id,
      q,
      assistant: "",
      payload: {
        dataTools: {},
        uiTools: [],
      },
      summary: "",
    });

    inputRef.current?.focus();
    setQuery("");
    setStatusText("Starting…");

    // build memory + start data tools stream
    const memoryContext = await memoryRef.current.buildMemoryContext(q);
    memoryContextRef.current = memoryContext;

    await dataTools.sendMessages([{ role: "user", content: q }], {
      memoryContext,
      snapshots: memoryRef.current.getSnapshots(true),
      previousTools,
    });
  };

  const commit = async () => {
    if (!memoryRef.current || !currentSnapshot) return;
    const finalSnapshot: TSnapshot = {
      ...currentSnapshot,
      assistant: assistantText || currentSnapshot.assistant || "",
      payload: {
        dataTools: omit(dataTools.state.results, [DataToolName.ParseQuery, DataToolName.Think]),
        // we are only picking the UI components that are in the atomicUITools
        uiTools: uiTools,
      },
      summary: currentSnapshot.summary ?? "",
    } as TSnapshot;
    await memoryRef.current.commit(finalSnapshot)
    setCurrentSnapshot(null);
  };

  const messagesToRender = useMemo(() => {
    const msgs = [...history];
    if (currentSnapshot && !history.find(h => h.id === currentSnapshot.id)) {
      msgs.push(currentSnapshot as TSnapshot);
    }
    return msgs;
  }, [history, currentSnapshot]);

  // scroll to bottom on updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "auto" });
  }, [messagesToRender, assistantText]);


  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="fixed inset-x-0 bottom-0">
          <div className="max-w-2xl mx-auto p-4">
            <form onSubmit={onSubmit} className="flex gap-2">
              <Input
                ref={inputRef}
                className="flex-1 border-none shadow-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                placeholder="e.g., Who is Amir? / Show GitHub activity / Experience?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={isBusy}
              />
              <Button type="submit" disabled={isBusy || !query.trim()}>
                {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        </div>


        {/* thread */}
        <div className="space-y-6 pb-32 pr-1">
          {messagesToRender.map((snap) => {
            const isActive = currentSnapshot?.id === snap.id;
            const liveAssistant =
              isActive ? assistantText || "" : (snap.assistant || "");

            const liveUiTools = isActive ? uiTools : (snap.payload?.uiTools || []);

            return (
              <div key={snap.id} className="space-y-3">
                {/* user bubble */}
                <div className="flex justify-end">
                  <div className="max-w-[80%] text-right whitespace-pre-wrap">
                    {snap.q}
                  </div>
                </div>

                <div>
                  {isActive && isBusy ? (
                      <div className="pb-2 flex items-center gap-2 text-gray-500 mb-2">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <div className="text-xs">{statusText}</div>
                      </div>
                    ) : null}
                </div>
                {/* assistant bubble */}
                <div className="flex justify-start">
                  <div className="max-w-[80%] text-left prose prose-sm max-w-none pt-4 pb-4 mb-4">
                    {liveAssistant ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {liveAssistant}
                      </ReactMarkdown>
                    ) : null}
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="max-w-[80%] text-left">
                    <UIRenderer components={liveUiTools} />
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
