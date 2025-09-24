export const AgentStreamEventType = {
  Start: 'start',
  StartStep: 'start-step',
  TextStart: 'text-start',
  TextDelta: 'text-delta',
  TextEnd: 'text-end',
  AssistantMessage: 'assistant-message',
  DataToolStatus: 'data-tool-status',
  DataToolResult: 'data-tool-result',
  DataToolsResultFinished: 'data-tools-result-finished',
  DataToolsResultAvailable: 'tool-output-available',
  FinishStep: 'finish-step',
  Finish: 'finish',
  Error: 'error',
  Abort:  'abort',
  Custom: 'data-custom',
} as const;

export type AgentStreamEventType = typeof AgentStreamEventType[keyof typeof AgentStreamEventType];

export const ToolCallStatus = {
  Called: 'called',
  Completed: 'completed',
} as const;

export type ToolCallStatus = typeof ToolCallStatus[keyof typeof ToolCallStatus];

export type AgentStreamEvent =
  | { type: typeof AgentStreamEventType.Start; messageId: string }
  | { type: typeof AgentStreamEventType.StartStep }
  | { type: typeof AgentStreamEventType.TextStart; id: string }
  | { type: typeof AgentStreamEventType.TextDelta; id: string; delta: string }
  | { type: typeof AgentStreamEventType.TextEnd; id: string }
  | { type: typeof AgentStreamEventType.AssistantMessage; message: any }
  | { type: typeof AgentStreamEventType.DataToolStatus; id: string; data: { name: string; status: ToolCallStatus } }
  | { type: typeof AgentStreamEventType.DataToolResult; id: string; data: { name: string; result: unknown } }
  | { type: typeof AgentStreamEventType.FinishStep }
  | { type: typeof AgentStreamEventType.Finish }
  | { type: typeof AgentStreamEventType.DataToolsResultFinished }
  | { type: typeof AgentStreamEventType.DataToolsResultAvailable }
  | { type: typeof AgentStreamEventType.Abort }
  | { type: typeof AgentStreamEventType.Error }
  | { type: typeof AgentStreamEventType.Custom; data: any }


