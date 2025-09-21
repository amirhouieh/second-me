"use client";

import React, { useRef, useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Input } from "@/components/ui/input";
import { Loader2, Send } from "lucide-react";
import { MemoryEngine } from "@/lib/memory/engine";
import { initMemoryEngine } from "@/lib/memory/init";
import type { TSnapshot } from "@/lib/memory/types";
import { UIToolResult } from "@/hooks/use-ui-composer-simple";
import { UIRenderer } from "@/components/ui-composer-simple/ui-renderer";
import { omit } from "@/lib/utils";
import { DataToolName } from "@/lib/agent/tools/data-tools/names";
import { useNewToolCallingStream, ToolingPhase } from "@/hooks/new-tool-hook";
import { ClientOnly } from "@/components/ui/client-only";

interface CurrentTurn {
  snapshot: TSnapshot;
  uiComponents: UIToolResult[];
  id: string;
}

export default function HomePage() {
  const [query, setQuery] = useState("");
  const memoryRef = useRef<MemoryEngine | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const [history, setHistory] = useState<TSnapshot[]>([]);
  const [waitingSnapshot, setWaitingSnapshot] = useState<boolean>(false);

  const [currentSnapshot, setCurrentSnapshot] = useState<Partial<TSnapshot> | null>(null);
  const [uiComponentsBySnapshotId, setUIComponentsBySnapshotId] = useState<Record<string, any[]>>({});

  const uiTargetSnapshotIdRef = useRef<string | null>(null);

  const [dataToolStatusText, setDataToolStatusText] = useState<string | null>(null);
  const [uiToolStatusText, setUIToolStatusText] = useState<string | null>(null);


  // Data tools hook
  const dataTools = useNewToolCallingStream('/api/agent');
  const {
    toolingState: dataToolingState,
    isLoading: isDataLoading,
    assistantText,
    sendMessages: sendDataMessages,
    abort: abortDataTools,
    dataCache: dataResults,
    events: dataEvents,
    isAllToolsFinished: isAllDataToolsFinished,
    lastCompletedTool: lastDataTool,
    isFinished: isDataFinished,
    isStreamingText: isDataStreamingText
  } = dataTools;

  // UI tools hook  
  const uiTools = useNewToolCallingStream('/api/ui-composer');
  const {
    toolingState: uiToolingState,
    isLoading: isUILoading,
    sendMessages: sendUIMessages,
    abort: abortUITools,
    dataCache: uiResults,
    events: uiEvents,
    isAllToolsFinished: isAllUIToolsFinished,
    lastCompletedTool: lastUITool,
    isFinished: isUIFinished
  } = uiTools;

  const isLoading = isDataLoading || isUILoading;

  const combinedStatusText = dataToolStatusText || uiToolStatusText;

  useEffect(() => {
    initMemoryEngine()
      .then((eng) => {
        memoryRef.current = eng;
        setHistory([...(eng.getSnapshots(true) || [])]);

        eng.on('snapshot', (s) => {
          const snaps = eng.getSnapshots(true) || [];
          setHistory(snaps);
          setWaitingSnapshot(false);
        });

        eng.on('learnings', (l, d) => {
          // Learning completed
        });

      })
      .catch((err) => {
        console.error("initMemoryEngine", err);
      });

    return () => {
      abortDataTools?.();
      abortUITools?.();
      memoryRef.current?.clear();
    };

  }, []);

  // Update current snapshot as assistant text streams
  useEffect(() => {
    if (!currentSnapshot) return;

    setCurrentSnapshot(prev => prev ? {
      ...prev,
      assistant: assistantText || '',
      payload: dataResults || {},
    } : null);
  }, [assistantText, dataResults, currentSnapshot?.id]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading || waitingSnapshot) return;
    if (!memoryRef.current) return;
    const q = query.trim();

    const id = crypto.randomUUID();

    // Reset state for new query
    abortDataTools?.(); // Abort any ongoing data tools
    abortUITools?.(); // Abort any ongoing UI composition
    hasTriggeredUIRef.current = ''; // Reset UI trigger tracking

    // Clear UI components for the new query immediately
    setUIComponentsBySnapshotId(prev => ({
      ...prev,
      [id]: [], // Clear UI components for new query
    }));

    setCurrentSnapshot({
      id,
      q,
      assistant: 'Thinking...',
      payload: {},
      summary: '',
    });

    setUIComponentsBySnapshotId(prev => ({
      ...prev,
      [id]: [],
    }));

    uiTargetSnapshotIdRef.current = id;
    inputRef.current?.focus();
    setQuery("");

    const memoryContext = await memoryRef.current.buildMemoryContext(q);

    await sendDataMessages([
      {
        role: 'user',
        content: q,
      }
    ], {
      memoryContext: {
        learnings: memoryContext.learnings,
        recentSummary: memoryContext.recentSummary,
        recallSummary: memoryContext.recallSummary,
      },
      snapshots: memoryRef.current.getSnapshots(true),
    });
  };

  const commit = async () => {
    if (!memoryRef.current || !currentSnapshot) return;

    const finalSnapshot = {
      ...currentSnapshot,
      assistant: assistantText || currentSnapshot.assistant,
      payload: dataResults || currentSnapshot.payload,
    } as TSnapshot;

    memoryRef.current?.commit(finalSnapshot);
  };

  // Data tools status management
  useEffect(() => {
    switch (dataToolingState.phase) {
      case ToolingPhase.Starting: {
        setDataToolStatusText("Starting...");
        break;
      }

      case ToolingPhase.ToolsRunning: {
        // Get the currently running data tool
        const activeTools = Array.from(dataToolingState.activeTools.values());
        if (activeTools.length > 0) {
          const currentTool = activeTools[0];
          setDataToolStatusText(currentTool.label || currentTool.name);
        }

        // Show completed tool if we just finished one
        if (lastDataTool) {
          setDataToolStatusText(lastDataTool.label || lastDataTool.name);
        }
        break;
      }

      case ToolingPhase.StreamingText: {
        setDataToolStatusText("Responding...");
        break;
      }

      case ToolingPhase.Finished: {
        setDataToolStatusText(null);
        break;
      }

      case ToolingPhase.Error: {
        // Don't show manual aborts as errors - they're expected during query transitions
        if (dataToolingState.error === "Manually aborted") {
          setDataToolStatusText(null);
        } else {
          setDataToolStatusText(dataToolingState.error || "Data error occurred");
        }
        break;
      }

      case ToolingPhase.Idle:
      default: {
        setDataToolStatusText(null);
        break;
      }
    }
  }, [
    dataToolingState.phase,
    dataToolingState.activeTools,
    lastDataTool,
    dataToolingState.error
  ]);

  // UI tools status management
  useEffect(() => {
    switch (uiToolingState.phase) {
      case ToolingPhase.Starting: {
        setUIToolStatusText("Starting UI composition...");
        break;
      }

      case ToolingPhase.ToolsRunning: {
        // Get the currently running UI tool
        const activeTools = Array.from(uiToolingState.activeTools.values());
        if (activeTools.length > 0) {
          const currentTool = activeTools[0];
          setUIToolStatusText(`Generating ${currentTool.name}...`);
        }

        // Show completed UI tool if we just finished one
        if (lastUITool) {
          setUIToolStatusText(`Generated ${lastUITool.name}`);
        }
        break;
      }

      case ToolingPhase.Finished: {
        console.timeEnd('⚡ UI_COMPOSITION_TOTAL');
        console.log('✅ UI Composition Complete');
        setWaitingSnapshot(true);
        setUIToolStatusText("Memorizing...");
        console.time('💾 MEMORY_COMMIT');
        commit()
          .then(() => {
            console.timeEnd('💾 MEMORY_COMMIT');
            console.log('✅ Memory Committed');
            setUIToolStatusText(null);
          }).catch((e) => {
            console.timeEnd('💾 MEMORY_COMMIT');
            console.error('❌ Memory commit error:', e);
            setWaitingSnapshot(false);
          });
        break;
      }

      case ToolingPhase.Error: {
        // Don't show manual aborts as errors - they're expected during query transitions
        if (uiToolingState.error === "Manually aborted") {
          setUIToolStatusText(null);
        } else {
          setUIToolStatusText(uiToolingState.error || "UI error occurred");
        }
        break;
      }

      case ToolingPhase.Idle:
      default: {
        setUIToolStatusText(null);
        break;
      }
    }
  }, [
    uiToolingState.phase,
    uiToolingState.activeTools,
    lastUITool,
    uiToolingState.error
  ]);

  // Track if UI composition has been triggered for current query
  const hasTriggeredUIRef = useRef<string>('');

  // UI composition trigger OR direct memory commit
  useEffect(() => {
    if (!currentSnapshot || !currentSnapshot.id || !currentSnapshot.q) return;

    // 1. Only proceed if the data agent has fully finished its work.
    if (dataToolingState.phase !== ToolingPhase.Finished) return;

    // 2. Prevent this logic from running more than once for the same turn.
    const isAlreadyProcessed = hasTriggeredUIRef.current === currentSnapshot.id;
    if (isAlreadyProcessed) return;

    // 3. Check if any data tools (other than the query parser) were called and returned data.
    const dataForUI = omit(dataResults || {}, [DataToolName.ParseQuery]);
    const hasDataForUI = Object.keys(dataForUI).length > 0;

    // --- NEW LOGIC: Route to UI agent OR commit directly ---
    if (isAllDataToolsFinished && hasDataForUI) {
      // CASE A: We have data for the UI. Trigger the UI agent as before.
      console.log(`🎯 UI composition started for snapshot: "${currentSnapshot.id}"`);
      hasTriggeredUIRef.current = currentSnapshot.id; // Mark as processed
      sendUIMessages([], {
        query: currentSnapshot.q,
        assistantResponse: assistantText,
        dataPayload: dataForUI,
      });
    } else {
      // CASE B: No data for the UI. This was a simple text response. Commit it now.
      console.log(`✅ Data-only turn complete. Committing to memory for snapshot: "${currentSnapshot.id}"`);
      hasTriggeredUIRef.current = currentSnapshot.id; // Mark as processed
      setWaitingSnapshot(true);
      setUIToolStatusText("Memorizing..."); // Give user feedback

      commit()
        .then(() => {
          console.log('✅ Memory Committed (data-only turn)');
          setUIToolStatusText(null);
          // setWaitingSnapshot(false) is handled by the memory engine's 'snapshot' event listener
        })
        .catch((e) => {
          console.error('❌ Memory commit error (data-only turn):', e);
          setUIToolStatusText("Error saving conversation.");
          setWaitingSnapshot(false);
        });
    }

  }, [
    dataToolingState.phase,
    isAllDataToolsFinished,
    currentSnapshot,
    dataResults,
    assistantText,
    sendUIMessages,
  ]);

  // Collect UI components from completed tools in execution order
  useEffect(() => {
    const targetId = uiTargetSnapshotIdRef.current || currentSnapshot?.id;

    if (!targetId) return;
    if (uiToolingState.completedTools.size === 0) return;

    // Only collect UI results if we've actually triggered UI composition for this query
    if (hasTriggeredUIRef.current !== targetId) return;

    // Collect UI components from completed tools in execution order
    const uiComponents = Array.from(uiToolingState.completedTools.entries()).map(([toolId, toolInfo]) => ({
      id: toolId,
      name: toolInfo.name,
      result: toolInfo.result as Record<string, unknown>
    }));

    console.log(`🔄 UI Components: [${uiComponents.map(c => c.name).join(', ')}]`);

    if (uiComponents.length > 0) {
      setUIComponentsBySnapshotId(prev => ({
        ...prev,
        [targetId]: uiComponents,
      }));
    }
  }, [uiToolingState.completedTools, currentSnapshot?.id, uiToolingState.phase]);

  // Simplified rendering: just history + current snapshot (with deduplication)
  const messagesToRender = useMemo(() => {
    const messages = [...history];

    // Add current snapshot if it's not already in history
    if (currentSnapshot && !history.find(h => h.id === currentSnapshot.id)) {
      messages.push(currentSnapshot as TSnapshot);
    }

    return messages;
  }, [history, currentSnapshot]);

  // Auto-scroll to bottom when messages update (page scroll)
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messagesToRender]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Fixed composer at bottom */}
        <div className="fixed inset-x-0 bottom-0">
          <div className="max-w-2xl mx-auto p-4">
            <form onSubmit={onSubmit} className="flex gap-2">
              <Input
                className="flex-1 border-none shadow-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                placeholder="e.g., Who is Amir? / Show GitHub activity / Experience?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={isLoading || waitingSnapshot}
              />
              <Button type="submit" disabled={isLoading || waitingSnapshot || !query.trim()}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        </div>

        <div>
          <div className="space-y-6 pb-32 pr-1">
            {/* Conversation thread (history + in-progress) */}
            {messagesToRender.map((snap: any) => (
              <div key={snap.id} className="space-y-3">
                {/* User bubble (right) */}
                <div className="flex justify-end">
                  <div className="max-w-[80%] text-right">
                    {/* {snap.t ? (
                      <ClientOnly>
                        <div className="text-[11px] text-gray-400 mb-1">{new Date(snap.t).toLocaleTimeString()}</div>
                      </ClientOnly>
                    ) : null} */}
                    <div className="whitespace-pre-wrap text-base leading-relaxed">{snap.q}</div>
                  </div>
                </div>

                {/* Assistant bubble (left) */}
                <div className="flex justify-start">
                  <div className="max-w-[80%] text-left">
                    <div className="prose prose-sm max-w-none pt-4 pb-4 mb-4">
                      {
                        (snap?.assistant && String(snap.assistant).trim().length > 0)?
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {snap.assistant}
                        </ReactMarkdown>
                        :
                        dataToolStatusText && ((currentSnapshot?.id === snap.id)) && (
                          <div className="pb-2 flex items-center gap-2 text-gray-500 mb-2">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <div className="text-xs text-gray-500">{
                              dataToolStatusText
                            }</div>
                          </div>
                        )
                      }
                    </div>
                    {/* Render generated UI components if available */}
                      <div className="">
                        {
                          uiToolStatusText && ((currentSnapshot?.id === snap.id)) && (
                            <div className="pb-2 flex items-center gap-2 text-gray-500 mb-2 mt-4">
                              {
                                uiToolStatusText&&
                                <Loader2 className="h-3 w-3 animate-spin" />
                              }
                              <div className="text-xs text-gray-500">{
                                uiToolStatusText?
                                  uiToolStatusText:
                                  `Generated ${uiComponentsBySnapshotId[snap.id]?.length} UI components`
                              }</div>
                            </div>
                          )
                        }
                        {
                          uiComponentsBySnapshotId[snap.id]?.length > 0 && (
                            <UIRenderer components={uiComponentsBySnapshotId[snap.id]} />
                          )
                        }
                      </div>


                    {/* Debug info
                    {process.env.NODE_ENV === 'development' && (
                      <div className="mt-2 text-xs text-gray-400">
                        <div>Snap ID: {snap.id}</div>
                        <div>UI Count: {uiComponentsBySnapshotId[snap.id]?.length || 0}</div>
                        <div>Data Phase: {dataToolingState.phase}</div>
                        <div>Data Active: {dataToolingState.activeTools.size}</div>
                        <div>Data Completed: {dataToolingState.completedTools.size}</div>
                        <div>All Data Finished: {isAllDataToolsFinished ? 'Yes' : 'No'}</div>
                        <div>UI Phase: {uiToolingState.phase}</div>
                        <div>UI Active: {uiToolingState.activeTools.size}</div>
                        <div>UI Completed: {uiToolingState.completedTools.size}</div>
                        <div>All UI Finished: {isAllUIToolsFinished ? 'Yes' : 'No'}</div>
                        <div>Target ID: {uiTargetSnapshotIdRef.current}</div>
                        <div>Current ID: {currentSnapshot?.id}</div>
                      </div>
                    )} */}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}