"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, User, Briefcase, Calendar } from "lucide-react";
import { unbodyClient } from "@/lib/unbody/unbody.client";
import { z } from "zod";

// Types
interface Project {
  title: string;
  summary: string;
  keywords: string[];
  content: string;
}

// Enhanced Component Schemas
const toolSchemas = {
  render_text: z.object({
    content: z.string().describe("The conversational text response to display"),
    tone: z.enum(["casual", "professional", "technical"]).default("casual"),
    style: z.enum(["normal", "highlight", "quote", "callout"]).default("normal").describe("Visual style of text"),
    size: z.enum(["small", "medium", "large"]).default("medium").describe("Text size")
  }),
  
  show_projects: z.object({
    projects: z.array(z.object({
      title: z.string(),
      summary: z.string(),
      keywords: z.array(z.string())
    })).describe("Array of projects to display"),
    count: z.number().min(1).max(6).default(3).describe("Number of projects to show"),
    layout: z.enum(["grid", "carousel", "timeline", "masonry"]).default("grid").describe("How to display projects"),
    filter: z.string().optional().describe("Technology or domain filter applied")
  }),
  
  show_resume: z.object({
    focus: z.enum(["experience", "skills", "education"]).default("experience").describe("What aspect of resume to highlight"),
    message: z.string().optional().describe("Custom message about the resume")
  }),

  // NEW: Rich Media Components
  show_hero_section: z.object({
    title: z.string().describe("Main headline"),
    subtitle: z.string().describe("Supporting text"),
    background: z.enum(["gradient", "image", "video", "minimal"]).default("gradient").describe("Background style"),
    cta: z.string().optional().describe("Call to action text")
  }),

  show_media_showcase: z.object({
    type: z.enum(["images", "video", "demo", "interactive"]).describe("Type of media to show"),
    context: z.string().describe("Context like 'computer-vision', 'web-development', etc"),
    layout: z.enum(["gallery", "spotlight", "comparison", "before-after"]).default("gallery").describe("How to present media"),
    caption: z.string().optional().describe("Caption or explanation")
  }),

  show_skills_matrix: z.object({
    domain: z.string().describe("Skill domain like 'computer-vision', 'web-development', 'ai-ml'"),
    style: z.enum(["radar", "bars", "cloud", "timeline"]).default("bars").describe("Visualization style"),
    highlight: z.array(z.string()).optional().describe("Skills to emphasize")
  }),

  show_interactive_demo: z.object({
    type: z.enum(["code-preview", "live-demo", "comparison", "workflow"]).describe("Type of demo"),
    context: z.string().describe("What the demo showcases"),
    data: z.any().optional().describe("Demo-specific data")
  }),

  create_layout_composition: z.object({
    layout: z.enum(["split-screen", "hero-content", "grid-showcase", "timeline-story", "magazine"]).describe("Overall page layout"),
    sections: z.array(z.string()).describe("Order of components in the layout"),
    theme: z.enum(["minimal", "tech", "creative", "professional"]).default("minimal").describe("Visual theme")
  })
};

// Enhanced Component Definitions
const TextComponent = ({ content, tone, style, size }: z.infer<typeof toolSchemas.render_text>) => {
  const baseClasses = "rounded-lg transition-all duration-300";
  const toneClasses = {
    professional: 'bg-blue-50 border-l-4 border-blue-400',
    technical: 'bg-gray-50 border-l-4 border-gray-400 font-mono',
    casual: 'bg-green-50 border-l-4 border-green-400'
  };
  const styleClasses = {
    normal: 'p-4',
    highlight: 'p-6 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200',
    quote: 'p-4 italic border-l-4 bg-slate-50',
    callout: 'p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 shadow-sm'
  };
  const sizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg font-medium'
  };

  return (
    <div className={`${baseClasses} ${toneClasses[tone]} ${styleClasses[style]}`}>
      <p className={`text-gray-800 leading-relaxed ${sizeClasses[size]}`}>{content}</p>
    </div>
  );
};

