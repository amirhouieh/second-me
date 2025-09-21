import { getProjectBySlug, getProjectSlugs } from "@/lib/portfolio/projects.service";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, Github } from "lucide-react";
import Link from "next/link";

interface ProjectPageProps {
  params: {
    slug: string;
  };
}

// Generate static params for all projects
export async function generateStaticParams() {
  const slugs = await getProjectSlugs();
  
  return slugs.map((slug) => ({
    slug,
  }));
}

// Generate metadata for each project
export async function generateMetadata({ params }: ProjectPageProps) {
  const project = await getProjectBySlug(params.slug);
  
  if (!project) {
    return {
      title: 'Project Not Found',
    };
  }

  return {
    title: `${project.title} | Portfolio`,
    description: project.summary,
    keywords: project.keywords.join(', '),
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const project = await getProjectBySlug(params.slug);

  if (!project) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Back Navigation */}
      <div className="mb-6">
        <Link href="/projects">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Button>
        </Link>
      </div>

      {/* Project Header */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-3xl font-bold mb-4">{project.title}</CardTitle>
          
          {/* Keywords */}
          {project.keywords.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {project.keywords.map((keyword, index) => (
                <Badge key={index} variant="secondary">
                  {keyword}
                </Badge>
              ))}
            </div>
          )}

          {/* Summary */}
          <p className="text-lg text-muted-foreground leading-relaxed">
            {project.summary}
          </p>
        </CardHeader>
      </Card>

      {/* Project Content */}
      <Card>
        <CardContent className="pt-6">
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <div className="whitespace-pre-wrap">
              {project.content}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4 mt-8">
        {project.url && (
          <Button asChild>
            <a href={project.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              View Project
            </a>
          </Button>
        )}
        
        <Button variant="outline" asChild>
          <a href={`https://docs.google.com/document/d/${project.id}`} target="_blank" rel="noopener noreferrer">
            <Github className="mr-2 h-4 w-4" />
            View Source Doc
          </a>
        </Button>
      </div>
    </div>
  );
}
