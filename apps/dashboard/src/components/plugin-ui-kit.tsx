import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Empty, EmptyDescription, EmptyHeader, EmptyTitle, cn } from '@vortex/ui';

import { CopyIcon, FileTextIcon, PlusIcon, SaveIcon, TrashIcon, XIcon, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type PluginActionVariant = 'primary' | 'secondary' | 'destructive' | 'ghost' | 'outline';
type PluginActionIcon = 'Create' | 'Save' | 'Delete' | 'Cancel' | 'Duplicate';

export interface PluginAction {
  id: string;
  label: string;
  icon?: PluginActionIcon;
  variant?: PluginActionVariant;
  type?: 'button' | 'submit';
  loading?: boolean;
  disabled?: boolean;
}

const iconMap: Record<PluginActionIcon, LucideIcon> = {
  Create: PlusIcon,
  Save: SaveIcon,
  Delete: TrashIcon,
  Cancel: XIcon,
  Duplicate: CopyIcon,
};

const variantMap: Record<PluginActionVariant, React.ComponentProps<typeof Button>['variant']> = {
  primary: 'default',
  secondary: 'secondary',
  destructive: 'destructive',
  ghost: 'ghost',
  outline: 'outline',
};

export function PluginActionButton({
  action,
  onAction,
  size = 'sm',
}: {
  action: PluginAction;
  onAction: (id: string) => void;
  size?: React.ComponentProps<typeof Button>['size'];
}) {
  const Icon = action.icon ? iconMap[action.icon] : null;
  return (
    <Button
      type={action.type ?? 'button'}
      size={size}
      variant={variantMap[action.variant ?? 'primary']}
      disabled={action.disabled || action.loading}
      onClick={() => onAction(action.id)}
    >
      {Icon ? <Icon data-icon="inline-start" /> : null}
      {action.loading ? 'Working...' : action.label}
    </Button>
  );
}

export function PluginPageActions({ actions, onAction }: { actions: PluginAction[]; onAction: (id: string) => void }) {
  return <div className="flex flex-wrap items-center gap-2">{actions.map((action) => <PluginActionButton key={action.id} action={action} onAction={onAction} />)}</div>;
}

export function PluginSection({ title, description, actions, onAction, children }: { title: string; description?: string; actions?: PluginAction[]; onAction?: (id: string) => void; children: ReactNode }) {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="border-b border-border px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="text-sm">{title}</CardTitle>
            {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {actions && onAction ? <PluginPageActions actions={actions} onAction={onAction} /> : null}
        </div>
      </CardHeader>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}

export function PluginEditorLayout({ list, editor, preview }: { list: ReactNode; editor: ReactNode; preview: ReactNode }) {
  return (
    <div className="grid min-w-0 gap-5 2xl:grid-cols-[minmax(280px,340px)_minmax(0,1fr)_420px] xl:grid-cols-[minmax(280px,340px)_minmax(0,1fr)]">
      <aside className="min-w-0">{list}</aside>
      <main className="min-w-0">{editor}</main>
      <aside className="min-w-0 xl:col-start-2 2xl:sticky 2xl:top-5 2xl:col-start-auto 2xl:self-start">{preview}</aside>
    </div>
  );
}

export function PluginPreviewPanel({ title = 'Preview', children }: { title?: string; children: ReactNode }) {
  return <PluginSection title={title}>{<div className="p-5">{children}</div>}</PluginSection>;
}

export function PluginSaveBar({ actions, onAction }: { actions: PluginAction[]; onAction: (id: string) => void }) {
  return (
    <div className="sticky bottom-0 z-10 mt-5 flex items-center justify-end gap-2 border-t border-border bg-card/95 px-5 py-4 backdrop-blur">
      <PluginPageActions actions={actions} onAction={onAction} />
    </div>
  );
}

export function PluginEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Empty className="min-h-64 border-0">
      <EmptyHeader>
        <FileTextIcon className="size-8 text-muted-foreground" />
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export function PluginListItem({ selected, title, description, badges, actions, onClick, onAction }: { selected: boolean; title: string; description?: string; badges?: string[]; actions?: PluginAction[]; onClick: () => void; onAction?: (id: string) => void }) {
  return (
    <article className={cn('border-b border-border p-4 transition-colors', selected && 'bg-primary/5')}>
      <Button type="button" variant="ghost" onClick={onClick} className="h-auto w-full justify-start p-0 text-left font-normal hover:bg-transparent">
        <span className="flex w-full flex-col">
          <span className="truncate font-medium">{title}</span>
          {description ? <span className="mt-1 text-xs text-muted-foreground">{description}</span> : null}
          {badges?.length ? <span className="mt-2 flex flex-wrap gap-2">{badges.map((badge) => <Badge key={badge} variant="outline">{badge}</Badge>)}</span> : null}
        </span>
      </Button>
      {actions && onAction ? <div className="mt-3 flex gap-2"><PluginPageActions actions={actions} onAction={onAction} /></div> : null}
    </article>
  );
}
