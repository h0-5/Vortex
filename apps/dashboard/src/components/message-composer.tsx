import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@vortex/ui';
import type { CoreMessage, EmbedFooterIconSource, EmbedMessage } from '@vortex/types';
import { CopyIcon, PlusIcon, TrashIcon } from 'lucide-react';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

import { ComponentsV2Builder } from './components-v2-builder.js';
import { DiscordMessagePreview } from './discord-message-preview.js';
import { EmojiInsertMenu } from './emoji-insert-menu.js';
import { VariableInsertMenu } from './variable-insert-menu.js';

export type MessageMode = 'text' | 'embed' | 'components_v2';

export function createDefaultMessage(mode: MessageMode): CoreMessage {
  if (mode === 'embed') {
    return { type: 'embed', title: '', description: '', color: 0x5865f2, fields: [] };
  }
  if (mode === 'components_v2') {
    return {
      type: 'components_v2',
      components: [{ type: 'container', spoiler: false, items: [{ type: 'text_display', content: '' }] }],
    };
  }
  return { type: 'text', content: '' };
}

export interface MessageComposerProps {
  guildId: string;
  mode: MessageMode;
  value: CoreMessage | null;
  variables?: Array<{ key: string; label: string; description: string; group: string }>;
  placeholder?: string;
  showPreview?: boolean;
  botName?: string | undefined;
  botAvatarUrl?: string | null | undefined;
  userAvatarUrl?: string | null | undefined;
  guildIconUrl?: string | null | undefined;
  previewVariables?: Record<string, string> | undefined;
  onModeChange: (mode: MessageMode) => void;
  onChange: (message: CoreMessage) => void;
}

