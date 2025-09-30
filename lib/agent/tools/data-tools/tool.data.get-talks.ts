import { z } from "zod";
import { tool as createTool } from "ai";
import { DataToolName } from './names';

// Input is optional; allow filtering by concepts or max count if needed later
export const inputSchema = z.object({
  concepts: z.array(z.string()).optional().describe("Optional keywords to filter talks by topic or title"),
  count: z.number().min(1).max(20).default(10).describe("Maximum number of talks to return"),
});

export const talkSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  publication_date: z.string(),
  views: z.number(),
  description: z.string(),
  topics: z.array(z.string()),
});

export const outputSchema = z.object({
  channel_name: z.literal("Unbody"),
  videos: z.array(talkSchema),
});

export type TInput = z.infer<typeof inputSchema>;
export type TOutput = z.infer<typeof outputSchema>;

export const def = {
  name: DataToolName.GetTalks,
  description: (`
Get a list of Amir's talks, presentations, and workshops from the Youtube.
call this tool when user asks about 
- Amir's talks, presentations, or workshops.
- Anything related to dev rel, developer advocacy, developer relations, or developer experience, or open source or AI. 
- Anything related to AI-native apps, or AI-native development, or AI-native products, or AI-native solutions, or AI-native architecture, or AI-native development, or AI-native products, or AI-native solutions, or AI-native architecture.
`),
  label: "Gathering talks…",
  doneLabel: "Talks ready",
  inputSchema,
  outputSchema,
};

const DATASET: TOutput = {
  channel_name: "Unbody",
  videos: [
    {
      title: "Unbody demo dec 2024 - the first AI-native development stack",
      url: "https://www.youtube.com/watch?v=PSPAFVfIv-A",
      publication_date: "2024-12-10",
      views: 439,
      description: "In this video, Amir Houieh co-founder and CEO of Unbody.io demonstrates a few use cases and projects developed using Unbody and how developers can use them to build AI-native products or embed AI features.",
      topics: ["AI-native", "development stack", "demo", "APIs", "SDKs"],
    },
    {
      title: "AI is complex — Don’t try this in-house!",
      url: "https://www.youtube.com/watch?v=swDatZwbZQs",
      publication_date: "2024-09-17",
      views: 165,
      description: "More and more founders are coming to realize that AI isn’t just a buzzword—it’s a necessity. If you're running a SaaS business today, you're likely feeling the pressure too. Thanks to tools like ChatGPT, they no longer want information; they want answers, and they want them instantly. This shift in expectations means AI isn’t optional anymore—it’s essential. But how should you approach this? What tools and expertise do you need? And where do you start? These are the questions I will be addressing in my presentation.",
      topics: ["AI", "SaaS", "in-house development", "AI integration"],
    },
    {
      title: "What the F**k is an AI-native app and how to build one.",
      url: "https://www.youtube.com/watch?v=-ypE9IidC4E",
      publication_date: "2024-08-14",
      views: 180,
      description: "AI is complex, do not try in-house. In this talk, Amir Houieh, the CEO at Unbody.io, explains the characteristics of AI-native apps and solutions, what they are, and what it takes to build them. Furthermore, he explains behind the scenes of RAG in a non-ai manner and demos a few AI-native use cases built using Unbody with one line of code.",
      topics: ["AI-native app", "RAG", "AI development"],
    },
    {
      title: "AI Study Assistant Workshop trim",
      url: "https://www.youtube.com/watch?v=P4Wx-nnChIA",
      publication_date: "2024-06-06",
      views: 112,
      description: "From PDFs to videos, from semantic search to rerankers—learn how to build an AI-native assistant powered by RAG without even knowing what RAG is, all in 2 hours.",
      topics: ["AI assistant", "workshop", "RAG", "semantic search"],
    },
    {
      title: "How I built an AI search over my messy desktop files in 4 minutes 🫣",
      url: "https://www.youtube.com/watch?v=OikfiKbT48k",
      publication_date: "2024-05-23",
      views: 241,
      description: "Is your desktop folder a mess? Mine definitely is, so I built a quick AI app to search through it using Unbody.io. Check out the code in the comments! 🤯😁 Want to learn how to develop similar apps? Join our online workshop on June 5.",
      topics: ["AI search", "desktop files", "RAG", "API", "AI development"],
    },
    {
      title: "What is an AI-native app?",
      url: "https://www.youtube.com/watch?v=0hx-iuLKdx0",
      publication_date: "2024-05-14",
      views: 310,
      description: "A presentation and a live demo by Amir Houieh about what an AI-native app is and how to build one using Unbody. Soon the \"AI-first\" will become the new \"Mobile-first\". Chatbots, semantic search, generative UI and more will become a standard in every website and app. In this talk, Amir talk about how every developer can be part of this paradigm shift. This talk was given at the React Dublin meetup at MongoDB Dublin office in May 2024.",
      topics: ["AI-native app", "live demo", "chatbots", "semantic search", "generative UI"],
    },
    {
      title: "Unbody advanced AI for private data, from anywhere and in any formats, via one touchpoint.",
      url: "https://www.youtube.com/watch?v=FP1NJuP7CQI",
      publication_date: "2024-02-15",
      views: 246,
      description: "Unbody is a damn easy API for advanced AI, from chatbots to generative search, for your private data—whether it's on Google Drive or Slack, in any format from PDFs to spreadsheets to videos—all via a single GraphQl touchpoint.",
      topics: ["AI", "private data", "API", "GraphQL", "generative search"],
    },
    {
      title: "Diving Into AI with JavaScript Made Easy",
      url: "https://www.youtube.com/watch?v=pjHDE3maXvE",
      publication_date: "2024-02-09",
      views: 243,
      description: "This is our first-ever live demo that took place on Feb 2024 at the Eindhoven JS community on how to get started with AI in JavaScript using Unbody. It's all about making AI fun and accessible, no matter your skill level. Here’s what we covered: Setting up your project and linking data to Unbody, Simple ways to pull data, Doing cool stuff with semantic and generative search. Heads up, not everything went as planned 🙈. We missed out on visual search and playing with audio/video this time. But hey, that’s how we learn, right? Stick around for more AI adventures and let’s crack the code together. Drop your thoughts and questions below – can’t wait to hear from you!",
      topics: ["AI", "JavaScript", "live demo", "semantic search", "generative search"],
    },
  ],
};

export const tool = createTool<TInput, TOutput>({
  description: def.description,
  inputSchema: def.inputSchema,
  async execute({ concepts, count }) {
    const items = DATASET.videos.filter(v => {
      if (!concepts || concepts.length === 0) return true;
      const hay = (v.title + " " + v.description + " " + v.topics.join(" ")).toLowerCase();
      return concepts.some(c => hay.includes(c.toLowerCase()));
    }).slice(0, count);

    return def.outputSchema.parse({ channel_name: DATASET.channel_name, videos: items });
  },
});

