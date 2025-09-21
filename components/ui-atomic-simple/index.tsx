"use client";

import React from 'react';
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from '@radix-ui/react-avatar';
import Image from 'next/image';

import type { 
  DisplayHeadingProps,
  DisplayTextProps,
  DisplayCardProps,
  DisplayBadgeProps,
  DisplayAvatarBadgeProps,
  DisplayImageProps,
  DisplayProjectCardProps
} from "@/lib/agent/tools/ui-atomic-simple";

export function AtomicSkeleton({ 
  id, 
  type, 
}: { 
  id: string; 
  type: string; 
  gridArea: string; 
}) {
  const getSkeletonContent = () => {
    switch (type) {
      case 'heading':
        return <Skeleton className="h-8 w-3/4" />;
      case 'card':
        return (
          <div className="flex flex-col h-full space-y-3 p-4 border rounded-lg">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        );
      case 'image':
        return <Skeleton className="h-full w-full rounded-lg" />;
      case 'avatar':
          return <Skeleton className="h-12 w-12 rounded-full" />;
      case 'paragraph':
      default:
        return (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        );
    }
  };

  return (
    <div 
      data-skeleton-id={id}
      data-skeleton-type={type}
      className="h-full w-full"
    >
      {getSkeletonContent()}
    </div>
  );
}

export function AtomicHeading({ level, text, className, skeletonId }: DisplayHeadingProps) {
  const headingClasses = {
    1: "scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl",
    2: "scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0",
    3: "scroll-m-20 text-2xl font-semibold tracking-tight",
    4: "scroll-m-20 text-xl font-semibold tracking-tight",
    5: "scroll-m-20 text-lg font-semibold tracking-tight",
    6: "scroll-m-20 text-base font-semibold tracking-tight",
  };

  const commonProps = {
    className: cn(headingClasses[level as keyof typeof headingClasses], className),
    'data-skeleton-id': skeletonId
  };

  switch (level) {
    case 1: return <h1 {...commonProps}>{text}</h1>;
    case 2: return <h2 {...commonProps}>{text}</h2>;
    case 3: return <h3 {...commonProps}>{text}</h3>;
    case 4: return <h4 {...commonProps}>{text}</h4>;
    case 5: return <h5 {...commonProps}>{text}</h5>;
    case 6: return <h6 {...commonProps}>{text}</h6>;
    default: return <h2 {...commonProps}>{text}</h2>;
  }
}

export function AtomicText({ content, variant = 'paragraph', className, skeletonId }: DisplayTextProps) {
  const variantClasses = {
    paragraph: "leading-7 [&:not(:first-child)]:mt-6",
    lead: "text-xl text-muted-foreground",
    large: "text-lg font-semibold",
    small: "text-sm font-medium leading-none",
    muted: "text-sm text-muted-foreground",
  };

  return <p className={cn(variantClasses[variant], className)} data-skeleton-id={skeletonId}>{content}</p>;
}

export function AtomicCard({ title, content, className, skeletonId }: DisplayCardProps) {
  return (
    <Card className={className} data-skeleton-id={skeletonId}>
      {title && <CardHeader><CardTitle>{title}</CardTitle></CardHeader>}
      <CardContent><div className="whitespace-pre-wrap">{content}</div></CardContent>
    </Card>
  );
}

export function AtomicBadge({ text, variant = 'default', className, skeletonId }: DisplayBadgeProps) {
  return <Badge variant={variant} className={className} data-skeleton-id={skeletonId}>{text}</Badge>;
}

export function AtomicAvatarBadge({ src, alt, fallback, size = 'md', className, skeletonId }: DisplayAvatarBadgeProps) {
    const sizeClasses = {
      sm: "h-8 w-8",
      md: "h-10 w-10", 
      lg: "h-12 w-12"
    };
    return (
      <Avatar className={cn(sizeClasses[size], className)} data-skeleton-id={skeletonId}>
        {src && <AvatarImage src={src} alt={alt} />}
        <AvatarFallback>{fallback}</AvatarFallback>
      </Avatar>
    );
} 

export function AtomicImage({ src, className, skeletonId, alt }: DisplayImageProps) {
  return (
    <div className={cn("relative rounded-md overflow-hidden w-full h-full", className)} data-skeleton-id={skeletonId}>
      <Image src={src} alt={alt ?? ''} layout="fill" objectFit="cover" />
    </div>
  );
}

export function AtomicProjectCard({ skeletonId, title, description, imageUrl, technologies }: DisplayProjectCardProps) {
  return (
    <Card className="h-full flex flex-col" data-skeleton-id={skeletonId}>
      <CardHeader>
        <div className="aspect-video relative w-full rounded-md overflow-hidden">
          <Image src={imageUrl} alt={title} layout="fill" objectFit="cover" />
        </div>
        <CardTitle className="pt-4">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
      <CardFooter>
        <div className="flex gap-2 flex-wrap">
          {technologies.map(tech => (
            <Badge key={tech} variant="secondary">{tech}</Badge>
          ))}
        </div>
      </CardFooter>
    </Card>
  );
}

export const AtomicUIComponents = {
  layoutSkeleton: AtomicSkeleton,
  displayHeading: AtomicHeading,
  displayText: AtomicText,
  displayCard: AtomicCard,
  displayBadge: AtomicBadge,
  displayAvatarBadge: AtomicAvatarBadge,
  displayImage: AtomicImage,
  displayProjectCard: AtomicProjectCard,
} as const;

export type AtomicUIComponentName = keyof typeof AtomicUIComponents;