export * as data from './data-tools';

import {
  parseQueryTool,
  getProjectsTool,
  getBioTool,
  getGithubActivityTool,
  getResumeTool,
  // getResumeMetaTool,
  // uiComposerTool,
  getFollowUpsTool,
} from './data-tools';

import { Tool } from 'ai';

export const retrievalTools = [
  parseQueryTool,
  getProjectsTool,
  getBioTool,
  getGithubActivityTool,
  getResumeTool,
  // getResumeMetaTool,
  getFollowUpsTool,
]

export const retrievalToolsMap = retrievalTools.reduce((acc, tool) => {
  acc[tool.def.name] = tool.tool;
  return acc;
}, {} as Record<string, Tool<any, any>>);