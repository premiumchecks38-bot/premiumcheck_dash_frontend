"use client";

import * as React from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

/**
 * Drag and drop reordering with full keyboard support: focus a handle, press Space to pick the
 * item up, the arrow keys to move it and Space again to drop it (Escape cancels). Screen
 * readers hear where the item is. Used for categories, services, price options, FAQs, reviews,
 * page sections and areas. When `disabled` (view only), the handles are hidden.
 */
export interface SortableListProps<T> {
  items: T[];
  getId: (item: T) => string;
  getLabel: (item: T) => string;
  onReorder: (items: T[]) => void;
  renderItem: (item: T, handle: React.ReactNode, index: number) => React.ReactNode;
  disabled?: boolean;
  label: string;
  className?: string;
  testId?: string;
}

export function SortableList<T>({
  items,
  getId,
  getLabel,
  onReorder,
  renderItem,
  disabled,
  label,
  className,
  testId,
}: SortableListProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = items.map(getId);
  const nameOf = (id: string | number) => {
    const item = items.find((i) => getId(i) === String(id));
    return item ? getLabel(item) : "item";
  };
  const position = (id: string | number) => ids.indexOf(String(id)) + 1;

  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      `Picked up ${nameOf(active.id)}, position ${String(position(active.id))} of ${String(ids.length)}.`,
    onDragOver: ({ active, over }) =>
      over
        ? `${nameOf(active.id)} is over position ${String(position(over.id))} of ${String(ids.length)}.`
        : `${nameOf(active.id)} is no longer over the list.`,
    onDragEnd: ({ active, over }) =>
      over
        ? `${nameOf(active.id)} dropped at position ${String(position(over.id))} of ${String(ids.length)}.`
        : `${nameOf(active.id)} dropped.`,
    onDragCancel: ({ active }) => `Moving ${nameOf(active.id)} was cancelled.`,
  };

  const end = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(items, from, to));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={end}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            "To reorder, press Space or Enter to pick up the item, use the arrow keys to move it, then press Space or Enter to drop it. Press Escape to cancel.",
        },
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul aria-label={label} className={cn("space-y-2", className)} data-testid={testId}>
          {items.map((item, index) => (
            <SortableRow
              key={getId(item)}
              id={getId(item)}
              label={getLabel(item)}
              disabled={disabled}
              render={(handle) => renderItem(item, handle, index)}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({
  id,
  label,
  disabled,
  render,
}: {
  id: string;
  label: string;
  disabled?: boolean;
  render: (handle: React.ReactNode) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });
  const handle = disabled ? null : (
    <Button
      ref={setActivatorNodeRef}
      type="button"
      variant="control"
      size="none"
      className="flex min-h-touch min-w-8 shrink-0 cursor-grab items-center justify-center rounded-md text-text-muted hover:bg-surface-alt focus-visible:outline-focus focus-visible:outline-focus-ring active:cursor-grabbing"
      aria-label={`Reorder ${label}`}
      data-testid="sort-handle"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-4 w-4" aria-hidden="true" />
    </Button>
  );
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("relative", isDragging && "z-dropdown opacity-80")}
    >
      {render(handle)}
    </li>
  );
}

/** Sort orders for the reorder endpoints (ReorderRequest): 0, 1, 2 in list order. */
export function reorderPayload<T>(items: T[], getId: (item: T) => string) {
  return { items: items.map((item, index) => ({ id: getId(item), sort_order: index })) };
}
