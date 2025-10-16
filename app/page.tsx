"use client";

import React, { useRef, useState, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatInput, type ChatInputHandle } from "../components/chat-input";
import { MemoryEngine } from "@/lib/memory/engine";
import { initMemoryEngine } from "@/lib/memory/init";
import type { MemoryContext, TSnapshot } from "@/lib/memory/types";
import { UIToolResult } from "@/hooks/use-ui-composer-simple";
import { UIRenderer } from "@/components/ui-composer-simple/ui-renderer";
import { omit } from "@/lib/utils";
import { DataToolName } from "@/lib/agent/tools/data-tools/names";
import { useNewToolCallingStream, ToolingPhase } from "@/hooks/new-tool-hook";
import { ClientOnly } from "@/components/ui/client-only";
import { useStreamText } from "@/hooks/useStreamText";
import { AgentStreamEventType } from "@/lib/agent/stream-events";
import { MemoryToolNames } from "@/lib/agent/tools/memory-tools";
import { PreviousTool } from "@/lib/agent/types";

export default function HomePage() {
  const memoryRef = useRef<MemoryEngine | null>(null);
  const chatInputRef = useRef<ChatInputHandle | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [isDocked, setIsDocked] = useState(false);

  const [history, setHistory] = useState<TSnapshot[]>([]);
  const [waitingSnapshot, setWaitingSnapshot] = useState<boolean>(false);

  const [currentSnapshot, setCurrentSnapshot] = useState<Partial<TSnapshot> | null>(null);
  const [uiComponentsBySnapshotId, setUIComponentsBySnapshotId] = useState<Record<string, any[]>>({});

  const uiTargetSnapshotIdRef = useRef<string | null>(null);
  const hasStartedAssistantForIdRef = useRef<string>('');
  const hasCommittedForIdRef = useRef<string>('');

  const [dataToolStatusText, setDataToolStatusText] = useState<string | null>(null);
  const [uiToolStatusText, setUIToolStatusText] = useState<string | null>(null);

  const [previousTools, setPreviousTools] = useState<PreviousTool[]>([]);

  const memoryContextRef = useRef<MemoryContext | null>(null);

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

  const assistantStream = useStreamText({
    api: '/api/agent/respond',
  });

  // Minimal UI feedback for assistant status
  useEffect(() => {
    if (assistantStream.status === AgentStreamEventType.Start) {
      setDataToolStatusText("Responding...");
    } else if (assistantStream.status === AgentStreamEventType.TextStart) {
      setDataToolStatusText(null);
    }
  }, [assistantStream.status]);

  // Step 1 – Data tools finished -> start assistant once
  useEffect(() => {
    if (!currentSnapshot?.id || !currentSnapshot.q) return;
    if (dataToolingState.phase !== ToolingPhase.Finished) return;
    if (hasStartedAssistantForIdRef.current === currentSnapshot.id) return;

    hasStartedAssistantForIdRef.current = currentSnapshot.id;
    console.log(dataResults);
    assistantStream.send({
      messages: [{ role: 'user', content: currentSnapshot.q }],
      data: {
        memoryContext: memoryContextRef.current,
        toolResults: dataResults || {},
        previousTools,
      },
    });
  }, [dataToolingState.phase, currentSnapshot?.id, currentSnapshot?.q, dataResults, assistantStream]);

  // Step 2 – Assistant finished -> UI composition or commit
  useEffect(() => {
    if (!currentSnapshot?.id) return;
    if (assistantStream.status !== AgentStreamEventType.TextEnd) return;

    const alreadyCommitted = hasCommittedForIdRef.current === currentSnapshot.id;
    const alreadyTriggeredUI = hasTriggeredUIRef.current === currentSnapshot.id;
    if (alreadyCommitted || alreadyTriggeredUI) return;

    const dataForUI = omit(dataResults || {}, [
      DataToolName.ParseQuery, 
      DataToolName.Think,
      MemoryToolNames.GetMemoryContext,
      MemoryToolNames.GetHistory,
    ]);
    const hasDataForUI = Object.keys(dataForUI).length > 0;

    if (hasDataForUI) {
      hasTriggeredUIRef.current = currentSnapshot.id;
      setUIToolStatusText("Composing UI...");
      sendUIMessages([{
        role: 'user',
        content: currentSnapshot.q ?? '',
      }], {
        assistantResponse: assistantStream.output,
        dataToolResults: dataResults,
        memoryContext: memoryContextRef.current,
        previousTools,
      });
    } else {
      setWaitingSnapshot(true);
      setUIToolStatusText("Memorizing...");
      commit()
        .then(() => {
          setUIToolStatusText(null);
        })
        .catch((e) => {
          console.error('❌ Memory commit error:', e);
          setWaitingSnapshot(false);
        });
      hasCommittedForIdRef.current = currentSnapshot.id;
    }
  }, [assistantStream.status, assistantStream.output, currentSnapshot?.id, currentSnapshot?.q, dataResults, sendUIMessages]);

  // Step 3 – UI composition finished -> commit
  useEffect(() => {
    if (!currentSnapshot?.id) return;
    if (uiToolingState.phase !== ToolingPhase.Finished) return;
    if (hasTriggeredUIRef.current !== currentSnapshot.id) return;
    if (hasCommittedForIdRef.current === currentSnapshot.id) return;

    setWaitingSnapshot(true);
    setUIToolStatusText("Memorizing...");
    commit()
      .then(() => {
        setUIToolStatusText(null);
      })
      .catch((e) => {
        console.error('❌ Memory commit error:', e);
        setWaitingSnapshot(false);
      });
    hasCommittedForIdRef.current = currentSnapshot.id;
  }, [uiToolingState.phase, currentSnapshot?.id]);


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

  // Update current snapshot as assistant text streams (ignore data tools assistant text)
  useEffect(() => {
    if (!currentSnapshot) return;
    const showAssistant = (
      assistantStream.status === AgentStreamEventType.TextStart ||
      assistantStream.status === AgentStreamEventType.TextDelta ||
      assistantStream.status === AgentStreamEventType.TextEnd
    );

    setCurrentSnapshot(prev => prev ? {
      ...prev,
      assistant: showAssistant ? (assistantStream.output || '') : (prev.assistant || ''),
      payload: dataResults || {},
    } : null);
  }, [assistantStream.output, assistantStream.status, dataResults, currentSnapshot?.id]);

  const handleSubmit = async (q: string) => {
    if (!q.trim() || isLoading || waitingSnapshot) return;
    if (!memoryRef.current) return;
    if (!isDocked) setIsDocked(true);

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
      assistant: '',
      payload: {},
      summary: '',
    });

    setUIComponentsBySnapshotId(prev => ({
      ...prev,
      [id]: [],
    }));

    uiTargetSnapshotIdRef.current = id;
    chatInputRef.current?.focus();

    const memoryContext = await memoryRef.current.buildMemoryContext(q);
    memoryContextRef.current = memoryContext;

    console.log("🔄 Memory Context for id", id);
    console.log(JSON.stringify(memoryContext, null, 2));
    console.log("🔄 Memory Context:");

    await sendDataMessages([
      {
        role: 'user',
        content: q,
      }
    ], {
      memoryContext,
      snapshots: memoryRef.current.getSnapshots(true),
      previousTools,
    });
  };

  const commit = async () => {
    if (!memoryRef.current || !currentSnapshot) return;

    const finalSnapshot = {
      ...currentSnapshot,
      assistant: assistantStream.output || assistantText || currentSnapshot.assistant,
      payload: {
        dataTools: omit(dataResults, [
          DataToolName.ParseQuery, 
          DataToolName.Think,
        ]),
        uiTools: uiResults,
      },
    } as TSnapshot;

    console.log("Before Commit--------------------------------")
    console.log('🔄 Final Snapshot: ', currentSnapshot.id, new Date().toISOString());
    console.log(JSON.stringify(finalSnapshot, null, 2));
    console.log('🔄 Final Snapshot:');
    console.log("--------------------------------")
    memoryRef.current?.commit(finalSnapshot);
  };

  const addPreviousTool = (tool: string, type: string) => {
    if(!tool) return;
    if(tool === DataToolName.ParseQuery || tool === DataToolName.Think) return;

    const existingTool = previousTools.find(t => t.key === tool);
    if (existingTool) {
      setPreviousTools(prev => prev.map(t => t.key === tool ? { ...t, count: t.count + 1 } : t));
    } else {
      setPreviousTools(prev => [...prev, { key: tool, type, count: 1 }]);
    }
  }

  // Data tools status management
  useEffect(() => {
    console.log("dataToolingState", dataToolingState, dataResults);
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

        addPreviousTool(lastDataTool?.name || '', 'data-tool');
        break;
      }

      case ToolingPhase.StreamingText: {
        break;
      }

      case ToolingPhase.Finished: {
        // setDataToolStatusText(null);
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
        addPreviousTool(lastUITool?.name || '', 'ui-tool');
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

  // Legacy effect disabled; orchestration handled above
  useEffect(() => {}, [
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

  const shouldDock = isDocked;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto space-y-4">
        <AnimatePresence initial={true}>
          {!shouldDock && (
            <motion.div
              key="centered-input"
              layoutId="chat-input"
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 40 }}
              className="fixed inset-0 flex items-center justify-center p-4 z-40"
            >
              <div className="w-full max-w-2xl">
                <ChatInput
                  ref={chatInputRef}
                  onSubmit={handleSubmit}
                  disabled={isLoading || waitingSnapshot}
                />
              </div>
            </motion.div>
          )}

          {shouldDock && (
            <motion.div
              key="docked-input"
              layoutId="chat-input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 400, damping: 40 }}
              className="fixed inset-x-0 bottom-0 z-40"
            >
              <div className="max-w-2xl mx-auto p-4">
                <ChatInput
                  ref={chatInputRef}
                  onSubmit={handleSubmit}
                  disabled={isLoading || waitingSnapshot}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div>
          <div className="space-y-6 pb-32 pr-1">
            {/* Conversation thread (history + in-progress) */}
            {messagesToRender.map((snap: any) => (
              <div key={snap.id} className="space-y-3">
                {/* User bubble (right) */}
                <div className="flex justify-end">
                  <div className="max-w-[80%] text-right">
                    <div className="whitespace-pre-wrap text-base leading-relaxed">{snap.q}</div>
                  </div>
                </div>

                {/* Assistant bubble (left) */}
                <div className="flex justify-start">
                  <div className="w-full text-left">
                    <div className="prose prose-sm max-w-none pt-4 pb-4 mb-4">
                      {
                        (snap?.assistant && String(snap.assistant).trim().length > 0) ? (
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {snap.assistant}
                          </ReactMarkdown>
                        ) : (
                          (currentSnapshot?.id === snap.id) && (
                            <div className="pb-2 flex items-center gap-2 text-gray-500 mb-2">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <div className="text-xs text-gray-500">{
                                dataToolStatusText || 'Thinking...'
                              }</div>
                            </div>
                          )
                        )
                      }
                    </div>
                    {/* Render generated UI components if available */}
                    <div className="w-full">
                      {
                        uiToolStatusText && ((currentSnapshot?.id === snap.id)) && (
                          <div className="pb-2 flex items-center gap-2 text-gray-500 mb-2 mt-4">
                            {
                              uiToolStatusText &&
                              <Loader2 className="h-3 w-3 animate-spin" />
                            }
                            <div className="text-xs text-gray-500">{
                              uiToolStatusText ?
                                uiToolStatusText :
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