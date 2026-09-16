import * as React from 'react';

import { cn } from '../lib/cn.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card.js';

export interface CoreFormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function CoreFormSection({
  title,
  description,
  children,
  className,
  contentClassName,
}: CoreFormSectionProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className={cn('grid gap-5', contentClassName)}>{children}</CardContent>
    </Card>
  );
}
