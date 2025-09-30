import type { Learnings } from "../../types";

const toYaml = (obj: any, indent = 2): string => {
  if (!obj || Object.keys(obj).length === 0) return '';
  return Object.entries(obj)
    .map(([key, value]) => {
      const valueStr = typeof value === 'object' && value !== null 
        ? `\n${toYaml(value, indent + 2)}` 
        : ` ${value}`;
      return `${' '.repeat(indent)}${key}:${valueStr}`;
    })
    .join('\n');
};

export default (facets: Learnings.Facets) => {
    if (!facets) return "";
    const graph = toYaml(facets.graph?.entities);
    const conversation_evolution = toYaml(facets.conversation_evolution);
    const safety = toYaml(facets.safety);

    if(!graph && !conversation_evolution && !safety) return "";
    return `
${graph? `<knowledge_graph>\n${graph}\n</knowledge_graph>` : ""}
${conversation_evolution? `<conversation_evolution>\n${conversation_evolution}\n</conversation_evolution>` : ""}
${safety? `<safety>\n${safety}\n</safety>` : ""}
`;
}