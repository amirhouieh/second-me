import { getProjects } from "@/lib/portfolio/projects.service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: 'Projects | Portfolio',
  description: 'Explore my portfolio projects built with various technologies.',
};

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">My Projects</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          A collection of projects I've worked on, ranging from web applications to tools and experiments.
        </p>
      </div>

      {/* Projects Grid */}
      {projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card key={project.slug} className="flex flex-col h-full hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="line-clamp-2">{project.title}</CardTitle>
                <CardDescription className="line-clamp-3">
                  {project.summary}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col justify-between">
                {/* Keywords */}
                {project.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {project.keywords.slice(0, 4).map((keyword, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                    {project.keywords.length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{project.keywords.length - 4}
                      </Badge>
                    )}
                  </div>
                )}
                
                {/* View Project Button */}
                <Link href={`/projects/${project.slug}`} className="mt-auto">
                  <Button className="w-full">
                    View Project
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">
            No projects found. Make sure your Google Docs are properly configured in Unbody.
          </p>
        </div>
      )}
    </div>
  );
}
