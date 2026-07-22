'use client';
import { useState, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import SortableBlock from './SortableBlock';
import ParagraphBlock from './blocks/ParagraphBlock';
import HeadingBlock from './blocks/HeadingBlock';
import ImageBlock from './blocks/ImageBlock';
import FaqBlock from './blocks/FaqBlock';
import CtaBlock from './blocks/CtaBlock';
import HtmlBlock from './blocks/HtmlBlock';

const BLOCK_TYPES = [
  { type: 'paragraph', icon: 'subject', label: 'Text' },
  { type: 'h2', icon: 'title', label: 'Heading 2' },
  { type: 'h3', icon: 'format_h3', label: 'Heading 3' },
  { type: 'image', icon: 'image', label: 'Image' },
  { type: 'faq', icon: 'quiz', label: 'FAQ' },
  { type: 'cta', icon: 'ads_click', label: 'CTA Banner' },
  { type: 'html', icon: 'code', label: 'HTML/Embed' },
];

export default function BlockManager({ blocks = [], onChange }) {
  const [addingAtIndex, setAddingAtIndex] = useState(null); // null = closed, -1 = below all, N = after block N

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = blocks.findIndex((b) => b.id === active.id);
      const newIndex = blocks.findIndex((b) => b.id === over.id);
      onChange(arrayMove(blocks, oldIndex, newIndex));
    }
  };

  const addBlock = (type, afterIndex) => {
    const newBlock = {
      id: `block_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
      type,
      content: getInitialContent(type),
    };
    const newBlocks = [...blocks];
    // afterIndex === -1 means append to end; otherwise insert after that index
    const insertAt = afterIndex === -1 ? blocks.length : afterIndex + 1;
    newBlocks.splice(insertAt, 0, newBlock);
    onChange(newBlocks);
    setAddingAtIndex(null);
  };

  const updateBlock = (id, newContent) => {
    onChange(blocks.map((b) => (b.id === id ? { ...b, content: newContent } : b)));
  };

  const deleteBlock = (id) => {
    onChange(blocks.filter((b) => b.id !== id));
  };

  const duplicateBlock = (id) => {
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx === -1) return;
    const copy = { ...blocks[idx], id: `block_${Date.now()}_copy` };
    const next = [...blocks];
    next.splice(idx + 1, 0, copy);
    onChange(next);
  };

  const renderBlockEditor = (block) => {
    switch (block.type) {
      case 'paragraph':
        return <ParagraphBlock content={block.content} onChange={(c) => updateBlock(block.id, c)} />;
      case 'h2':
      case 'h3':
      case 'h4':
        return <HeadingBlock type={block.type} content={block.content} onChange={(c) => updateBlock(block.id, c)} />;
      case 'image':
        return <ImageBlock content={block.content} onChange={(c) => updateBlock(block.id, c)} blockId={block.id} />;
      case 'faq':
        return <FaqBlock content={block.content} onChange={(c) => updateBlock(block.id, c)} />;
      case 'cta':
        return <CtaBlock content={block.content} onChange={(c) => updateBlock(block.id, c)} />;
      case 'html':
        return <HtmlBlock content={block.content} onChange={(c) => updateBlock(block.id, c)} />;
      default:
        return (
          <div className="p-4 border-2 border-dashed border-error/30 text-error text-center rounded-xl text-sm">
            Unknown block type: {block.type}
          </div>
        );
    }
  };

  // The inline block-type picker panel
  const BlockPicker = ({ onSelect }) => (
    <div className="bg-surface-container-lowest border border-[#EEEEEE] shadow-lg rounded-2xl p-4 w-full max-w-sm mx-auto z-30">
      <p className="text-xs text-secondary uppercase tracking-widest font-semibold mb-3 text-center">Add a block</p>
      <div className="grid grid-cols-3 gap-2">
        {BLOCK_TYPES.map((btn) => (
          <button
            key={btn.type}
            type="button"
            onClick={() => onSelect(btn.type)}
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-[#EEEEEE] hover:border-primary hover:bg-primary/5 transition-all text-secondary hover:text-primary gap-1.5 group"
          >
            <span className="material-symbols-outlined text-[24px] group-hover:scale-110 transition-transform">{btn.icon}</span>
            <span className="text-[10px] font-bold tracking-wider uppercase leading-tight text-center">{btn.label}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setAddingAtIndex(null)}
        className="w-full mt-3 py-2 text-secondary text-sm hover:text-on-surface transition-colors flex items-center justify-center gap-1"
      >
        <span className="material-symbols-outlined text-[16px]">close</span>
        Cancel
      </button>
    </div>
  );

  // A visual divider with an "add" button
  const AddDivider = ({ index }) => {
    const isOpen = addingAtIndex === index;
    return (
      <div className="relative py-1 group/divider">
        {/* The line + button */}
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => setAddingAtIndex(isOpen ? null : index)}
        >
          <div className="flex-1 h-px bg-[#EEEEEE] group-hover/divider:bg-primary/30 transition-colors" />
          <button
            type="button"
            className={`w-7 h-7 rounded-full border flex items-center justify-center shadow-sm transition-all flex-shrink-0
              ${isOpen
                ? 'bg-primary border-primary text-on-primary'
                : 'bg-surface-container-lowest border-[#EEEEEE] text-secondary hover:border-primary hover:text-primary hover:bg-primary/5'
              }`}
          >
            <span className="material-symbols-outlined text-[16px]">{isOpen ? 'close' : 'add'}</span>
          </button>
          <div className="flex-1 h-px bg-[#EEEEEE] group-hover/divider:bg-primary/30 transition-colors" />
        </div>

        {/* Inline picker - expands below the divider */}
        {isOpen && (
          <div className="mt-3 animate-fade-in">
            <BlockPicker onSelect={(type) => addBlock(type, index)} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* Close picker on outside click */}
      {addingAtIndex !== null && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => setAddingAtIndex(null)}
        />
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-0">
            {/* Divider before first block */}
            <div className="relative z-30">
              <AddDivider index={-1} />
            </div>

            {blocks.map((block, idx) => (
              <div key={block.id} className="relative z-10">
                <SortableBlock
                  id={block.id}
                  onDelete={() => deleteBlock(block.id)}
                  onDuplicate={() => duplicateBlock(block.id)}
                >
                  {renderBlockEditor(block)}
                </SortableBlock>

                {/* Divider after each block */}
                <div className="relative z-30">
                  <AddDivider index={idx} />
                </div>
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Empty state */}
      {blocks.length === 0 && (
        <div className="text-center py-8 text-secondary text-sm">
          <span className="material-symbols-outlined text-[32px] block mb-2 opacity-30">article</span>
          Click the <strong>+</strong> above to add your first block
        </div>
      )}
    </div>
  );
}

function getInitialContent(type) {
  switch (type) {
    case 'paragraph': return '<p>Write something awesome...</p>';
    case 'h2': return 'Navigating the Modern Market';
    case 'h3': return 'Section Heading';
    case 'h4': return 'Sub Heading';
    case 'image': return { url: '', alt: '', caption: '' };
    case 'faq': return [{ question: 'How does it work?', answer: 'Describe how it works here...' }];
    case 'cta': return { title: 'Ready to scale your pipeline?', description: 'Join 10,000+ companies using LeadLinx.', buttonText: 'Start Free Trial', url: '/login' };
    case 'html': return '<!-- Custom HTML or embed code here -->';
    default: return '';
  }
}
