import { Label } from './label.js';
import { Switch } from './switch.js';
import { cn } from '../lib/cn.js';

export interface CoreSwitchProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export function CoreSwitch({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
  loading,
  className,
}: CoreSwitchProps) {
  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <div className="grid gap-0.5">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled || loading}
        aria-label={label}
        data-loading={loading ? 'true' : undefined}
      />
    </div>
  );
}
