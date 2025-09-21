import { unbody } from "@/lib/unbody/unbody.clients";
import { IImageBlock } from "unbody";

export interface Project {
  slug: string;
  title: string;
  summary: string;
  keywords: string[];
  content: string;
  id: string;
  url?: string;
  images: IImageBlock[];
  thumbnail: IImageBlock | null;
}


/**
 * Get all projects from Google Docs via Unbody
 */
export async function getProjects(): Promise<Project[]> {
  try {
    const { data: { payload: googleDocs } } = await unbody.get
      .googleDoc
      .select("title", "autoSummary", "autoKeywords", "text", "remoteId", "slug", "blocks.ImageBlock.url", "blocks.ImageBlock.width", "blocks.ImageBlock.height")
      .exec();

    return googleDocs.map((doc: any) => ({
      slug: String(doc.slug || 'untitled'),
      title: String(doc.title || 'Untitled Project'),
      summary: String(doc.autoSummary || 'No summary available'),
      keywords: Array.isArray(doc.autoKeywords) ? doc.autoKeywords : [],
      content: String(doc.text || ''),
      id: String(doc.remoteId || ''),
      url: undefined,
      images: (doc.blocks as any)?.ImageBlock || [],
      thumbnail: (doc.blocks as any)?.ImageBlock?.[0] || null
    }));
  } catch (error) {
    console.error('Error fetching projects:', error);
    return [];
  }
}

/**
 * Get a single project by slug - optimized direct query
 */
export async function getProjectBySlug(slug: string): Promise<Project | null> {
  try {
    const { data: { payload: googleDocs } } = await unbody.get
      .googleDoc
      .where({ slug: slug })
      .select(
        "title", 
        "autoSummary", 
        "autoKeywords", 
        "text", 
        "remoteId", 
        "slug",
        "blocks.ImageBlock.url",
        "blocks.ImageBlock.width",
        "blocks.ImageBlock.height"
      )
      .limit(1)
      .exec();

    if (googleDocs.length === 0) return null;

    const doc = googleDocs[0];
    return {
      slug: String(doc.slug || 'untitled'),
      title: String(doc.title || 'Untitled Project'),
      summary: String(doc.autoSummary || 'No summary available'),
      keywords: Array.isArray(doc.autoKeywords) ? doc.autoKeywords : [],
      content: String(doc.text || ''),
      id: String(doc.remoteId || ''),
      url: undefined,
      images: (doc.blocks as any)?.ImageBlock || [],
      thumbnail: (doc.blocks as any)?.ImageBlock?.[0] || null
    };
  } catch (error) {
    console.error('Error fetching project by slug:', error);
    return null;
  }
}

/**
 * Get project slugs for static generation - optimized to fetch only slugs
 */
export async function getProjectSlugs(): Promise<string[]> {
  try {
    const { data: { payload: googleDocs } } = await unbody.get
      .googleDoc
      .select("slug")
      .exec();

    return googleDocs
      .map((doc: any) => String(doc.slug))
      .filter((slug: string) => slug && slug !== 'undefined'); // Remove any null/undefined slugs
  } catch (error) {
    console.error('Error fetching project slugs:', error);
    return [];
  }
}
