import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@vortex/ui';
import type { ComponentsV2Button, ComponentsV2Container, ComponentsV2Item, ComponentsV2Message, ComponentsV2Select } from '@vortex/types';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CopyIcon,
  GripVerticalIcon,
  PlusIcon,
  TrashIcon,
} from 'lucide-react';
import { useState, type ComponentType, type DragEvent } from 'react';

const buttonStyles: Array<{ value: ComponentsV2Button['style']; label: string }> = [
  { value: 'primary', label: 'Primary' },
  { value: 'secondary', label: 'Secondary' },
  { value: 'success', label: 'Success' },
  { value: 'danger', label: 'Danger' },
  { value: 'link', label: 'Link' },
];

export interface ComponentsV2BuilderProps {
  message: ComponentsV2Message;
  onFocusField?: (fieldId: string) => void;
  onChange: (message: ComponentsV2Message) => void;
}

export function ComponentsV2Builder({ message, onFocusField, onChange }: ComponentsV2BuilderProps) {
  const containers = message.components;
  const [dragging, setDragging] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  function updateContainers(nextContainers: ComponentsV2Container[]) {
    onChange({ ...message, components: nextContainers });
  }

  function addContainer() {
    updateContainers([...containers, { type: 'container', spoiler: false, items: [{ type: 'text_display', content: '' }] }]);
  }

  function moveContainer(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= containers.length) return;
    const nextContainers = [...containers];
    [nextContainers[index], nextContainers[nextIndex]] = [nextContainers[nextIndex]!, nextContainers[index]!];
    updateContainers(nextContainers);
  }

  function duplicateContainer(index: number) {
    const container = containers[index];
    if (!container) return;
    updateContainers([...containers.slice(0, index + 1), deepCloneContainer(container), ...containers.slice(index + 1)]);
  }

  function removeContainer(index: number) {
    if (containers.length <= 1) return;
    updateContainers(containers.filter((_, i) => i !== index));
  }

  function updateContainer(index: number, patch: Partial<ComponentsV2Container>) {
    updateContainers(containers.map((container, i) => (i === index ? { ...container, ...patch } : container)));
  }

  function updateItems(containerIndex: number, nextItems: ComponentsV2Item[]) {
    updateContainer(containerIndex, { items: nextItems });
  }

  function toggleCollapsed(key: string) {
    setCollapsed((state) => ({ ...state, [key]: !state[key] }));
  }

  function handleDragStart(event: DragEvent, id: string) {
    setDragging(id);
    event.dataTransfer.setData('text/plain', id);
    event.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }

  function handleContainerDrop(targetIndex: number) {
    if (!dragging?.startsWith('container:')) return;
    const sourceIndex = Number(dragging.split(':')[1]);
    if (Number.isNaN(sourceIndex) || sourceIndex === targetIndex) return;
    const nextContainers = [...containers];
    const [moved] = nextContainers.splice(sourceIndex, 1);
    if (!moved) return;
    nextContainers.splice(targetIndex, 0, moved);
    updateContainers(nextContainers);
    setDragging(null);
  }

  function handleItemDrop(containerIndex: number, targetItemIndex: number) {
    if (!dragging?.startsWith('item:')) return;
    const [, sourceContainerText, sourceItemText] = dragging.split(':');
    const sourceContainerIndex = Number(sourceContainerText);
    const sourceItemIndex = Number(sourceItemText);
    if (Number.isNaN(sourceContainerIndex) || Number.isNaN(sourceItemIndex) || sourceContainerIndex !== containerIndex) return;
    if (sourceItemIndex === targetItemIndex) return;
    const container = containers[containerIndex];
    if (!container) return;
    const items = [...container.items];
    const [moved] = items.splice(sourceItemIndex, 1);
    if (!moved) return;
    items.splice(targetItemIndex, 0, moved);
    updateItems(containerIndex, items);
    setDragging(null);
  }

  return (
    <div className="flex flex-col gap-4">
      {containers.map((container, containerIndex) => {
        const containerKey = `container:${containerIndex}`;
        const containerCollapsed = collapsed[containerKey] === true;
        return (
          <Card key={containerIndex} className="overflow-hidden" onDragOver={handleDragOver} onDrop={() => handleContainerDrop(containerIndex)}>
            <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <button type="button" className="text-muted-foreground" onClick={() => toggleCollapsed(containerKey)} aria-label={containerCollapsed ? 'Expand container' : 'Collapse container'}>
                  {containerCollapsed ? <ChevronRightIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}
                </button>
                <div draggable onDragStart={(event) => handleDragStart(event, containerKey)} className="cursor-grab text-muted-foreground active:cursor-grabbing" aria-label="Drag container">
                  <GripVerticalIcon className="size-4" />
                </div>
                <CardTitle className="truncate text-sm">Container {containerIndex + 1}</CardTitle>
                <span className="text-xs text-muted-foreground">{container.items.length} item{container.items.length === 1 ? '' : 's'}</span>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <BuilderButton icon={ArrowUpIcon} label="Move container up" disabled={containerIndex === 0} onClick={() => moveContainer(containerIndex, -1)} />
                <BuilderButton icon={ArrowDownIcon} label="Move container down" disabled={containerIndex === containers.length - 1} onClick={() => moveContainer(containerIndex, 1)} />
                <BuilderButton icon={CopyIcon} label="Duplicate container" onClick={() => duplicateContainer(containerIndex)} />
                <BuilderButton icon={TrashIcon} label="Remove container" disabled={containers.length <= 1} onClick={() => removeContainer(containerIndex)} />
              </div>
            </CardHeader>
            {!containerCollapsed ? (
              <CardContent className="flex flex-col gap-3 p-4">
                {container.items.map((item, itemIndex) => {
                  const itemKey = `item:${containerIndex}:${itemIndex}`;
                  const itemCollapsed = collapsed[itemKey] === true;
                  return (
                    <div key={itemIndex} className="rounded-lg border border-border bg-card/50 p-3" onDragOver={handleDragOver} onDrop={() => handleItemDrop(containerIndex, itemIndex)}>
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <button type="button" className="text-muted-foreground" onClick={() => toggleCollapsed(itemKey)} aria-label={itemCollapsed ? 'Expand item' : 'Collapse item'}>
                            {itemCollapsed ? <ChevronRightIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}
                          </button>
                          <div draggable onDragStart={(event) => handleDragStart(event, itemKey)} className="cursor-grab text-muted-foreground active:cursor-grabbing" aria-label="Drag item">
                            <GripVerticalIcon className="size-4" />
                          </div>
                          <span className="truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">{formatItemType(item.type)}</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <BuilderButton icon={ArrowUpIcon} label="Move item up" disabled={itemIndex === 0} onClick={() => moveItem(containerIndex, itemIndex, -1, containers, updateItems)} />
                          <BuilderButton icon={ArrowDownIcon} label="Move item down" disabled={itemIndex === container.items.length - 1} onClick={() => moveItem(containerIndex, itemIndex, 1, containers, updateItems)} />
                          <BuilderButton icon={CopyIcon} label="Duplicate item" onClick={() => duplicateItem(containerIndex, itemIndex, containers, updateItems)} />
                          <BuilderButton icon={TrashIcon} label="Remove item" disabled={container.items.length <= 1} onClick={() => removeItem(containerIndex, itemIndex, containers, updateItems)} />
                        </div>
                      </div>
                      {!itemCollapsed ? (
                        <ItemEditor
                          item={item}
                          fieldPrefix={`cv2:${containerIndex}:${itemIndex}`}
                          onFocusField={onFocusField}
                          onChange={(nextItem) => updateItems(containerIndex, container.items.map((entry, i) => (i === itemIndex ? nextItem : entry)))}
                        />
                      ) : null}
                    </div>
                  );
                })}
                <AddItemMenu onAdd={(type) => updateItems(containerIndex, [...container.items, createDefaultItem(type)])} />
              </CardContent>
            ) : null}
          </Card>
        );
      })}
      <Button type="button" variant="outline" size="sm" onClick={addContainer} className="w-fit">
        <PlusIcon data-icon="inline-start" /> Add container
      </Button>
    </div>
  );
}

