import { MemoryContext } from "../memory/types";
import { PreviousTool } from "./types";
import { retrievalTools } from "./tools";
import { memoryTools } from "./tools";
import { DataToolName } from "./tools/data-tools/names";

export const recentTurnsPrompt = (memoryContext: MemoryContext) => {
  if (!memoryContext.recentSummary.length || memoryContext.recentSummary.join("\n").trim() === "") return "";
  return `
<RecentTurns>
${(memoryContext.recent || [])
      .map((turn) => (`"""\nuser: ${turn.q}\nassistant: ${turn.assistant}\n"""`))
      .join("\n")}
</RecentTurns>
`;
};

export const relavantTurnsPrompt = (memoryContext: MemoryContext) => {
  if (!memoryContext.recallSummary.length || memoryContext.recallSummary.join("\n").trim() === "") return "";
  return `
<RelevantTurnsSummary>
  ${memoryContext.recallSummary.join("\n")}
</RelevantTurnsSummary>
`;
};

export const recallTurnsPrompt = (memoryContext: MemoryContext) => {
  if (!memoryContext.recallSummary.length || memoryContext.recallSummary.join("\n").trim() === "") return "";
  return `
<RecallTurnsSummary>
  ${memoryContext.recallSummary.join("\n")}
</RecallTurnsSummary>
`;
};
  
export const userLearningPrompt = (memoryContext: MemoryContext) => {
  if (
    !memoryContext.learnings.ingestableUser 
      || memoryContext.learnings.ingestableUser.trim() === ""
    ) return "";
  return `
<UserLearning>
  ${memoryContext.learnings.ingestableUser}
</UserLearning>
`;
};

export const facetsLearningPrompt = (memoryContext: MemoryContext) => {
  if (
    !memoryContext.learnings.ingestableFacets
    || memoryContext.learnings.ingestableFacets.trim() === ""
  ) return "";
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

export const liveContextPrompt = (memoryContext: MemoryContext, previousTools: PreviousTool[] = []) => {

  const history = recentTurnsPrompt(memoryContext) + relavantTurnsPrompt(memoryContext);
  const learnings = userLearningPrompt(memoryContext) + facetsLearningPrompt(memoryContext);

  if(!history && !learnings && !previousTools.length) return "";

  return `
<LiveContext>
  ${history? `<History>\n${history}\n</History>` : ""}
  ${learnings? `<Learnings>\n${learnings}\n</Learnings>` : ""}
  ${previousTools? `<PreviousTools>\n${previousTools.join("")}\n</PreviousTools>` : ""}
</LiveContext>
`;
};

export const assistantIdentityPrompt = (): string => {

  const dataTools = retrievalTools
  .filter(tool => (
    tool.def.name !== DataToolName.Think
    && tool.def.name !== DataToolName.ParseQuery
    && tool.def.name !== DataToolName.WhoAmI
  ))
  .map(tool => `\`${tool.def.name}\` - ${tool.def.description}`);

  return `
  <PublicInfo>
  - You are an AI assistant to Amir
  - You function within the context of Amir's portfolio website 
  </PublicInfo>
  <PrivateInfo>
   - You are brave, short, and to the point. You can be fun, cynical, or ironic.
  </PrivateInfo>
  
  <YourTools>
  Your job is to help user to know Amir better. To do that you have access to the following tools:
  - ${dataTools.join(", ")}
  - ${memoryTools.map(tool => `\`${tool.def.name}\` - ${tool.def.description}`).join(", ")}
  </YourTools>

  <YourMainFeatures>
  - You have a built-in memory, you can learn, and memorize from the user's messages to improve your response.
  - You can adapt your tone and style based on the user's preferences, but your core directive is to NEVER offer unsolicited help or suggestions. You answer what is asked and use data to make your answers smart, but you do not lead the conversation.
  - You use a UI-generation agent to generate a UI based on the user's query and the data you have.
  </YourMainFeatures>
  `
}