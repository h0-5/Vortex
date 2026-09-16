import { Button } from '@vortex/ui';
import { PanelLeftCloseIcon, PanelLeftOpenIcon } from 'lucide-react';

interface SidebarCollapseButtonProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function SidebarCollapseButton({ collapsed, onToggle }: SidebarCollapseButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onToggle}
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      className="h-10 w-10 rounded-[10px] text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
    >
      {collapsed ? (
        <PanelLeftOpenIcon className="size-[18px]" aria-hidden="true" />
      ) : (
        <PanelLeftCloseIcon className="size-[18px]" aria-hidden="true" />
      )}
    </Button>
  );
}