export function MessageComposer({
  guildId,
  mode,
  value,
  variables,
  placeholder,
  showPreview = true,
  botName,
  botAvatarUrl,
  userAvatarUrl,
  guildIconUrl,
  previewVariables,
  onModeChange,
  onChange,
}: MessageComposerProps) {
  const [activeField, setActiveField] = useState<string>('content');
  const [variableOpen, setVariableOpen] = useState(false);
  const pendingCursorRef = useRef<number | null>(null);
  const message = value?.type === mode ? value : createDefaultMessage(mode);

  useLayoutEffect(() => {
    if (pendingCursorRef.current === null) return;
    const active = document.activeElement;
    if (active && (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement)) {
      active.setSelectionRange(pendingCursorRef.current, pendingCursorRef.current);
    }
    pendingCursorRef.current = null;
  });

  function insertVariable(variable: string) {
    const active = document.activeElement;
    if (active && (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement)) {
      const fieldId = active.dataset.field ?? activeField;
      const start = active.selectionStart ?? active.value.length;
      const end = active.selectionEnd ?? start;
      const nextValue = `${active.value.slice(0, start)}${variable}${active.value.slice(end)}`;
      const nextMessage = updateMessageField(message, fieldId, nextValue);
      if (nextMessage) {
        onChange(nextMessage);
        pendingCursorRef.current = start + variable.length;
        setVariableOpen(false);
        return;
      }
    }
    // Fallback: append to the default location for the current mode.
    fallbackInsert(message, variable, onChange);
    setVariableOpen(false);
  }

  function handleFocusField(fieldId: string) {
    setActiveField(fieldId);
  }

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="border-b border-border px-5 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-sm">Message composer</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Choose one message type, then configure only the fields for that type.</p>
          </div>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Message Type">
            {(['text', 'embed', 'components_v2'] as const).map((item) => (
              <Button
                key={item}
                type="button"
                size="sm"
                variant={mode === item ? 'default' : 'outline'}
                onClick={() => {
                  onModeChange(item);
                  onChange(createDefaultMessage(item));
                }}
              >
                {item === 'text' ? 'Text' : item === 'embed' ? 'Embed' : 'Components V2'}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className={showPreview ? 'grid gap-5 p-5 xl:grid-cols-[1fr_420px]' : 'p-5'}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <EmojiInsertMenu guildId={guildId} onInsert={(text) => insertVariable(text)} />
            <Popover open={variableOpen} onOpenChange={setVariableOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  {'{ }'} Insert variable
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="start">
                <VariableInsertMenu variables={variables} onInsert={insertVariable} />
              </PopoverContent>
            </Popover>
          </div>
          {message.type === 'text' ? (
            <TextEditor placeholder={placeholder} message={message} onFocusField={handleFocusField} onChange={onChange} />
          ) : null}
          {message.type === 'embed' ? (
            <EmbedEditor
              message={message}
              userAvatarUrl={userAvatarUrl}
              guildIconUrl={guildIconUrl}
              onFocusField={handleFocusField}
              onChange={onChange}
            />
          ) : null}
          {message.type === 'components_v2' ? (
            <ComponentsV2Builder message={message} onFocusField={handleFocusField} onChange={onChange} />
          ) : null}
        </div>
        {showPreview ? <DiscordMessagePreview message={message} botName={botName} botAvatarUrl={botAvatarUrl} previewVariables={previewVariables} /> : null}
      </CardContent>
    </Card>
  );
}

function TextEditor({
  message,
  placeholder,
  onFocusField,
  onChange,
}: {
  message: { type: 'text'; content: string };
  placeholder?: string | undefined;
  onFocusField: (fieldId: string) => void;
  onChange: (message: CoreMessage) => void;
}) {
  return (
    <Field label="Content">
      <Textarea
        data-field="content"
        placeholder={placeholder}
        value={message.content}
        onFocus={() => onFocusField('content')}
        onSelect={() => onFocusField('content')}
        onChange={(event) => onChange({ ...message, content: event.target.value })}
      />
    </Field>
  );
}

function EmbedEditor({
  message,
  userAvatarUrl,
  guildIconUrl,
  onFocusField,
  onChange,
}: {
  message: EmbedMessage;
  userAvatarUrl: string | null | undefined;
  guildIconUrl: string | null | undefined;
  onFocusField: (fieldId: string) => void;
  onChange: (message: CoreMessage) => void;
}) {
  const fields = message.fields ?? [];
  const update = (patch: Partial<EmbedMessage>) => onChange({ ...message, ...patch });

  function updateFooterIconSource(source: EmbedFooterIconSource) {
    const footer = message.footer ?? { text: '', iconSource: 'none' as const };
    let iconUrl: string | undefined;
    if (source === 'user_avatar') iconUrl = userAvatarUrl ?? undefined;
    if (source === 'server_icon') iconUrl = guildIconUrl ?? undefined;
    if (source === 'custom') iconUrl = footer.iconUrl ?? '';
    update({ footer: { ...footer, iconSource: source, iconUrl } });
  }

  function updateFooterText(text: string) {
    const footer = message.footer;
    if (!text) {
      update({ footer: undefined });
      return;
    }
    update({ footer: { ...(footer ?? { iconSource: 'none' }), text } });
  }

  function addField() {
    update({ fields: [...fields, { name: 'Field name', value: 'Field value', inline: false }] });
  }

  function updateField(index: number, patch: Partial<(typeof fields)[number]>) {
    update({ fields: fields.map((field, i) => (i === index ? { ...field, ...patch } : field)) });
  }

  function moveField(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= fields.length) return;
    const nextFields = [...fields];
    [nextFields[index], nextFields[nextIndex]] = [nextFields[nextIndex]!, nextFields[index]!];
    update({ fields: nextFields });
  }

  function duplicateField(index: number) {
    const field = fields[index];
    if (!field) return;
    const nextFields = [...fields];
    nextFields.splice(index + 1, 0, { ...field });
    update({ fields: nextFields });
  }

  function removeField(index: number) {
    update({ fields: fields.filter((_, i) => i !== index) });
  }

  return (
    <div className="grid gap-4">
      <Field label="Title (optional)">
        <Input
          data-field="title"
          value={message.title ?? ''}
          onFocus={() => onFocusField('title')}
          onSelect={() => onFocusField('title')}
          onChange={(event) => update({ title: event.target.value || undefined })}
          maxLength={256}
        />
      </Field>
      <Field label="Description">
        <Textarea
          data-field="description"
          value={message.description ?? ''}
          onFocus={() => onFocusField('description')}
          onSelect={() => onFocusField('description')}
          onChange={(event) => update({ description: event.target.value })}
          maxLength={4096}
        />
      </Field>
      <Field label="Embed color">
        <Input
          type="color"
          value={`#${(message.color ?? 0x5865f2).toString(16).padStart(6, '0')}`}
          onChange={(event) => update({ color: Number.parseInt(event.target.value.replace('#', ''), 16) })}
        />
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Author name">
          <Input
            data-field="author"
            value={message.author?.name ?? ''}
            onFocus={() => onFocusField('author')}
            onSelect={() => onFocusField('author')}
            onChange={(event) => update({ author: event.target.value ? { name: event.target.value } : undefined })}
            maxLength={256}
          />
        </Field>
        <Field label="Author URL (optional)">
          <Input
            data-field="authorUrl"
            value={message.author?.url ?? ''}
            onFocus={() => onFocusField('authorUrl')}
            onSelect={() => onFocusField('authorUrl')}
            onChange={(event) =>
              update({
                author: message.author?.name
                  ? { name: message.author.name, url: event.target.value || undefined }
                  : undefined,
              })
            }
            placeholder="https://..."
          />
        </Field>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Footer text">
          <Input
            data-field="footer"
            value={message.footer?.text ?? ''}
            onFocus={() => onFocusField('footer')}
            onSelect={() => onFocusField('footer')}
            onChange={(event) => updateFooterText(event.target.value)}
            maxLength={2048}
          />
        </Field>
        <Field label="Footer icon">
          <Select value={message.footer?.iconSource ?? 'none'} onValueChange={(value) => updateFooterIconSource(value as EmbedFooterIconSource)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="user_avatar">User avatar</SelectItem>
              <SelectItem value="server_icon">Server icon</SelectItem>
              <SelectItem value="custom">Custom URL</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
      {message.footer?.iconSource === 'custom' ? (
        <Field label="Footer icon URL">
          <Input
            data-field="footerIconUrl"
            value={message.footer.iconUrl ?? ''}
            onFocus={() => onFocusField('footerIconUrl')}
            onSelect={() => onFocusField('footerIconUrl')}
            onChange={(event) => {
              const footer = message.footer;
              if (!footer) return;
              update({ footer: { ...footer, iconUrl: event.target.value || undefined } });
            }}
            placeholder="https://..."
          />
        </Field>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Thumbnail URL (optional)">
          <Input
            data-field="thumbnailUrl"
            value={message.thumbnailUrl ?? ''}
            onFocus={() => onFocusField('thumbnailUrl')}
            onSelect={() => onFocusField('thumbnailUrl')}
            onChange={(event) => update({ thumbnailUrl: event.target.value || undefined })}
            placeholder="https://..."
          />
        </Field>
        <Field label="Image URL (optional)">
          <Input
            data-field="imageUrl"
            value={message.imageUrl ?? ''}
            onFocus={() => onFocusField('imageUrl')}
            onSelect={() => onFocusField('imageUrl')}
            onChange={(event) => update({ imageUrl: event.target.value || undefined })}
            placeholder="https://..."
          />
        </Field>
      </div>
      <div className="rounded-lg border border-border p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Fields</p>
            <p className="text-xs text-muted-foreground">{fields.length}/25</p>
          </div>
          <Button type="button" variant="outline" size="xs" onClick={addField} disabled={fields.length >= 25}>
            <PlusIcon data-icon="inline-start" /> Add field
          </Button>
        </div>
        <div className="mt-3 grid gap-3">
          {fields.map((field, index) => (
            <EmbedFieldEditor
              key={index}
              index={index}
              field={field}
              total={fields.length}
              onFocusField={onFocusField}
              onChange={updateField}
              onMove={moveField}
              onDuplicate={duplicateField}
              onRemove={removeField}
            />
          ))}
          {fields.length === 0 ? <p className="text-sm text-muted-foreground">No fields yet.</p> : null}
        </div>
      </div>
    </div>
  );
}

function EmbedFieldEditor({
  index,
  field,
  total,
  onFocusField,
  onChange,
  onMove,
  onDuplicate,
  onRemove,
}: {
  index: number;
  field: { name: string; value: string; inline: boolean };
  total: number;
  onFocusField: (fieldId: string) => void;
  onChange: (index: number, patch: Partial<{ name: string; value: string; inline: boolean }>) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onDuplicate: (index: number) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="rounded-md bg-muted/20 p-3">
      <div className="mb-2 grid gap-2 md:grid-cols-2">
        <Field label={`Field name ${field.name.length}/256`}>
          <Input
            data-field={`field:${index}:name`}
            value={field.name}
            onFocus={() => onFocusField(`field:${index}:name`)}
            onSelect={() => onFocusField(`field:${index}:name`)}
            onChange={(event) => onChange(index, { name: event.target.value })}
            maxLength={256}
          />
        </Field>
        <Field label={`Field value ${field.value.length}/1024`}>
          <Input
            data-field={`field:${index}:value`}
            value={field.value}
            onFocus={() => onFocusField(`field:${index}:value`)}
            onSelect={() => onFocusField(`field:${index}:value`)}
            onChange={(event) => onChange(index, { value: event.target.value })}
            maxLength={1024}
          />
        </Field>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={field.inline}
            onCheckedChange={(checked) => onChange(index, { inline: checked === true })}
          />
          Inline
        </label>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon" className="size-7" disabled={index === 0} onClick={() => onMove(index, -1)} aria-label="Move field up">
            <span className="text-lg">↑</span>
          </Button>
          <Button type="button" variant="ghost" size="icon" className="size-7" disabled={index === total - 1} onClick={() => onMove(index, 1)} aria-label="Move field down">
            <span className="text-lg">↓</span>
          </Button>
          <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => onDuplicate(index)} aria-label="Duplicate field">
            <CopyIcon className="size-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => onRemove(index)} aria-label="Remove field">
            <TrashIcon className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
    </div>
  );
}

function fallbackInsert(message: CoreMessage, text: string, onChange: (message: CoreMessage) => void): void {
  if (message.type === 'text') {
    onChange({ ...message, content: `${message.content}${text}` });
    return;
  }
  if (message.type === 'embed') {
    onChange({ ...message, description: `${message.description ?? ''}${text}` });
    return;
  }
  const [firstContainer, ...restContainers] = message.components;
  if (!firstContainer) return;
  const [firstItem, ...restItems] = firstContainer.items;
  if (!firstItem || firstItem.type !== 'text_display') return;
  const updatedFirstItem = { ...firstItem, content: `${firstItem.content}${text}` };
  onChange({
    ...message,
    components: [{ ...firstContainer, items: [updatedFirstItem, ...restItems] }, ...restContainers],
  });
}

export function updateMessageField(message: CoreMessage, fieldId: string, value: string): CoreMessage | null {
  if (message.type === 'text') {
    if (fieldId === 'content') return { ...message, content: value };
    return null;
  }
  if (message.type === 'embed') {
    if (fieldId === 'content' || fieldId === 'description') return { ...message, description: value };
    if (fieldId === 'title') return { ...message, title: value || undefined };
    if (fieldId === 'author') return { ...message, author: value ? { name: value } : undefined };
    if (fieldId === 'authorUrl') {
      return message.author?.name
        ? { ...message, author: { ...message.author, url: value || undefined } }
        : message;
    }
    if (fieldId === 'footer') {
      return value
        ? { ...message, footer: { ...(message.footer ?? { iconSource: 'none' }), text: value } }
        : { ...message, footer: undefined };
    }
    if (fieldId === 'footerIconUrl') {
      return message.footer ? { ...message, footer: { ...message.footer, iconUrl: value || undefined } } : message;
    }
    if (fieldId === 'thumbnailUrl') return { ...message, thumbnailUrl: value || undefined };
    if (fieldId === 'imageUrl') return { ...message, imageUrl: value || undefined };
    if (fieldId.startsWith('field:')) {
      const [, indexText, target] = fieldId.split(':');
      const index = Number(indexText);
      if (Number.isNaN(index) || !['name', 'value'].includes(target ?? '')) return null;
      return {
        ...message,
        fields: (message.fields ?? []).map((field, i) => (i === index ? { ...field, [target as 'name' | 'value']: value } : field)),
      };
    }
    return null;
  }
  if (fieldId.startsWith('cv2:')) {
    const [, containerIndexText, itemIndexText, property] = fieldId.split(':');
    const containerIndex = Number(containerIndexText);
    const itemIndex = Number(itemIndexText);
    if (Number.isNaN(containerIndex) || Number.isNaN(itemIndex) || !property) return null;
    const components = message.components.map((container, ci) => {
      if (ci !== containerIndex) return container;
      const items = container.items.map((item, ii) => {
        if (ii !== itemIndex) return item;
        if (item.type === 'text_display' && property === 'content') return { ...item, content: value };
        if (item.type === 'section' && property === 'content') return { ...item, content: value };
        if (item.type === 'section' && (property === 'label' || property === 'url')) {
          return { ...item, accessory: { ...item.accessory, [property]: value || (property === 'url' ? undefined : item.accessory[property]) } };
        }
        if (item.type === 'button' && (property === 'label' || property === 'url')) {
          return { ...item, [property]: value || (property === 'url' ? undefined : item[property]) };
        }
        if (item.type === 'media' && (property === 'description' || property === 'url')) {
          return { ...item, [property]: value || (property === 'url' ? undefined : item[property]) };
        }
        return item;
      });
      return { ...container, items };
    });
    return { ...message, components };
  }
  return null;
}
