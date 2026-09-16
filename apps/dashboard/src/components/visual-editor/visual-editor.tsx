import {
  visualEditorLayoutSchema,
  type VisualEditorElement,
  type VisualEditorLayout,
} from '@vortex/types';
import { Canvas, FabricImage, FabricText, Rect } from 'fabric';
import type { FabricObject } from 'fabric';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AssetPanel } from './asset-panel.js';
import { CanvasToolbar } from './canvas-toolbar.js';
import { ElementInspector } from './element-inspector.js';
import { PreviewPanel } from './preview-panel.js';

export type VisualElementKind = VisualEditorElement['type'];
type EditorObject = FabricObject & {
  data?: { id: string; type: VisualElementKind; source?: string };
};

const initialLayout: VisualEditorLayout = {
  version: 1,
  width: 900,
  height: 320,
  backgroundColor: '#111827',
  elements: [],
};

export function VisualEditor({
  previewData = {},
  onChange,
}: {
  previewData?: Record<string, string>;
  onChange?: (layout: VisualEditorLayout) => void;
}) {
  const canvasElement = useRef<HTMLCanvasElement>(null);
  const fabricCanvas = useRef<Canvas | null>(null);
  const [layout, setLayout] = useState(initialLayout);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = layout.elements.find((element) => element.id === selectedId) ?? null;
  const json = useMemo(() => JSON.stringify(layout, null, 2), [layout]);

  const commit = useCallback(
    (elements: VisualEditorElement[]) => {
      const next = visualEditorLayoutSchema.parse({ ...layout, elements });
      setLayout(next);
      onChange?.(next);
    },
    [layout, onChange],
  );

  useEffect(() => {
    if (!canvasElement.current) return;
    const canvas = new Canvas(canvasElement.current, {
      width: initialLayout.width,
      height: initialLayout.height,
      backgroundColor: initialLayout.backgroundColor,
      preserveObjectStacking: true,
    });
    fabricCanvas.current = canvas;
    const select = () => {
      setSelectedId((canvas.getActiveObject() as EditorObject | undefined)?.data?.id ?? null);
    };
    const synchronize = ({ target }: { target: FabricObject }) => {
      const object = target as EditorObject;
      if (!object.data) return;
      setLayout((current) => {
        const elements = current.elements.map((element) =>
          element.id === object.data!.id ? fromFabricObject(element, object) : element,
        );
        const next = visualEditorLayoutSchema.parse({ ...current, elements });
        onChange?.(next);
        return next;
      });
    };
    canvas.on('selection:created', select);
    canvas.on('selection:updated', select);
    canvas.on('selection:cleared', () => setSelectedId(null));
    canvas.on('object:modified', synchronize);
    return () => {
      fabricCanvas.current = null;
      void canvas.dispose();
    };
  }, [onChange]);

  const addElement = useCallback(
    (kind: VisualElementKind, source = '') => {
      const id = `${kind}-${crypto.randomUUID()}`;
      const element = createElement(kind, id, source);
      const object = toFabricObject(element, previewData);
      fabricCanvas.current?.add(object);
      fabricCanvas.current?.setActiveObject(object);
      fabricCanvas.current?.requestRenderAll();
      setSelectedId(id);
      commit([...layout.elements, element]);
      if ((element.type === 'image' || element.type === 'background') && source) {
        void replaceWithRemoteImage(object, element, fabricCanvas.current);
      }
    },
    [commit, layout.elements, previewData],
  );

  const updateSelected = (patch: Partial<VisualEditorElement>) => {
    if (!selected) return;
    const next = { ...selected, ...patch } as VisualEditorElement;
    commit(layout.elements.map((element) => (element.id === selected.id ? next : element)));
    const object = fabricCanvas.current
      ?.getObjects()
      .find((candidate) => (candidate as EditorObject).data?.id === selected.id);
    if (object) {
      object.set({
        left: next.x,
        top: next.y,
        scaleX: next.width / (object.width || 1),
        scaleY: next.height / (object.height || 1),
        ...(next.type === 'text' ? { text: resolvePreview(next.text, previewData) } : {}),
      });
      object.setCoords();
      fabricCanvas.current?.requestRenderAll();
    }
  };

  const importLayout = (serialized: string) => {
    const imported = visualEditorLayoutSchema.parse(JSON.parse(serialized) as unknown);
    const canvas = fabricCanvas.current;
    canvas?.clear();
    canvas?.set({ backgroundColor: imported.backgroundColor });
    for (const element of imported.elements) {
      const object = toFabricObject(element, previewData);
      canvas?.add(object);
      if ((element.type === 'image' || element.type === 'background') && element.source) {
        void replaceWithRemoteImage(object, element, canvas);
      }
    }
    canvas?.requestRenderAll();
    setLayout(imported);
    setSelectedId(null);
    onChange?.(imported);
  };

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <CanvasToolbar onAdd={addElement} />
      <div className="grid lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0 bg-black/20 p-4">
          <div className="mx-auto max-w-full overflow-hidden rounded-md border border-border bg-[#111827]">
            <canvas ref={canvasElement} className="max-w-full" aria-label="Visual layout canvas" />
          </div>
        </div>
        <aside className="border-t border-border bg-card lg:border-l lg:border-t-0">
          <ElementInspector element={selected} onChange={updateSelected} />
          <AssetPanel
            onAddImage={(url, background) => addElement(background ? 'background' : 'image', url)}
          />
        </aside>
      </div>
      <PreviewPanel json={json} onImport={importLayout} />
    </div>
  );
}

