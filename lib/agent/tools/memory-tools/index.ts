export * as getMemoryContextTool from './tool.memory.get-context';
export * as getHistoryTool from './tool.memory.get-history';

export const MemoryToolNames = {
    GetMemoryContext: 'getMemoryContext',
    GetHistory: 'getHistory',
} as const;

export type MemoryToolName = typeof MemoryToolNames[keyof typeof MemoryToolNames];