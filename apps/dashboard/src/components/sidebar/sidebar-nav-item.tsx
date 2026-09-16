import { Link, matchPath, useLocation } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipTrigger, cn } from '@vortex/ui';
import type { LucideIcon } from 'lucide-react';

export interface SidebarNavItemData {
  label: string;
  path: string;
  icon: LucideIcon;
  end?: boolean;
  disabled?: boolean;
  note?: string;
}

interface SidebarNavItemProps {
  item: SidebarNavItemData;
  collapsed: boolean;
}

export function SidebarNavItem({ item, collapsed }: SidebarNavItemProps) {
  const location = useLocation();
  const isActive =
    matchPath(
      { path: item.path, end: item.end ?? false },
      decodeURIComponent(location.pathname),
    ) !== null;
  const Icon = item.icon;

  if (item.disabled) {
    const node = (
      <span
        className={navItemClass({ collapsed, active: false, disabled: true })}
        aria-disabled="true"
        aria-label={collapsed ? item.label : undefined}
        title={`${item.label} is coming soon`}
      >
        <Icon className="size-[18px] shrink-0" aria-hidden="true" />
        {!collapsed && <span className="truncate">{item.label}</span>}
        {!collapsed && item.note ? (
          <span className="ml-auto text-[10px] uppercase opacity-60">{item.note}</span>
        ) : null}
      </span>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{node}</TooltipTrigger>
          <TooltipContent side="right">{item.label}</TooltipContent>
        </Tooltip>
      );
    }

    return node;
  }

  const link = (
    <Link
      to={item.path}
      className={navItemClass({ collapsed, active: isActive })}
      aria-label={collapsed ? item.label : undefined}
      aria-current={isActive ? 'page' : undefined}
      data-active={isActive ? 'true' : undefined}
    >
      <Icon className="size-[18px] shrink-0" aria-hidden="true" />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {isActive && collapsed && <span className="sr-only">(current page)</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

function navItemClass({
  collapsed,
  active,
  disabled = false,
}: {
  collapsed: boolean;
  active: boolean;
  disabled?: boolean;
}) {
  return cn(
    'group relative flex items-center outline-none transition-colors',
    collapsed ? 'h-10 w-10 justify-center rounded-[10px]' : 'h-10 w-full gap-3 rounded-[10px] px-3',
    active
      ? 'bg-sidebar-accent text-sidebar-foreground'
      : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground',
    disabled && 'cursor-not-allowed opacity-50',
    'focus-visible:ring-2 focus-visible:ring-ring/40',
    active &&
      collapsed &&
      'before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-r-full before:bg-primary',
  );
}
