import type { Learnings } from "../../types";

const toYaml = (obj: any, indent = 2): string => {
  if (!obj || Object.keys(obj).length === 0) return 'None';
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

    return `
<knowledge_graph>
  ${toYaml(facets.graph?.entities)}
</knowledge_graph>

<conversation_evolution>
  ${toYaml(facets.conversation_evolution)}
</conversation_evolution>

<safety>
  ${toYaml(facets.safety)}
</safety>
`;
}