import { Avatar, AvatarFallback, AvatarImage, Badge, cn } from '@vortex/ui';
import type { ComponentsV2Button, ComponentsV2Item, ComponentsV2Message, CoreMessage, EmbedMessage } from '@vortex/types';

export const samplePreviewData: Record<string, string> = {
  user: '@Mira',
  userName: 'Mira',
  userDisplayName: 'Mira Vale',
  userId: '123456789012345678',
  userCreatedDate: 'Jan 14, 2023',
  userCreatedDays: '521',
  serverName: 'Vortex Labs',
  serverId: '987654321098765432',
  memberCount: '12,482',
  inviter: '@Nora',
  inviterName: 'Nora',
  inviterId: '234567890123456789',
  invitesCount: '42',
  inviteCode: 'vortex',
};

export interface DiscordMessagePreviewProps {
  message: CoreMessage;
  botName?: string | undefined;
  botAvatarUrl?: string | null | undefined;
  previewVariables?: Record<string, string> | undefined;
}

export function DiscordMessagePreview({
  message,
  botName = 'Vortex',
  botAvatarUrl,
  previewVariables,
}: DiscordMessagePreviewProps) {
  const text = resolveVariables(getMessageText(message), previewVariables);
  const direction = isRtl(text) ? 'rtl' : 'ltr';

  return (
    <div className="rounded-xl border border-border bg-[#313338] p-4 text-[#dbdee1] shadow-inner">
      <div className="flex items-start gap-3">
        <Avatar className="size-10 shrink-0 rounded-full">
          <AvatarImage src={botAvatarUrl ?? undefined} alt={botName} className="rounded-full" />
          <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">{botName.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-white">{botName}</span>
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">APP</Badge>
            <span className="text-xs text-[#949ba4]">Today at {formatPreviewTime()}</span>
          </div>
          {text ? (
            <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-6" dir={direction}>{text}</p>
          ) : null}
          {message.type === 'embed' ? <EmbedPreview message={message} variables={previewVariables} /> : null}
          {message.type === 'components_v2' ? <ComponentsPreview message={message} variables={previewVariables} /> : null}
        </div>
      </div>
    </div>
  );
}