function createElement(type: VisualElementKind, id: string, source: string): VisualEditorElement {
  if (type === 'text') {
    return {
      id,
      type,
      x: 48,
      y: 48,
      width: 360,
      height: 58,
      rotation: 0,
      opacity: 1,
      text: 'Hello [userName]',
      fontFamily: 'Arial',
      fontSize: 38,
      fill: '#ffffff',
    };
  }
  return {
    id,
    type,
    x: type === 'background' ? 0 : 520,
    y: type === 'background' ? 0 : 55,
    width: type === 'background' ? 900 : 160,
    height: type === 'background' ? 320 : 160,
    rotation: 0,
    opacity: type === 'background' ? 0.35 : 1,
    source,
    fit: 'cover',
  };
}

function toFabricObject(
  element: VisualEditorElement,
  previewData: Record<string, string>,
): EditorObject {
  if (element.type === 'text') {
    const text = new FabricText(resolvePreview(element.text, previewData), {
      left: element.x,
      top: element.y,
      width: element.width,
      height: element.height,
      fontFamily: element.fontFamily,
      fontSize: element.fontSize,
      fill: element.fill,
      opacity: element.opacity,
      angle: element.rotation,
    }) as EditorObject;
    text.data = { id: element.id, type: element.type };
    return text;
  }
  const fill =
    element.type === 'avatar' ? '#5865f2' : element.type === 'server_icon' ? '#22c55e' : '#334155';
  const object = new Rect({
    left: element.x,
    top: element.y,
    width: element.width,
    height: element.height,
    fill,
    opacity: element.opacity,
    angle: element.rotation,
    rx: element.type === 'avatar' || element.type === 'server_icon' ? element.width / 2 : 8,
    ry: element.type === 'avatar' || element.type === 'server_icon' ? element.height / 2 : 8,
  }) as EditorObject;
  object.data = { id: element.id, type: element.type, source: element.source };
  return object;
}

async function replaceWithRemoteImage(
  placeholder: EditorObject,
  element: Exclude<VisualEditorElement, { type: 'text' }>,
  canvas: Canvas | null,
): Promise<void> {
  if (!canvas) return;
  const image = (await FabricImage.fromURL(element.source, {
    crossOrigin: 'anonymous',
  })) as EditorObject;
  image.set({
    left: element.x,
    top: element.y,
    scaleX: element.width / (image.width || 1),
    scaleY: element.height / (image.height || 1),
    opacity: element.opacity,
    angle: element.rotation,
    selectable: element.type !== 'background',
  });
  image.data = { id: element.id, type: element.type, source: element.source };
  canvas.remove(placeholder);
  canvas.add(image);
  if (element.type === 'background') {
    canvas.sendObjectToBack(image);
  }
  canvas.requestRenderAll();
}

function fromFabricObject(element: VisualEditorElement, object: FabricObject): VisualEditorElement {
  return {
    ...element,
    x: object.left,
    y: object.top,
    width: Math.max(1, object.getScaledWidth()),
    height: Math.max(1, object.getScaledHeight()),
    rotation: object.angle,
    opacity: object.opacity,
  };
}

function resolvePreview(value: string, data: Record<string, string>): string {
  return value.replace(
    /\[([A-Za-z][A-Za-z0-9_]*)\]/g,
    (placeholder, name: string) => data[name] ?? placeholder,
  );
}
