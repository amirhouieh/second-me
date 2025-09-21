import { AgenticRag } from "@/lib/unbody/rag-pipeline/rag-pipeline"
import { NativeCollectionMap } from "@/lib/unbody/rag-pipeline/rag-pipeline.types"
import * as unbodyAgents from "@/lib/unbody/rag-pipeline/agents"

interface SearchPayload {
  query: string;
}

export async function POST(req: Request) {
  try {
    const { query } = await req.json() as SearchPayload;

    if (!query || query.trim().length === 0) {
      return new Response('Query is required', { status: 400 });
    }

    const qAgent = unbodyAgents.queryParseAgent();
    const rAgent = unbodyAgents.retrievalAgent();
    const gAgent = unbodyAgents.generativeAgent({
      promptSystem: {
        identity: {
          role: "Portfolio Assistant",
          personality: {
            tone: "professional and helpful",
            style: "clear and informative", 
            expertise: "software development and project analysis"
          },
          behavior: {
            responseStyle: "concise yet comprehensive",
            interactionStyle: "direct and actionable",
            limitations: "Focus only on the available portfolio projects"
          },
          goals: ["Help users discover relevant projects", "Provide accurate project information", "Suggest related projects when appropriate"]
        },
      }
    });

    const rag = new AgenticRag<NativeCollectionMap>({
      agents: [
        qAgent,
        rAgent,
        gAgent,
      ],
      knowledgebase: {
        collections: ["GoogleDoc"], // Changed from WebPage to GoogleDoc
        collectionConfigs: {
          GoogleDoc: {
            getDataForPrompt: (record) => {
              return `Project: ${record.title}\nSummary: ${record.autoSummary}\nKeywords: ${record.autoKeywords?.join(', ') || 'N/A'}`
            },
            fields: ["title", "autoSummary", "autoKeywords", "text", "remoteId"],
            limit: 8,
            autocut: 2,
            key: "GoogleDoc",
          }
        }
      },
    });

    const stream = rag.stream(query, {
      conversationHistory: [], // No conversation history for search
      signal: req.signal
    });

    req.signal.addEventListener("abort", () => {
      stream.cancel()
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error('Error processing search request:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}