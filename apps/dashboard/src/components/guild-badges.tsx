import { Badge } from '@vortex/ui';
import type { PermissionRole } from '@vortex/types';

export function PermissionBadge({ role }: { role: PermissionRole | null }) {
  if (!role) return <Badge variant="outline">Member</Badge>;
  return <Badge variant="outline">{formatPermissionRole(role)}</Badge>;
}

export function BotStatusBadge({ botConnected }: { botConnected: boolean }) {
  return (
    <Badge variant={botConnected ? 'success' : 'warning'}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {botConnected ? 'Bot connected' : 'Bot missing'}
    </Badge>
  );
}

export function formatPermissionRole(role: PermissionRole): string {
  const normalizedRole = role.toLowerCase();
  return normalizedRole.charAt(0).toUpperCase() + normalizedRole.slice(1);
}
