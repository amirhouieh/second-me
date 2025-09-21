"use client";

import React, { useState, useEffect } from 'react';
import { AtomicUIComponents, type AtomicUIComponentName } from '@/components/ui-atomic-simple';
import type { UIToolResult } from '@/hooks/use-ui-composer-simple';
import { LayoutSkeletonProps } from '@/lib/agent/tools/ui-atomic-simple';

interface UIRendererProps {
  components: UIToolResult[];
  className?: string;
}

export function UIRenderer({ components, className }: UIRendererProps) {
  const [uiElements, setUiElements] = useState<Record<string, React.ReactNode>>({});

  useEffect(() => {
    // 1. Create a map of all defined skeletons from the tool result.
    const skeletonToolResult = components.find(c => c.name === 'layoutSkeleton')?.result as LayoutSkeletonProps | undefined;
    const skeletonMap = new Map<string, { id: string; gridArea: string; type: string; }>();
    if (skeletonToolResult && Array.isArray(skeletonToolResult.skeletons)) {
        skeletonToolResult.skeletons.forEach(s => skeletonMap.set(s.id, s));
    }

    // 2. Create a map of the final content components, keyed by their skeletonId.
    const contentComponentMap = new Map<string, UIToolResult>();
    components.filter(c => c.name !== 'layoutSkeleton').forEach(c => {
        const skeletonId = (c.result as any)?.skeletonId;
        if (skeletonId) {
            contentComponentMap.set(skeletonId, c);
        }
    });

    // 3. Build the final map of renderable React nodes.
    const elementsToRender: Record<string, React.ReactNode> = {};
    for (const [id, skeletonProps] of skeletonMap.entries()) {
        const finalComponentData = contentComponentMap.get(id);

        let innerContent: React.ReactNode;

        if (finalComponentData) {
            // A final component is ready, render it.
            const Component = AtomicUIComponents[finalComponentData.name as AtomicUIComponentName];
            innerContent = Component 
              ? <Component {...(finalComponentData.result as any)} /> 
              : <ErrorDisplay toolName={finalComponentData.name} />;
        } else {
            // No final component yet, so render the skeleton.
            const SkeletonComponent = AtomicUIComponents.layoutSkeleton;
            innerContent = <SkeletonComponent {...skeletonProps} />;
        }
        
        // 4. Wrap the inner content in a persistent div that holds the gridArea style.
        elementsToRender[id] = (
            <div key={id} style={{ gridArea: skeletonProps.gridArea }}>
                {innerContent}
            </div>
        );
    }

    setUiElements(elementsToRender);

  }, [components]);

  if (Object.keys(uiElements).length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <div 
        className="grid w-full gap-4 min-h-[200px]"
        style={{
          gridTemplateColumns: `repeat(12, minmax(0, 1fr))`
        }}
      >
        {Object.values(uiElements)}
      </div>
    </div>
  );
}

function ErrorDisplay({ toolName, error }: { toolName: string; error?: unknown }) {
  return (
    <div className="p-4 border border-red-200 rounded bg-red-50 text-sm text-red-600">
      <p className="font-bold">Error rendering component: {toolName}</p>
      {error instanceof Error && (
        <p className="text-xs mt-1 text-red-500">{error.message}</p>
      )}
    </div>
  );
}