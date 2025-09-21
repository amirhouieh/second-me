"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play } from "lucide-react";
import { selectAndRunTools } from "@/lib/ai/toolkit";

export default function ToolsPlaygroundPage() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<{ tools: string[]; params: Record<string, any> } | null>(null);
  const [results, setResults] = useState<Record<string, any> | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setIsLoading(true);
    setError(null);
    setResults(null);
    setSelection(null);
    try {
      const { results, selection } = await selectAndRunTools(query.trim());
      setResults(results);
      setSelection(selection as any);
    } catch (err: any) {
      setError(err?.message || "Failed to run tools");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Tool Selector Playground</h1>
          <p className="text-sm text-gray-500">Type a query. We'll pick and run only the relevant tools on the client.</p>
        </div>

        <form onSubmit={onSubmit} className="flex gap-2">
          <Input
            placeholder="e.g., Who is Amir? / Show GitHub activity / projects about computer vision"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !query.trim()}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          </Button>
        </form>

        {error && (
          <Card className="border-destructive">
            <CardContent className="py-4">
              <p className="text-destructive text-sm">{error}</p>
            </CardContent>
          </Card>
        )}

        {selection && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Selected Tools</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {selection.tools.map((tool, idx) => (
                  <Badge key={idx} variant="secondary">{tool}</Badge>
                ))}
              </div>
              <pre className="text-xs bg-gray-100 rounded-md p-3 overflow-auto">
{JSON.stringify(selection.params, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {results && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {results.getBio && (
                <div>
                  <h3 className="font-medium mb-1">Bio</h3>
                  <pre className="text-xs bg-gray-100 rounded-md p-3 overflow-auto">{JSON.stringify(results.getBio, null, 2)}</pre>
                </div>
              )}
              {results.getGithubActivity && (
                <div>
                  <h3 className="font-medium mb-1">GitHub Activity</h3>
                  <pre className="text-xs bg-gray-100 rounded-md p-3 overflow-auto">{JSON.stringify(results.getGithubActivity, null, 2)}</pre>
                </div>
              )}
              {results.getProjects && (
                <div>
                  <h3 className="font-medium mb-1">Projects</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(results.getProjects as any[]).map((p, i) => (
                      <Card key={i} className="">
                        <CardHeader>
                          <CardTitle className="text-sm">{p.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-xs text-gray-600 line-clamp-3">{p.summary}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
              {/* Raw dump */}
              <div>
                <h3 className="font-medium mb-1">Raw</h3>
                <pre className="text-xs bg-gray-50 rounded-md p-3 overflow-auto border">
{JSON.stringify(results, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}


