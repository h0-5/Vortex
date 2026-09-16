import { SidebarNavItem, type SidebarNavItemData } from './sidebar-nav-item.js';

interface SidebarNavGroupProps {
  label: string;
  items: SidebarNavItemData[];
  collapsed: boolean;
}

export function SidebarNavGroup({ label, items, collapsed }: SidebarNavGroupProps) {
  return (
    <div className="space-y-1">
      {!collapsed && (
        <p className="px-3 pb-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </p>
      )}
      <ul className="space-y-1" role="list">
        {items.map((item) => (
          <li key={item.label}>
            <SidebarNavItem item={item} collapsed={collapsed} />
          </li>
        ))}
      </ul>
    </div>
  );
}
