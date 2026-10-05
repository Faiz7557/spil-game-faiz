/*
 * A dashboard of widgets the viewer can reorder (drag, or keyboard: focus the handle, Space, arrows, Space) and
 * hide. Adapted from the 21st.dev "draggable widget grid" idea on @dnd-kit, with a 12-column dense grid so mixed
 * widths pack without holes. Layout state is owned by the caller (one per role preset) and persisted there.
 */
import { useState, type ReactNode } from "react";
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { EyeOff, GripVertical, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export type WidgetSpan = "third" | "half" | "two-thirds" | "full";
const SPAN: Record<WidgetSpan, string> = {
  third: "xl:col-span-4", half: "xl:col-span-6", "two-thirds": "xl:col-span-8", full: "xl:col-span-12",
};
const SPAN_MD: Record<WidgetSpan, string> = { third: "md:col-span-6", half: "md:col-span-6", "two-thirds": "md:col-span-12", full: "md:col-span-12" };

export interface Widget { id: string; title: string; span: WidgetSpan; render: () => ReactNode }
export interface WidgetLayout { order: string[]; hidden: string[] }

/** Reconcile a stored layout with the current widget set (new widgets append, removed ones drop out). */
export function normalizeLayout(layout: WidgetLayout, ids: string[]): WidgetLayout {
  const order = layout.order.filter((id) => ids.includes(id));
  ids.forEach((id) => { if (!order.includes(id)) order.push(id); });
  return { order, hidden: layout.hidden.filter((id) => ids.includes(id)) };
}

function Sortable({ w, editing, onHide, children }: { w: Widget; editing: boolean; onHide: () => void; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: w.id, disabled: !editing });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("relative col-span-12 min-w-0", SPAN_MD[w.span], SPAN[w.span], isDragging && "z-10 opacity-30")}>
      {editing && (
        <div className="pointer-events-none absolute inset-0 z-20 rounded-[14px] outline-2 outline-dashed outline-offset-2 outline-line-hot">
          <div className="pointer-events-auto absolute right-2 top-2 flex items-center gap-1 rounded-lg border border-line-strong bg-panel-2/95 p-1 shadow-[0_8px_24px_-8px_rgb(var(--shade-rgb)/calc(0.8*var(--shade-k)))] backdrop-blur">
            <button ref={setActivatorNodeRef} type="button" {...attributes} {...listeners}
              className="flex h-7 cursor-grab items-center gap-1.5 rounded-md px-2 text-[12px] font-medium text-ink-2 hover:bg-fg/[0.06] hover:text-ink-hi active:cursor-grabbing"
              aria-label={`Move ${w.title}. Press space to pick up, arrow keys to move, space to drop.`}>
              <GripVertical className="size-3.5" aria-hidden="true" />{w.title}
            </button>
            <button type="button" onClick={onHide} className="grid size-7 place-items-center rounded-md text-ink-3 hover:bg-danger-soft hover:text-danger-ink" aria-label={`Hide ${w.title}`} title="Hide widget">
              <EyeOff className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
      <div className={cn("h-full transition-transform duration-200 ease-out-soft", editing && "pointer-events-none select-none [&_*]:!animate-none")} aria-hidden={editing ? undefined : undefined}>
        {children}
      </div>
    </div>
  );
}

export function WidgetGrid({ widgets, layout, onChange, editing }: {
  widgets: Widget[]; layout: WidgetLayout; onChange: (l: WidgetLayout) => void; editing: boolean;
}) {
  const [active, setActive] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const byId = new Map(widgets.map((w) => [w.id, w]));
  const visible = layout.order.filter((id) => !layout.hidden.includes(id) && byId.has(id));
  const hidden = layout.hidden.filter((id) => byId.has(id));

  const onStart = (e: DragStartEvent) => setActive(String(e.active.id));
  const onEnd = (e: DragEndEvent) => {
    setActive(null);
    const { active: a, over } = e;
    if (!over || a.id === over.id) return;
    const from = layout.order.indexOf(String(a.id)), to = layout.order.indexOf(String(over.id));
    onChange({ ...layout, order: arrayMove(layout.order, from, to) });
  };
  const activeW = active ? byId.get(active) : null;

  return (
    <div className="tw">
      {editing && hidden.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-line-strong bg-fg/[0.02] px-3 py-2.5 [animation:pp-pop_180ms_cubic-bezier(0.16,1,0.3,1)]">
          <span className="text-[12.5px] text-ink-3">Hidden widgets</span>
          {hidden.map((id) => (
            <button key={id} type="button" onClick={() => onChange({ ...layout, hidden: layout.hidden.filter((h) => h !== id) })}
              className="chip"><Plus className="size-3.5" aria-hidden="true" />{byId.get(id)!.title}</button>
          ))}
        </div>
      )}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onStart} onDragEnd={onEnd} onDragCancel={() => setActive(null)}>
        <SortableContext items={visible} strategy={rectSortingStrategy}>
          <div className="grid grid-flow-row-dense grid-cols-12 gap-4">
            {visible.map((id) => {
              const w = byId.get(id)!;
              return (
                <Sortable key={id} w={w} editing={editing} onHide={() => onChange({ ...layout, hidden: [...layout.hidden, id] })}>
                  {w.render()}
                </Sortable>
              );
            })}
          </div>
        </SortableContext>
        <DragOverlay dropAnimation={{ duration: 220, easing: "cubic-bezier(0.16,1,0.3,1)" }}>
          {activeW && (
            <div className="flex h-24 items-center gap-2 rounded-[14px] border border-line-hot bg-panel-2/95 px-5 text-[14px] font-medium text-ink-hi shadow-[0_30px_60px_-20px_rgb(var(--shade-rgb)/calc(0.9*var(--shade-k))),0_0_0_1px_rgb(var(--accent-rgb)/0.3)] backdrop-blur">
              <GripVertical className="size-4 text-accent-ink" aria-hidden="true" />{activeW.title}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
