export * as data from './data-tools';

import { MemoryContext } from '@/lib/memory/types';
import {
  parseQueryTool,
  getProjectsTool,
  getBioTool,
  getGithubActivityTool,
  getResumeTool,
  thinkTool,
  getTalksTool,
  whoamiTool,
} from './data-tools';

import {
  getMemoryContextTool,
  getHistoryTool,
} from './memory-tools';


import { Tool } from 'ai';

export const retrievalTools = [
  thinkTool,
  parseQueryTool,
  getProjectsTool,
  getBioTool,
  getGithubActivityTool,
  getResumeTool,
  getTalksTool,
  whoamiTool,
  // getFollowUpsTool,
]

export const retrievalToolsMap = retrievalTools.reduce((acc, tool) => {
  acc[tool.def.name] = tool.tool;
  return acc;
}, {} as Record<string, Tool<any, any>>);


export const memoryTools = [
  getMemoryContextTool,
  getHistoryTool,
];

export const memoryToolsMap = (memoryContext: MemoryContext) => memoryTools.reduce((acc, tool) => {
  acc[tool.def.name] = tool.tool(memoryContext);
  return acc;
}, {} as Record<string,  Tool<any, any>>);