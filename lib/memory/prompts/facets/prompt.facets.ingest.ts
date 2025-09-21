import type { Learnings } from "../../types";

export default (facets: Learnings.Facets) => {
    return `"""
    Here are learnings so far (retrieved from memory):

    GRAPH LEARNINGS:
    <graph>
    Graph learnings (what the user has explicitly stated):
    ${JSON.stringify(facets.graph?.entities)}
    </graph>

    CONVERSATION EVOLUTION LEARNINGS:
    <conversation_evolution>
    Conversation evolution learnings (what the user has explicitly stated):
    ${JSON.stringify(facets.conversation_evolution)}
    </conversation_evolution>

    SAFETY LEARNINGS:
    <safety>
    Safety learnings (what the user has explicitly stated):
    ${JSON.stringify(facets.safety)}
    </safety>
    """
    `
}