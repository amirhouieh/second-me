import { MemoryContext } from "../memory/types";
import { PreviousTool } from "./types";


export const recentTurnsPrompt = (memoryContext: MemoryContext) => {
    if (!memoryContext.recentSummary.length) return "";
    return `
    <RecentTurns>
      ${(memoryContext.recent || [])
        .map((turn) => (`"""user: ${turn.q}\nassistant: ${turn.assistant}"""`))
        .join("\n\n")}
    </RecentTurns>
    `;
};

export const relavantTurnsPrompt = (memoryContext: MemoryContext) => {
    if (!memoryContext.recallSummary.length) return "";
    return `
    <RelevantTurnsSummary>
      ${memoryContext.recallSummary.join("\n")}
    </RelevantTurnsSummary>
    `;
};

export const userLearningPrompt = (memoryContext: MemoryContext) => {
    if (!memoryContext.learnings.ingestableUser) return "";
    return `
    <UserLearning>
      ${memoryContext.learnings.ingestableUser}
    </UserLearning>
    `;
};

export const facetsLearningPrompt = (memoryContext: MemoryContext) => {
    if (!memoryContext.learnings.ingestableFacets) return "";
    return `
    <FacetsLearning>
      ${memoryContext.learnings.ingestableFacets}
    </FacetsLearning>
    `;
};

export const activeTaskPrompt = (memoryContext: MemoryContext) => {
    if (!memoryContext.activeTask) return "";
    return `
    <ActiveTask>
      ${memoryContext.activeTask?.state}
    </ActiveTask>
    `;
};


export const previousDataTools = (previousTools: PreviousTool[]) => {
    return `
    <PreviousTools>
      ${previousTools.map(tool => `\`${tool.key}\` - ${tool.type} (called ${tool.count} times)`).join(", ")}
    </PreviousTools>
    `;
}

export const liveContextPrompt = (memoryContext: MemoryContext, previousTools: PreviousTool[]) => {
    return `
  <LiveContext>
    <History>   
        ${recentTurnsPrompt(memoryContext)}
        ${relavantTurnsPrompt(memoryContext)}
    </History>
    <Learnings>
      ${userLearningPrompt(memoryContext)}
      ${facetsLearningPrompt(memoryContext)}
    </Learnings>
    <PreviousTools>
      ${previousDataTools(previousTools)}
    </PreviousTools>
  </LiveContext>
  `;
};