function EmbedPreview({ message, variables }: { message: EmbedMessage; variables?: Record<string, string> | undefined }) {
  const color = typeof message.color === 'number' ? `#${message.color.toString(16).padStart(6, '0')}` : '#5865f2';
  const fields = message.fields ?? [];

  return (
    <div className="mt-2 flex max-w-[520px]">
      <div className="w-1 shrink-0 rounded-l" style={{ backgroundColor: color }} />
      <div className="min-w-0 flex-1 rounded-r bg-[#2b2d31] p-3">
        <div className="flex gap-3">
          <div className="min-w-0 flex-1">
            {message.author?.name ? (
              <div className="flex items-center gap-2">
                {message.author.iconUrl ? <img src={message.author.iconUrl} alt="" className="size-6 rounded-full object-cover" /> : null}
                {message.author.url ? (
                  <a href={message.author.url} className="text-sm font-semibold text-white hover:underline">{resolveVariables(message.author.name, variables)}</a>
                ) : (
                  <span className="text-sm font-semibold text-white">{resolveVariables(message.author.name, variables)}</span>
                )}
              </div>
            ) : null}
            {message.title ? (
              <div className="mt-0.5">
                <p className="text-base font-semibold leading-5 text-white">{resolveVariables(message.title, variables)}</p>
              </div>
            ) : null}
            {message.description ? (
              <p className="mt-2 whitespace-pre-wrap text-sm leading-5 text-[#dbdee1]">{resolveVariables(message.description, variables)}</p>
            ) : null}
            {fields.length ? <EmbedFields fields={fields} variables={variables} /> : null}
            {message.imageUrl ? <img src={message.imageUrl} alt="" className="mt-4 max-h-72 w-full rounded object-cover" /> : null}
            {message.footer?.text ? (
              <div className="mt-2 flex items-center gap-2">
                {message.footer?.iconUrl ? <img src={message.footer.iconUrl} alt="" className="size-5 rounded-full object-cover" /> : null}
                <span className="text-xs text-[#949ba4]">
                  {message.footer?.text ? resolveVariables(message.footer.text, variables) : null}
                </span>
              </div>
            ) : null}
          </div>
          {message.thumbnailUrl ? (
            <div className="ml-2 shrink-0">
              <img src={message.thumbnailUrl} alt="" className="size-20 rounded object-cover" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function EmbedFields({ fields, variables }: { fields: EmbedMessage['fields']; variables?: Record<string, string> | undefined }) {
  const rows: Array<typeof fields> = [];
  let currentRow: typeof fields = [];
  for (const field of fields) {
    if (!field.inline) {
      if (currentRow.length) rows.push(currentRow);
      rows.push([field]);
      currentRow = [];
    } else {
      currentRow.push(field);
      if (currentRow.length === 3) {
        rows.push(currentRow);
        currentRow = [];
      }
    }
  }
  if (currentRow.length) rows.push(currentRow);

  return (
    <div className="mt-2 grid gap-2">
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}>
          {row.map((field, fieldIndex) => (
            <div key={`${field.name}-${fieldIndex}`}>
              <p className="text-xs font-semibold text-white">{resolveVariables(field.name, variables)}</p>
              <p className="mt-0.5 whitespace-pre-wrap text-sm text-[#dbdee1]">{resolveVariables(field.value, variables)}</p>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function ComponentsPreview({ message, variables }: { message: ComponentsV2Message; variables?: Record<string, string> | undefined }) {
  return (
    <div className="mt-2 flex max-w-[520px] flex-col gap-2">
      {message.components.map((container, containerIndex) => (
        <div key={containerIndex} className={cn('flex flex-col gap-2 rounded-lg border border-[#3f4147] bg-[#2b2d31] p-3', container.spoiler && 'opacity-75')}>
          {container.items.map((item, itemIndex) => (
            <ComponentItemPreview key={itemIndex} item={item} variables={variables} />
          ))}
        </div>
      ))}
    </div>
  );
}

function ComponentItemPreview({ item, variables }: { item: ComponentsV2Item; variables?: Record<string, string> | undefined }) {
  if (item.type === 'text_display') {
    return <p className="whitespace-pre-wrap text-sm leading-5 text-[#dbdee1]">{resolveVariables(item.content, variables)}</p>;
  }
  if (item.type === 'separator') {
    return <div className={cn('bg-[#3f4147]', item.divider ? 'h-px' : 'h-0', item.spacing === 'large' ? 'my-4' : 'my-2')} />;
  }
  if (item.type === 'media') {
    return (
      <div className={cn('overflow-hidden rounded-lg border border-[#3f4147]', item.spoiler && 'opacity-50')}>
        <img src={item.url} alt={item.description ?? ''} className="max-h-72 w-full object-cover" />
        {item.description ? <p className="px-3 py-2 text-xs text-[#949ba4]">{item.description}</p> : null}
      </div>
    );
  }
  if (item.type === 'section') {
    return (
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm leading-5 text-[#dbdee1]">{resolveVariables(item.content, variables)}</p>
        <ComponentButtonPreview button={item.accessory} />
      </div>
    );
  }
  if (item.type === 'select') {
    return (
      <div className={cn('grid gap-1.5', item.disabled && 'opacity-60')}>
        <div className="rounded-md border border-[#3f4147] px-3 py-2 text-sm text-[#949ba4]">{item.placeholder ?? 'Select an option...'}</div>
        <div className="flex flex-wrap gap-1.5">
          {item.options.map((option) => (
            <span key={option.value} className="rounded-full border border-[#3f4147] px-2.5 py-0.5 text-xs text-[#dbdee1]">
              {option.emoji ? `${option.emoji} ` : ''}{option.label}
            </span>
          ))}
        </div>
      </div>
    );
  }
  return <ComponentButtonPreview button={item} />;
}

function ComponentButtonPreview({ button }: { button: ComponentsV2Button }) {
  const className = cn(
    'shrink-0 rounded px-4 py-1.5 text-sm font-medium transition-colors',
    button.disabled && 'cursor-not-allowed opacity-60',
    button.style === 'primary' && 'bg-[#5865f2] text-white hover:bg-[#4752c4]',
    button.style === 'secondary' && 'bg-[#4e5058] text-white hover:bg-[#6d6f78]',
    button.style === 'success' && 'bg-[#248046] text-white hover:bg-[#1a6334]',
    button.style === 'danger' && 'bg-[#da373c] text-white hover:bg-[#a12829]',
    button.style === 'link' && 'bg-[#4e5058] text-white hover:bg-[#6d6f78]',
  );
  return (
    <button type="button" disabled={button.disabled} className={className}>
      {button.label}
    </button>
  );
}

function getMessageText(message: CoreMessage): string {
  if (message.type === 'text') return message.content;
  return '';
}

export function resolveVariables(value: string, data: Record<string, string> | undefined = samplePreviewData): string {
  return value.replace(/\[([A-Za-z][A-Za-z0-9_]*)\]/gu, (match, name: string) => data[name] ?? match);
}

function isRtl(value: string): boolean {
  return /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/u.test(value);
}

function formatPreviewTime(): string {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}