const ProjectsComponent = ({ projects, count, layout, filter }: z.infer<typeof toolSchemas.show_projects>) => {
  const layoutClasses = {
    grid: "grid grid-cols-1 md:grid-cols-2 gap-4",
    carousel: "flex gap-4 overflow-x-auto pb-4",
    timeline: "space-y-6 relative before:absolute before:left-4 before:top-0 before:h-full before:w-0.5 before:bg-gray-200",
    masonry: "columns-1 md:columns-2 gap-4 space-y-4"
  };

  return (
    <div>
      {filter && (
        <div className="mb-4">
          <Badge variant="secondary" className="mb-2">Filtered by: {filter}</Badge>
        </div>
      )}
      <div className={layoutClasses[layout]}>
        {projects.slice(0, count).map((project, idx) => (
          <Card key={idx} className={`hover:shadow-md transition-all duration-300 ${layout === 'timeline' ? 'ml-8 relative before:absolute before:-left-6 before:top-4 before:w-2 before:h-2 before:bg-blue-500 before:rounded-full' : ''}`}>
            <CardHeader>
              <CardTitle className="text-lg">{project.title}</CardTitle>
              <CardDescription className="line-clamp-2">{project.summary}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {project.keywords.slice(0, 3).map((keyword, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{keyword}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

const ResumeComponent = ({ focus, message }: z.infer<typeof toolSchemas.show_resume>) => {
  const mockData = {
    experience: [
      { title: "Senior Software Engineer", company: "Tech Corp", period: "2022-Present", description: "Leading AI/ML projects and full-stack development" },
      { title: "Software Developer", company: "StartupXYZ", period: "2020-2022", description: "Built scalable web applications using React and Node.js" }
    ],
    skills: ["JavaScript", "TypeScript", "React", "Node.js", "Python", "AI/ML", "PostgreSQL", "AWS"],
    education: [
      { degree: "Computer Science", school: "University of Tech", year: "2020" }
    ]
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {focus === 'experience' && <Briefcase className="h-5 w-5" />}
          {focus === 'skills' && <User className="h-5 w-5" />}
          {focus === 'education' && <Calendar className="h-5 w-5" />}
          Resume - {focus.charAt(0).toUpperCase() + focus.slice(1)}
        </CardTitle>
        {message && <CardDescription>{message}</CardDescription>}
      </CardHeader>
      <CardContent>
        {focus === 'experience' && (
          <div className="space-y-4">
            {mockData.experience.map((exp, idx) => (
              <div key={idx} className="border-l-2 border-blue-200 pl-4">
                <h4 className="font-semibold">{exp.title}</h4>
                <p className="text-sm text-gray-600">{exp.company} • {exp.period}</p>
                <p className="text-sm mt-1">{exp.description}</p>
              </div>
            ))}
          </div>
        )}
        
        {focus === 'skills' && (
          <div className="flex flex-wrap gap-2">
            {mockData.skills.map((skill, idx) => (
              <Badge key={idx} variant="secondary">{skill}</Badge>
            ))}
          </div>
        )}
        
        {focus === 'education' && (
          <div>
            {mockData.education.map((edu, idx) => (
              <div key={idx}>
                <h4 className="font-semibold">{edu.degree}</h4>
                <p className="text-sm text-gray-600">{edu.school} • {edu.year}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// NEW: Rich Media Components
const HeroSectionComponent = ({ title, subtitle, background, cta }: z.infer<typeof toolSchemas.show_hero_section>) => {
  const backgroundClasses = {
    gradient: "bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800",
    image: "bg-gradient-to-br from-gray-900 to-gray-700",
    video: "bg-black",
    minimal: "bg-white border border-gray-200"
  };

  return (
    <div className={`${backgroundClasses[background]} rounded-xl p-8 md:p-12 text-center ${background === 'minimal' ? 'text-gray-900' : 'text-white'}`}>
      <h1 className="text-3xl md:text-5xl font-bold mb-4">{title}</h1>
      <p className={`text-lg md:text-xl mb-6 ${background === 'minimal' ? 'text-gray-600' : 'text-white/90'}`}>
        {subtitle}
      </p>
      {cta && (
        <Button size="lg" className={background === 'minimal' ? '' : 'bg-white text-gray-900 hover:bg-gray-100'}>
          {cta}
        </Button>
      )}
    </div>
  );
};

const MediaShowcaseComponent = ({ type, context, layout, caption }: z.infer<typeof toolSchemas.show_media_showcase>) => {
  // Mock media data based on context
  const getMediaContent = () => {
    const contextData = {
      'computer-vision': {
        images: [
          { src: '/api/placeholder/400/300', alt: 'Object Detection Demo', title: 'Real-time Object Detection' },
          { src: '/api/placeholder/400/300', alt: 'Face Recognition', title: 'Face Recognition System' },
          { src: '/api/placeholder/400/300', alt: 'Image Segmentation', title: 'Semantic Segmentation' }
        ],
        video: { src: '/api/placeholder/video', title: 'Computer Vision Pipeline Demo' }
      },
      'web-development': {
        images: [
          { src: '/api/placeholder/400/300', alt: 'React Dashboard', title: 'Modern React Dashboard' },
          { src: '/api/placeholder/400/300', alt: 'Mobile App', title: 'Responsive Mobile Design' }
        ]
      }
    };
    return contextData[context as keyof typeof contextData] || contextData['computer-vision'];
  };

  const mediaContent = getMediaContent();

  if (type === 'images') {
    const layoutClasses = {
      gallery: "grid grid-cols-1 md:grid-cols-3 gap-4",
      spotlight: "flex flex-col items-center",
      comparison: "grid grid-cols-1 md:grid-cols-2 gap-4",
      'before-after': "relative overflow-hidden rounded-lg"
    };

    return (
      <div className="space-y-4">
        {caption && <p className="text-gray-600 text-center">{caption}</p>}
        <div className={layoutClasses[layout]}>
          {mediaContent.images?.map((img, idx) => (
            <div key={idx} className="relative group overflow-hidden rounded-lg bg-gray-100 aspect-video">
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-2 left-2 right-2 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="font-medium">{img.title}</p>
              </div>
              {/* Placeholder for actual image */}
              <div className="w-full h-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                <span className="text-gray-500">{img.alt}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'video') {
    return (
      <div className="space-y-4">
        {caption && <p className="text-gray-600 text-center">{caption}</p>}
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-0 h-0 border-l-[12px] border-l-white border-y-[8px] border-y-transparent ml-1" />
              </div>
              <p className="text-lg font-medium">{mediaContent.video?.title || 'Video Demo'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <div className="p-4 bg-gray-100 rounded-lg text-center">Interactive {type} component for {context}</div>;
};

const SkillsMatrixComponent = ({ domain, style, highlight }: z.infer<typeof toolSchemas.show_skills_matrix>) => {
  const skillsData = {
    'computer-vision': [
      { name: 'OpenCV', level: 90 },
      { name: 'TensorFlow', level: 85 },
      { name: 'PyTorch', level: 80 },
      { name: 'YOLO', level: 75 },
      { name: 'Image Processing', level: 95 }
    ],
    'web-development': [
      { name: 'React', level: 95 },
      { name: 'TypeScript', level: 90 },
      { name: 'Node.js', level: 85 },
      { name: 'Next.js', level: 88 },
      { name: 'GraphQL', level: 70 }
    ],
    'ai-ml': [
      { name: 'Machine Learning', level: 85 },
      { name: 'Deep Learning', level: 80 },
      { name: 'NLP', level: 75 },
      { name: 'Data Science', level: 82 }
    ]
  };

  const skills = skillsData[domain as keyof typeof skillsData] || skillsData['web-development'];

  if (style === 'bars') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="capitalize">{domain.replace('-', ' ')} Skills</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {skills.map((skill, idx) => (
            <div key={idx} className="space-y-2">
              <div className="flex justify-between">
                <span className={`font-medium ${highlight?.includes(skill.name) ? 'text-blue-600' : ''}`}>
                  {skill.name}
                </span>
                <span className="text-sm text-gray-500">{skill.level}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-1000 ${highlight?.includes(skill.name) ? 'bg-blue-500' : 'bg-gray-400'}`}
                  style={{ width: `${skill.level}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (style === 'cloud') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="capitalize">{domain.replace('-', ' ')} Skills</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill, idx) => (
              <Badge 
                key={idx} 
                variant={highlight?.includes(skill.name) ? "default" : "secondary"}
                className={`text-sm ${highlight?.includes(skill.name) ? 'bg-blue-500' : ''}`}
                style={{ fontSize: `${Math.max(12, skill.level / 8)}px` }}
              >
                {skill.name}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return <div className="p-4 bg-gray-100 rounded-lg">Skills visualization for {domain}</div>;
};

// Smart defaults based on component type
const getDefaultClassName = (componentType: string): string => {
  const defaults = {
    'render_text': 'col-span-12',
    'show_projects': 'col-span-12', 
    'show_resume': 'col-span-12',
    'show_hero_section': 'col-span-12',
    'show_media_showcase': 'col-span-8 col-start-3', // Centered with margins
    'show_skills_matrix': 'col-span-6' // Half width by default
  };
  return defaults[componentType as keyof typeof defaults] || 'col-span-12';
};

// Main POC Component
export default function POCPage() {
  const [query, setQuery] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [components, setComponents] = useState<Array<{ type: string; props: any; className: string; id: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  // Fetch projects on mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const { data: { payload: googleDocs } } = await unbodyClient.get
          .googleDoc
          .select("title", "autoSummary", "autoKeywords", "text")
          .exec();

        const projectsData = googleDocs.map((doc: any) => ({
          title: String(doc.title || 'Untitled Project'),
          summary: String(doc.autoSummary || 'No summary available'),
          keywords: Array.isArray(doc.autoKeywords) ? doc.autoKeywords : [],
          content: String(doc.text || '')
        }));

        setProjects(projectsData);
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setIsLoadingProjects(false);
      }
    };

    fetchProjects();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    setIsLoading(true);
    
    try {
      const systemPrompt = `You are Amir's AI portfolio assistant. Based on the user's query, create rich, dynamic, and visually engaging experiences by combining multiple components.

Available components:

1. "render_text" - Conversational responses with rich styling
   Props: { content: string, tone?: "casual"|"professional"|"technical", style?: "normal"|"highlight"|"quote"|"callout", size?: "small"|"medium"|"large" }

2. "show_projects" - Project displays with various layouts
   Props: { count: number (1-6), layout?: "grid"|"carousel"|"timeline"|"masonry", filter?: string }

3. "show_resume" - Resume/CV information
   Props: { focus: "experience"|"skills"|"education", message?: string }

4. "show_hero_section" - Impactful hero banners
   Props: { title: string, subtitle: string, background?: "gradient"|"image"|"video"|"minimal", cta?: string }

5. "show_media_showcase" - Rich media galleries and demos
   Props: { type: "images"|"video"|"demo"|"interactive", context: string, layout?: "gallery"|"spotlight"|"comparison"|"before-after", caption?: string }

6. "show_skills_matrix" - Interactive skills visualization
   Props: { domain: string, style?: "radar"|"bars"|"cloud"|"timeline", highlight?: string[] }

Available project data: ${JSON.stringify(projects.slice(0, 2), null, 2)} (${projects.length} total projects)

CREATIVE RULES:
- Think like a UX designer - create engaging, contextual experiences
- For technical queries (like "computer vision"), use media showcases with relevant context
- For experience questions, combine resume + skills matrix + media examples
- Use hero sections for impactful introductions
- Vary layouts and styles based on content type
- Always start with engaging text, then add rich visuals

EXAMPLES:

User: "What is Amir's experience in computer vision?"
Response: [
  {"type": "render_text", "props": {"content": "Amir has extensive experience in computer vision, working on cutting-edge projects involving object detection, image processing, and AI-powered visual systems.", "tone": "professional", "style": "callout"}},
  {"type": "show_media_showcase", "props": {"type": "images", "context": "computer-vision", "layout": "gallery", "caption": "Computer vision projects and demos"}},
  {"type": "show_skills_matrix", "props": {"domain": "computer-vision", "style": "bars", "highlight": ["OpenCV", "TensorFlow"]}},
  {"type": "show_projects", "props": {"count": 2, "layout": "timeline", "filter": "computer vision"}}
]

User: "Who is Amir?"
Response: [
  {"type": "show_hero_section", "props": {"title": "Meet Amir", "subtitle": "Full-stack developer and AI enthusiast building the future of technology", "background": "gradient"}},
  {"type": "render_text", "props": {"content": "I'm a passionate software engineer specializing in AI, computer vision, and modern web technologies.", "tone": "casual", "size": "large"}},
  {"type": "show_projects", "props": {"count": 3, "layout": "masonry"}}
]

User: "Show me some cool demos"
Response: [
  {"type": "render_text", "props": {"content": "Here are some interactive demos and visual projects!", "tone": "casual", "style": "highlight"}},
  {"type": "show_media_showcase", "props": {"type": "video", "context": "computer-vision", "layout": "spotlight", "caption": "Live computer vision pipeline"}},
  {"type": "show_media_showcase", "props": {"type": "images", "context": "web-development", "layout": "comparison", "caption": "Before/after UI transformations"}}
]

GRID LAYOUT SYSTEM:
- All components are placed in a 12-column CSS grid
- Use className to control positioning and sizing
- Common patterns:
  * Full width: "col-span-12"
  * Half width: "col-span-6" 
  * One third: "col-span-4"
  * Two thirds: "col-span-8"
  * Sidebar + content: "col-span-3" + "col-span-9"
  * Split screen: "col-span-6" + "col-span-6"
  * Start at specific column: "col-start-2 col-span-10" (centered with margins)
  * Multiple rows: "row-span-2"

LAYOUT EXAMPLES:

Hero + Content:
[
  {"type": "show_hero_section", "props": {...}, "className": "col-span-12"},
  {"type": "render_text", "props": {...}, "className": "col-span-8 col-start-3"},
  {"type": "show_projects", "props": {...}, "className": "col-span-12"}
]

Split Screen:
[
  {"type": "render_text", "props": {...}, "className": "col-span-6"},
  {"type": "show_media_showcase", "props": {...}, "className": "col-span-6"}
]

Magazine Layout:
[
  {"type": "render_text", "props": {...}, "className": "col-span-4"},
  {"type": "show_skills_matrix", "props": {...}, "className": "col-span-8"},
  {"type": "show_projects", "props": {...}, "className": "col-span-6"},
  {"type": "show_media_showcase", "props": {...}, "className": "col-span-6"}
]

Sidebar Layout:
[
  {"type": "show_skills_matrix", "props": {...}, "className": "col-span-3"},
  {"type": "render_text", "props": {...}, "className": "col-span-9"},
  {"type": "show_projects", "props": {...}, "className": "col-span-9 col-start-4"}
]

Be creative with grid layouts!`;

      const componentsSchema = z.object({
        components: z.array(z.object({
          type: z.enum(["render_text", "show_projects", "show_resume", "show_hero_section", "show_media_showcase", "show_skills_matrix"]),
          props: z.object({}).passthrough().describe("Props object for the component"),
          className: z.string().describe("Tailwind CSS classes for grid placement and sizing (e.g., 'col-span-12', 'col-span-6', 'col-start-1 col-span-8', 'row-span-2')")
        }))
      });

      const { data: { payload } } = await unbodyClient.generate.json([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ], {
        schema: componentsSchema,
        model: "gpt-4o-mini"
      });

      // Validate and render components
      console.log('Raw components from AI:', payload.content.components);
      const validatedComponents = payload.content.components.map((comp: any, idx: number) => {
        try {
          // Validate props against the component's schema
          const schema = toolSchemas[comp.type as keyof typeof toolSchemas];
          if (!schema) {
            console.error(`Unknown component type: ${comp.type}`);
            return null;
          }
          
          // For show_projects, ensure we pass the actual projects data
          if (comp.type === 'show_projects') {
            const validatedProps = schema.parse({
              ...comp.props,
              projects: projects // Use the actual fetched projects
            });
            return {
              type: comp.type,
              props: validatedProps,
              className: comp.className || getDefaultClassName(comp.type),
              id: `${comp.type}-${idx}-${Date.now()}`
            };
          }
          
          // Handle common prop mapping issues
          let propsToValidate = comp.props;
          if (comp.type === 'render_text') {
            // Map common variations to expected prop names
            propsToValidate = {
              content: comp.props.content || comp.props.description || comp.props.text || 'No content provided',
              tone: comp.props.tone || 'casual'
            };
          }
          
          const validatedProps = schema.parse(propsToValidate);
          
          return {
            type: comp.type,
            props: validatedProps,
            className: comp.className || getDefaultClassName(comp.type),
            id: `${comp.type}-${idx}-${Date.now()}`
          };
        } catch (error) {
          console.error(`Validation error for ${comp.type}:`, error, 'Props received:', comp.props);
          
          // Return a fallback component instead of null
          return {
            type: 'render_text',
            props: { 
              content: `Sorry, there was an issue rendering the ${comp.type} component.`, 
              tone: 'casual' as const 
            },
            className: comp.className || getDefaultClassName(comp.type),
            id: `error-${comp.type}-${idx}-${Date.now()}`
          };
        }
      });

      setComponents(validatedComponents);
      
    } catch (error) {
      console.error('Error processing query:', error);
      setComponents([{
        type: 'render_text',
        props: { content: 'Sorry, I encountered an error processing your request. Please try again.', tone: 'casual' },
        className: 'col-span-12',
        id: `error-${Date.now()}`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderComponent = (comp: { type: string; props: any; className: string; id: string }) => {
    const ComponentWrapper = ({ children }: { children: React.ReactNode }) => (
      <div className={comp.className}>
        {children}
      </div>
    );

    switch (comp.type) {
      case 'render_text':
        return <ComponentWrapper key={comp.id}><TextComponent {...comp.props} /></ComponentWrapper>;
      case 'show_projects':
        return <ComponentWrapper key={comp.id}><ProjectsComponent {...comp.props} /></ComponentWrapper>;
      case 'show_resume':
        return <ComponentWrapper key={comp.id}><ResumeComponent {...comp.props} /></ComponentWrapper>;
      case 'show_hero_section':
        return <ComponentWrapper key={comp.id}><HeroSectionComponent {...comp.props} /></ComponentWrapper>;
      case 'show_media_showcase':
        return <ComponentWrapper key={comp.id}><MediaShowcaseComponent {...comp.props} /></ComponentWrapper>;
      case 'show_skills_matrix':
        return <ComponentWrapper key={comp.id}><SkillsMatrixComponent {...comp.props} /></ComponentWrapper>;
      default:
        return null;
    }
  };

  if (isLoadingProjects) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading portfolio data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">AI Portfolio Assistant - POC</h1>
          <p className="text-gray-600">Ask me anything about Amir's work, background, or projects!</p>
          <p className="text-sm text-gray-500 mt-2">Loaded {projects.length} projects</p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="e.g., 'Who is Amir?', 'Show me his projects', 'What's his background?'"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1"
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading || !query.trim()}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </form>

        {/* Rendered Components - 12 Column Grid */}
        <div className="grid grid-cols-12 gap-6 auto-rows-min">
          {components.map(renderComponent)}
        </div>

        {/* Sample Queries */}
        {components.length === 0 && (
          <div className="text-center mt-12">
            <p className="text-sm text-gray-500 mb-4">Try these sample queries:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                "Who is Amir?",
                "What is Amir's experience in computer vision?", 
                "Show me some cool demos",
                "Tell me about his technical skills",
                "Show his background and experience",
                "What projects has he built with AI?"
              ].map((sample, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  onClick={() => setQuery(sample)}
                  className="text-xs"
                >
                  {sample}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
