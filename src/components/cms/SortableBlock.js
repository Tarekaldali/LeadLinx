'use client';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';

export default function SortableBlock({ id, children, onDelete, onDuplicate }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const [showMenu, setShowMenu] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-xl border transition-all ${
        isDragging
          ? 'border-primary shadow-lg bg-surface-container-lowest'
          : 'border-transparent hover:border-[#EEEEEE] hover:bg-surface-container-lowest hover:shadow-sm'
      } py-3 px-3`}
    >
      {/* Left-side action bar */}
      <div className="absolute left-[-36px] top-4 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          type="button"
          className="w-7 h-7 flex items-center justify-center rounded text-secondary hover:text-on-surface hover:bg-surface-container-low cursor-grab active:cursor-grabbing transition-colors"
          title="Drag to reorder"
        >
          <span className="material-symbols-outlined text-[18px]">drag_indicator</span>
        </button>

        {/* Options button */}
        <div className="relative">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowMenu((v) => !v); }}
            className="w-7 h-7 flex items-center justify-center rounded text-secondary hover:text-on-surface hover:bg-surface-container-low transition-colors"
            title="Block options"
          >
            <span className="material-symbols-outlined text-[18px]">more_vert</span>
          </button>

          {showMenu && (
            <>
              {/* Click-outside overlay */}
              <div
                className="fixed inset-0 z-[49]"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute left-full ml-2 top-0 bg-surface-container-lowest border border-[#EEEEEE] shadow-lg rounded-xl w-36 py-1 z-[50]">
                <button
                  type="button"
                  onClick={() => { onDuplicate(); setShowMenu(false); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-surface-container-low text-on-surface flex items-center gap-2 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px] text-secondary">content_copy</span>
                  Duplicate
                </button>
                <div className="h-px bg-[#EEEEEE] mx-2 my-1" />
                <button
                  type="button"
                  onClick={() => { onDelete(); setShowMenu(false); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-error/5 text-error flex items-center gap-2 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Block content */}
      <div className="relative">{children}</div>
    </div>
  );
}
