import { z } from 'zod';
import { tool as createTool } from 'ai';

export const layoutSkeletonSchema = z.object({
  skeletons: z.array(z.object({
    id: z.string().describe("A unique identifier for this skeleton area, e.g., 'user-bio' or 'project-card-1'."),
    gridArea: z.string().describe("CSS grid-area format: 'row-start / col-start / row-end / col-end'"),
    type: z.enum(['card', 'heading', 'paragraph', 'avatar', 'image']).describe("A hint for what kind of skeleton loader to display."),
  })),
});

export const layoutSkeletonTool = createTool({
  description: 'Use this tool FIRST to instantly draw a skeleton layout. This provides immediate visual feedback to the user before the full content is ready. Assign a unique, semantic `id` to each skeleton piece.',
  inputSchema: layoutSkeletonSchema,
  async execute(input) {
    return input;
  },
});

export const displayHeadingSchema = z.object({
  skeletonId: z.string().describe("The ID of the skeleton this component will replace."),
  level: z.number().int().min(1).max(6),
  text: z.string(),
  className: z.string().optional(),
});

export const displayHeadingTool = createTool({
  description: 'Display a heading (h1-h6). Must target a skeleton `id`.',
  inputSchema: displayHeadingSchema,
  async execute(input) {
    return input;
  },
});

export const displayTextSchema = z.object({
  skeletonId: z.string().describe("The ID of the skeleton this component will replace."),
  content: z.string(),
  variant: z.enum(['paragraph', 'lead', 'large', 'small', 'muted']).default('paragraph'),
  className: z.string().optional(),
});

export const displayTextTool = createTool({
  description: 'Display text with various styles. Must target a skeleton `id`.',
  inputSchema: displayTextSchema,
  async execute(input) {
    return input;
  },
});

export const displayCardSchema = z.object({
  skeletonId: z.string().describe("The ID of the skeleton this component will replace."),
  title: z.string().optional(),
  content: z.string(),
  className: z.string().optional(),
});

export const displayCardTool = createTool({
  description: 'Display a simple card with a title and content. Must target a skeleton `id`.',
  inputSchema: displayCardSchema,
  async execute(input) {
    return input;
  },
});

export const displayBadgeSchema = z.object({
  skeletonId: z.string().describe("The ID of the skeleton this component will replace. Often used inside composite components."),
  text: z.string(),
  variant: z.enum(['default', 'secondary', 'destructive', 'outline']).default('default'),
  className: z.string().optional(),
});

export const displayBadgeTool = createTool({
  description: 'Display a label or tag. Must target a skeleton `id`.',
  inputSchema: displayBadgeSchema,
  async execute(input) {
    return input;
  },
});

export const displayAvatarBadgeSchema = z.object({
  skeletonId: z.string().describe("The ID of the skeleton this component will replace."),
  src: z.string(),
  alt: z.string(),
  fallback: z.string(),
  size: z.enum(['sm', 'md', 'lg']).default('md'),
  className: z.string().optional(),
});

export const displayAvatarBadgeTool = createTool({
  description: 'Display a user or project avatar. Must target a skeleton `id`.',
  inputSchema: displayAvatarBadgeSchema,
  async execute(input) {
    return input;
  },
});

export const displayImageSchema = z.object({
  skeletonId: z.string().describe("The ID of the skeleton this component will replace."),
  src: z.string(),
  alt: z.string().optional().default('alt'),
  size: z.enum(['sm', 'md', 'lg']).default('md'),
  className: z.string().optional(),
});

export const displayImageTool = createTool({
  description: 'Display an image or picture. Must target a skeleton `id`.',
  inputSchema: displayImageSchema,
  async execute(input) {
    return input;
  },
});

export const displayProjectCardSchema = z.object({
    skeletonId: z.string().describe("The ID of the skeleton this project card will replace."),
    title: z.string(),
    description: z.string(),
    imageUrl: z.string(),
    technologies: z.array(z.string()).describe("A list of technologies used in the project, which will be rendered as badges."),
});

export const displayProjectCardTool = createTool({
    description: "Display a self-contained card for a single project. This is preferred for complex items over the simple `displayCard`.",
    inputSchema: displayProjectCardSchema,
    async execute(input) {
        return input;
    }
});

export const atomicUITools = {
  layoutSkeleton: layoutSkeletonTool,
  displayHeading: displayHeadingTool,
  displayText: displayTextTool,
  displayCard: displayCardTool,
  displayBadge: displayBadgeTool,
  displayAvatarBadge: displayAvatarBadgeTool,
  displayImage: displayImageTool,
  displayProjectCard: displayProjectCardTool,
};

export type LayoutSkeletonProps = z.infer<typeof layoutSkeletonSchema>;
export type DisplayHeadingProps = z.infer<typeof displayHeadingSchema>;
export type DisplayTextProps = z.infer<typeof displayTextSchema>;
export type DisplayCardProps = z.infer<typeof displayCardSchema>;
export type DisplayBadgeProps = z.infer<typeof displayBadgeSchema>;
export type DisplayAvatarBadgeProps = z.infer<typeof displayAvatarBadgeSchema>;
export type DisplayImageProps = z.infer<typeof displayImageSchema>;
export type DisplayProjectCardProps = z.infer<typeof displayProjectCardSchema>;