function ItemEditor({
  item,
  fieldPrefix,
  onFocusField,
  onChange,
}: {
  item: ComponentsV2Item;
  fieldPrefix: string;
  onFocusField: ((fieldId: string) => void) | undefined;
  onChange: (item: ComponentsV2Item) => void;
}) {
  if (item.type === 'text_display') {
    return (
      <div className="grid gap-2">
        <Label className="text-xs">Text content</Label>
        <Textarea
          data-field={`${fieldPrefix}:content`}
          value={item.content}
          onFocus={() => onFocusField?.(`${fieldPrefix}:content`)}
          onSelect={() => onFocusField?.(`${fieldPrefix}:content`)}
          onChange={(event) => onChange({ ...item, content: event.target.value })}
          placeholder="Enter text..."
          className="min-h-[80px]"
        />
      </div>
    );
  }
  if (item.type === 'separator') {
    return (
      <div className="flex flex-wrap items-center gap-4">
        <ToggleItem label="Show divider" checked={item.divider} onCheckedChange={(divider) => onChange({ ...item, divider })} />
        <div className="grid gap-2">
          <Label className="text-xs">Spacing</Label>
          <Select value={item.spacing} onValueChange={(spacing) => onChange({ ...item, spacing: spacing as typeof item.spacing })}>
            <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="small">Small</SelectItem>
              <SelectItem value="large">Large</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }
  if (item.type === 'media') {
    return (
      <div className="grid gap-3">
        <div className="grid gap-2">
          <Label className="text-xs">Media URL</Label>
          <Input data-field={`${fieldPrefix}:url`} value={item.url} onFocus={() => onFocusField?.(`${fieldPrefix}:url`)} onSelect={() => onFocusField?.(`${fieldPrefix}:url`)} onChange={(event) => onChange({ ...item, url: event.target.value })} placeholder="https://..." />
        </div>
        <div className="grid gap-2">
          <Label className="text-xs">Description (optional)</Label>
          <Input data-field={`${fieldPrefix}:description`} value={item.description ?? ''} onFocus={() => onFocusField?.(`${fieldPrefix}:description`)} onSelect={() => onFocusField?.(`${fieldPrefix}:description`)} onChange={(event) => onChange({ ...item, description: event.target.value || undefined })} placeholder="Description" />
        </div>
      </div>
    );
  }
  if (item.type === 'section') {
    return (
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label className="text-xs">Section text</Label>
          <Textarea data-field={`${fieldPrefix}:content`} value={item.content} onFocus={() => onFocusField?.(`${fieldPrefix}:content`)} onSelect={() => onFocusField?.(`${fieldPrefix}:content`)} onChange={(event) => onChange({ ...item, content: event.target.value })} placeholder="Section content..." className="min-h-[60px]" />
        </div>
        <div className="rounded-md border border-border p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Accessory button</p>
          <ButtonEditor button={item.accessory} fieldPrefix={fieldPrefix} onFocusField={onFocusField} onChange={(accessory) => onChange({ ...item, accessory })} />
        </div>
      </div>
    );
  }
  if (item.type === 'select') {
    return <SelectEditor select={item} fieldPrefix={fieldPrefix} onFocusField={onFocusField} onChange={onChange} />;
  }
  return (
    <div className="rounded-md border border-border p-3">
      <ButtonEditor button={item} fieldPrefix={fieldPrefix} onFocusField={onFocusField} onChange={onChange} />
    </div>
  );
}

function ButtonEditor({
  button,
  fieldPrefix,
  onFocusField,
  onChange,
}: {
  button: ComponentsV2Button;
  fieldPrefix: string;
  onFocusField: ((fieldId: string) => void) | undefined;
  onChange: (button: ComponentsV2Button) => void;
}) {
  return (
    <div className="grid gap-3">
      <div className="grid gap-2">
        <Label className="text-xs">Button ID</Label>
        <Input value={button.id} onChange={(event) => onChange({ ...button, id: event.target.value })} placeholder="unique-button-id" />
      </div>
      <div className="grid gap-2">
        <Label className="text-xs">Label</Label>
        <Input data-field={`${fieldPrefix}:label`} value={button.label} onFocus={() => onFocusField?.(`${fieldPrefix}:label`)} onSelect={() => onFocusField?.(`${fieldPrefix}:label`)} onChange={(event) => onChange({ ...button, label: event.target.value })} placeholder="Click me" />
      </div>
      <div className="grid gap-2">
        <Label className="text-xs">Style</Label>
        <Select value={button.style} onValueChange={(style) => onChange({ ...button, style: style as ComponentsV2Button['style'] })}>
          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            {buttonStyles.map((style) => <SelectItem key={style.value} value={style.value}>{style.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {button.style === 'link' ? (
        <div className="grid gap-2">
          <Label className="text-xs">URL</Label>
          <Input data-field={`${fieldPrefix}:url`} value={button.url ?? ''} onFocus={() => onFocusField?.(`${fieldPrefix}:url`)} onSelect={() => onFocusField?.(`${fieldPrefix}:url`)} onChange={(event) => onChange({ ...button, url: event.target.value || undefined })} placeholder="https://..." />
        </div>
      ) : null}
      <ToggleItem label="Disabled" checked={button.disabled} onCheckedChange={(disabled) => onChange({ ...button, disabled })} />
    </div>
  );
}

function SelectEditor({
  select,
  fieldPrefix,
  onFocusField,
  onChange,
}: {
  select: ComponentsV2Select;
  fieldPrefix: string;
  onFocusField: ((fieldId: string) => void) | undefined;
  onChange: (select: ComponentsV2Select) => void;
}) {
  const optionsText = select.options
    .map((option) => [option.label, option.value, option.description ?? ''].join(' | '))
    .join('\n');
  return (
    <div className="grid gap-3">
      <div className="grid gap-2">
        <Label className="text-xs">Select ID</Label>
        <Input value={select.id} onChange={(event) => onChange({ ...select, id: event.target.value })} placeholder="unique-select-id" />
      </div>
      <div className="grid gap-2">
        <Label className="text-xs">Placeholder</Label>
        <Input data-field={`${fieldPrefix}:placeholder`} value={select.placeholder ?? ''} onFocus={() => onFocusField?.(`${fieldPrefix}:placeholder`)} onChange={(event) => onChange({ ...select, placeholder: event.target.value || undefined })} placeholder="Select an option..." />
      </div>
      <div className="grid gap-2">
        <Label className="text-xs">Options (one per line: Label | value | optional description)</Label>
        <Textarea
          value={optionsText}
          data-field={`${fieldPrefix}:options`}
          onFocus={() => onFocusField?.(`${fieldPrefix}:options`)}
          onSelect={() => onFocusField?.(`${fieldPrefix}:options`)}
          onChange={(event) => {
            const lines = event.target.value.split(/\r?\n/);
            const options = lines
              .map((line) => {
                const parts = line.split('|').map((part) => part.trim());
                const [label, value, description] = parts;
                if (!label || !value) {
                  return null;
                }
                return {
                  label,
                  value,
                  ...(description ? { description } : {}),
                };
              })
              .filter((option): option is NonNullable<typeof option> => option !== null);
            onChange({ ...select, options });
          }}
          placeholder={`Support | support\n🎫 General | general | Open a general ticket`}
          className="min-h-[100px]"
        />
      </div>
      <div className="grid gap-2">
        <Label className="text-xs">Min values</Label>
        <Input type="number" value={select.minValues} onChange={(event) => onChange({ ...select, minValues: Math.max(0, Number(event.target.value) || 0) })} />
      </div>
      <div className="grid gap-2">
        <Label className="text-xs">Max values</Label>
        <Input type="number" value={select.maxValues} onChange={(event) => onChange({ ...select, maxValues: Math.max(1, Number(event.target.value) || 1) })} />
      </div>
      <ToggleItem label="Disabled" checked={select.disabled} onCheckedChange={(disabled) => onChange({ ...select, disabled })} />
    </div>
  );
}

function AddItemMenu({ onAdd }: { onAdd: (type: ComponentsV2Item['type']) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border p-3">
      <span className="text-xs text-muted-foreground">Add item:</span>
      <Button type="button" variant="outline" size="xs" onClick={() => onAdd('text_display')}>Text</Button>
      <Button type="button" variant="outline" size="xs" onClick={() => onAdd('section')}>Section</Button>
      <Button type="button" variant="outline" size="xs" onClick={() => onAdd('button')}>Button</Button>
      <Button type="button" variant="outline" size="xs" onClick={() => onAdd('media')}>Media</Button>
      <Button type="button" variant="outline" size="xs" onClick={() => onAdd('separator')}>Separator</Button>
      <Button type="button" variant="outline" size="xs" onClick={() => onAdd('select')}>Select</Button>
    </div>
  );
}

function BuilderButton({ icon: Icon, label, disabled, onClick }: { icon: ComponentType<{ className?: string }>; label: string; disabled?: boolean; onClick: () => void }) {
  return (
    <Button type="button" variant="ghost" size="icon" className="size-7" disabled={disabled} onClick={onClick} aria-label={label}>
      <Icon className="size-4" />
    </Button>
  );
}

function ToggleItem({ label, checked, onCheckedChange }: { label: string; checked: boolean; onCheckedChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox checked={checked} onCheckedChange={(value) => onCheckedChange(value === true)} />
      <Label className="text-xs font-normal">{label}</Label>
    </div>
  );
}

function createDefaultItem(type: ComponentsV2Item['type']): ComponentsV2Item {
  if (type === 'text_display') return { type, content: '' };
  if (type === 'separator') return { type, spacing: 'small', divider: true };
  if (type === 'media') return { type, url: '', description: undefined, spoiler: false };
  if (type === 'section') {
    return {
      type,
      content: '',
      accessory: { type: 'button', id: `button-${Date.now()}`, label: 'Open', style: 'secondary', disabled: false },
    };
  }
  if (type === 'select') {
    return {
      type,
      id: `select-${Date.now()}`,
      placeholder: 'Select an option...',
      options: [{ label: 'Option 1', value: 'value-1' }],
      minValues: 1,
      maxValues: 1,
      disabled: false,
    };
  }
  return { type: 'button', id: `button-${Date.now()}`, label: 'Button', style: 'primary', disabled: false };
}

function deepCloneContainer(container: ComponentsV2Container): ComponentsV2Container {
  return JSON.parse(JSON.stringify(container)) as ComponentsV2Container;
}

function moveItem(containerIndex: number, itemIndex: number, direction: -1 | 1, containers: ComponentsV2Container[], updateItems: (containerIndex: number, items: ComponentsV2Item[]) => void) {
  const container = containers[containerIndex];
  if (!container) return;
  const items = [...container.items];
  const nextIndex = itemIndex + direction;
  if (nextIndex < 0 || nextIndex >= items.length) return;
  [items[itemIndex], items[nextIndex]] = [items[nextIndex]!, items[itemIndex]!];
  updateItems(containerIndex, items);
}

function duplicateItem(containerIndex: number, itemIndex: number, containers: ComponentsV2Container[], updateItems: (containerIndex: number, items: ComponentsV2Item[]) => void) {
  const container = containers[containerIndex];
  if (!container) return;
  const items = [...container.items];
  const item = items[itemIndex];
  if (!item) return;
  items.splice(itemIndex + 1, 0, deepCloneItem(item));
  updateItems(containerIndex, items);
}

function removeItem(containerIndex: number, itemIndex: number, containers: ComponentsV2Container[], updateItems: (containerIndex: number, items: ComponentsV2Item[]) => void) {
  const container = containers[containerIndex];
  if (!container || container.items.length <= 1) return;
  updateItems(containerIndex, container.items.filter((_, i) => i !== itemIndex));
}

function deepCloneItem(item: ComponentsV2Item): ComponentsV2Item {
  const clone = JSON.parse(JSON.stringify(item)) as ComponentsV2Item;
  if (clone.type === 'button') clone.id = `${clone.id}-copy`;
  if (clone.type === 'select') clone.id = `${clone.id}-copy`;
  if (clone.type === 'section') clone.accessory.id = `${clone.accessory.id}-copy`;
  return clone;
}

function formatItemType(type: ComponentsV2Item['type']): string {
  if (type === 'text_display') return 'Text';
  if (type === 'separator') return 'Separator';
  if (type === 'media') return 'Media';
  if (type === 'section') return 'Section';
  if (type === 'select') return 'Select';
  return 'Button';
}
