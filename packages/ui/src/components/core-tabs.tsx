import * as React from 'react';

import { cn } from '../lib/cn.js';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select.js';
import { Tabs, TabsList, TabsTrigger } from './tabs.js';

export interface CoreTab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface CoreTabsProps {
  tabs: CoreTab[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  triggerClassName?: string;
}

export function CoreTabs({
  tabs,
  value,
  onValueChange,
  className,
  triggerClassName,
}: CoreTabsProps) {
  return (
    <div className={className}>
      <div className="hidden sm:block">
        <Tabs value={value} onValueChange={onValueChange}>
          <TabsList className={cn('w-full justify-start', triggerClassName)}>
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                disabled={tab.disabled}
                className="flex items-center gap-2"
              >
                {tab.icon ? <span className="size-4">{tab.icon}</span> : null}
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      <div className="sm:hidden">
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger className={triggerClassName}>
            <SelectValue placeholder="Select a tab" />
          </SelectTrigger>
          <SelectContent>
            {tabs.map((tab) => (
                <SelectItem key={tab.id} value={tab.id} disabled={Boolean(tab.disabled)}>
                <span className="flex items-center gap-2">
                  {tab.icon ? <span className="size-4">{tab.icon}</span> : null}
                  {tab.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
