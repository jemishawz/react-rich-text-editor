import React, { useState, useRef, useEffect } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link,
  Image,
  List,
  ListOrdered,
  Quote,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
  ChevronDown,
  Type,
  Palette,
  Highlighter,
  Unlink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToolbarProps {
  onBold: () => void;
  onItalic: () => void;
  onUnderline: () => void;
  onStrike: () => void;
  onHeading1: () => void;
  onHeading2: () => void;
  onHeading3: () => void;
  onParagraph: () => void;
  onBlockquote: () => void;
  onCodeBlock: () => void;
  onUnorderedList: () => void;
  onOrderedList: () => void;
  onLink: () => void;
  onUnlink: () => void;
  onImage: () => void;
  onFontSize: (size: string) => void;
  onFontFamily: (family: string) => void;
  onTextColor: (color: string) => void;
  onBackgroundColor: (color: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  activeFormats: Record<string, boolean | string>;
  onSaveSelection: () => void;
  onRestoreSelection: () => void;
}

const FONT_SIZES = [
  { label: '12px', value: '12px' },
  { label: '14px', value: '14px' },
  { label: '16px', value: '16px' },
  { label: '18px', value: '18px' },
  { label: '20px', value: '20px' },
  { label: '24px', value: '24px' },
  { label: '28px', value: '28px' },
  { label: '32px', value: '32px' },
  { label: '36px', value: '36px' },
  { label: '48px', value: '48px' },
];

const FONT_FAMILIES = [
  { label: 'Default', value: 'inherit' },
  { label: 'IBM Plex Sans', value: 'IBM Plex Sans, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: 'Times New Roman, serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Courier New', value: 'Courier New, monospace' },
  { label: 'JetBrains Mono', value: 'JetBrains Mono, monospace' },
];

const COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#cccccc', '#ffffff',
  '#ff0000', '#ff4500', '#ff8c00', '#ffd700', '#ffff00', '#9acd32',
  '#32cd32', '#00ced1', '#1e90ff', '#4169e1', '#8a2be2', '#ff1493',
  '#dc143c', '#b22222', '#8b4513', '#2f4f4f', '#191970', '#800080',
];

const Toolbar: React.FC<ToolbarProps> = ({
  onBold,
  onItalic,
  onUnderline,
  onStrike,
  onHeading1,
  onHeading2,
  onHeading3,
  onParagraph,
  onBlockquote,
  onCodeBlock,
  onUnorderedList,
  onOrderedList,
  onLink,
  onUnlink,
  onImage,
  onFontSize,
  onFontFamily,
  onTextColor,
  onBackgroundColor,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  activeFormats,
  onSaveSelection,
  onRestoreSelection,
}) => {
  const [showFontSizeDropdown, setShowFontSizeDropdown] = useState(false);
  const [showFontFamilyDropdown, setShowFontFamilyDropdown] = useState(false);
  const [showBlockDropdown, setShowBlockDropdown] = useState(false);
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  const [showBgColorPicker, setShowBgColorPicker] = useState(false);

  const fontSizeRef = useRef<HTMLDivElement>(null);
  const fontFamilyRef = useRef<HTMLDivElement>(null);
  const blockRef = useRef<HTMLDivElement>(null);
  const textColorRef = useRef<HTMLDivElement>(null);
  const bgColorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (fontSizeRef.current && !fontSizeRef.current.contains(e.target as Node)) {
        setShowFontSizeDropdown(false);
      }
      if (fontFamilyRef.current && !fontFamilyRef.current.contains(e.target as Node)) {
        setShowFontFamilyDropdown(false);
      }
      if (blockRef.current && !blockRef.current.contains(e.target as Node)) {
        setShowBlockDropdown(false);
      }
      if (textColorRef.current && !textColorRef.current.contains(e.target as Node)) {
        setShowTextColorPicker(false);
      }
      if (bgColorRef.current && !bgColorRef.current.contains(e.target as Node)) {
        setShowBgColorPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getCurrentBlockLabel = () => {
    const block = activeFormats.block as string;
    switch (block) {
      case 'h1': return 'Heading 1';
      case 'h2': return 'Heading 2';
      case 'h3': return 'Heading 3';
      case 'blockquote': return 'Quote';
      case 'pre': return 'Code';
      default: return 'Paragraph';
    }
  };

  const getCurrentFontSize = () => {
    return (activeFormats.fontSize as string) || '16px';
  };

  const getCurrentFontFamily = () => {
    const family = (activeFormats.fontFamily as string) || '';
    const match = FONT_FAMILIES.find(f => family.includes(f.value.split(',')[0]));
    return match?.label || 'Default';
  };

  const handleDropdownOpen = (setter: React.Dispatch<React.SetStateAction<boolean>>, value: boolean) => {
    if (value) {
      onSaveSelection();
    }
    setter(value);
  };

  const handleDropdownAction = (action: () => void, setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    onRestoreSelection();
    action();
    setter(false);
  };

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 p-2 bg-toolbar-bg border-b border-toolbar-border">
      {/* Undo/Redo */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className={cn('toolbar-button', !canUndo && 'opacity-40 cursor-not-allowed')}
        title="Undo (Ctrl+Z)"
      >
        <Undo size={16} />
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className={cn('toolbar-button', !canRedo && 'opacity-40 cursor-not-allowed')}
        title="Redo (Ctrl+Y)"
      >
        <Redo size={16} />
      </button>

      <div className="toolbar-separator" />

      {/* Block Type Dropdown */}
      <div ref={blockRef} className="relative">
        <button
          onClick={() => handleDropdownOpen(setShowBlockDropdown, !showBlockDropdown)}
          className="toolbar-dropdown min-w-[100px]"
        >
          <span className="truncate">{getCurrentBlockLabel()}</span>
          <ChevronDown size={14} />
        </button>
        {showBlockDropdown && (
          <div className="dropdown-menu animate-fade-in">
            <button onClick={() => handleDropdownAction(onParagraph, setShowBlockDropdown)} className={cn('dropdown-item w-full', activeFormats.block === 'p' && 'dropdown-item-active')}>
              <Type size={14} className="mr-2" /> Paragraph
            </button>
            <button onClick={() => handleDropdownAction(onHeading1, setShowBlockDropdown)} className={cn('dropdown-item w-full', activeFormats.block === 'h1' && 'dropdown-item-active')}>
              <Heading1 size={14} className="mr-2" /> Heading 1
            </button>
            <button onClick={() => handleDropdownAction(onHeading2, setShowBlockDropdown)} className={cn('dropdown-item w-full', activeFormats.block === 'h2' && 'dropdown-item-active')}>
              <Heading2 size={14} className="mr-2" /> Heading 2
            </button>
            <button onClick={() => handleDropdownAction(onHeading3, setShowBlockDropdown)} className={cn('dropdown-item w-full', activeFormats.block === 'h3' && 'dropdown-item-active')}>
              <Heading3 size={14} className="mr-2" /> Heading 3
            </button>
            <button onClick={() => handleDropdownAction(onBlockquote, setShowBlockDropdown)} className={cn('dropdown-item w-full', activeFormats.block === 'blockquote' && 'dropdown-item-active')}>
              <Quote size={14} className="mr-2" /> Blockquote
            </button>
            <button onClick={() => handleDropdownAction(onCodeBlock, setShowBlockDropdown)} className={cn('dropdown-item w-full', activeFormats.block === 'pre' && 'dropdown-item-active')}>
              <Code size={14} className="mr-2" /> Code Block
            </button>
          </div>
        )}
      </div>

      {/* Font Family Dropdown */}
      <div ref={fontFamilyRef} className="relative">
        <button
          onClick={() => handleDropdownOpen(setShowFontFamilyDropdown, !showFontFamilyDropdown)}
          className="toolbar-dropdown min-w-[110px]"
        >
          <span className="truncate">{getCurrentFontFamily()}</span>
          <ChevronDown size={14} />
        </button>
        {showFontFamilyDropdown && (
          <div className="dropdown-menu animate-fade-in">
            {FONT_FAMILIES.map(font => (
              <button
                key={font.value}
                onClick={() => handleDropdownAction(() => onFontFamily(font.value), setShowFontFamilyDropdown)}
                className="dropdown-item w-full"
                style={{ fontFamily: font.value }}
              >
                {font.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Font Size Dropdown */}
      <div ref={fontSizeRef} className="relative">
        <button
          onClick={() => handleDropdownOpen(setShowFontSizeDropdown, !showFontSizeDropdown)}
          className="toolbar-dropdown min-w-[70px]"
        >
          <span>{getCurrentFontSize()}</span>
          <ChevronDown size={14} />
        </button>
        {showFontSizeDropdown && (
          <div className="dropdown-menu animate-fade-in scrollbar-thin">
            {FONT_SIZES.map(size => (
              <button
                key={size.value}
                onClick={() => handleDropdownAction(() => onFontSize(size.value), setShowFontSizeDropdown)}
                className="dropdown-item w-full"
              >
                {size.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="toolbar-separator" />

      {/* Inline Formatting */}
      <button
        onClick={onBold}
        className={cn('toolbar-button', activeFormats.bold && 'toolbar-button-active')}
        title="Bold (Ctrl+B)"
      >
        <Bold size={16} />
      </button>
      <button
        onClick={onItalic}
        className={cn('toolbar-button', activeFormats.italic && 'toolbar-button-active')}
        title="Italic (Ctrl+I)"
      >
        <Italic size={16} />
      </button>
      <button
        onClick={onUnderline}
        className={cn('toolbar-button', activeFormats.underline && 'toolbar-button-active')}
        title="Underline (Ctrl+U)"
      >
        <Underline size={16} />
      </button>
      <button
        onClick={onStrike}
        className={cn('toolbar-button', activeFormats.strike && 'toolbar-button-active')}
        title="Strikethrough"
      >
        <Strikethrough size={16} />
      </button>

      <div className="toolbar-separator" />

      {/* Text Color */}
      <div ref={textColorRef} className="relative">
        <button
          onClick={() => handleDropdownOpen(setShowTextColorPicker, !showTextColorPicker)}
          className={cn('toolbar-button', showTextColorPicker && 'toolbar-button-active')}
          title="Text Color"
        >
          <div className="flex flex-col items-center">
            <Palette size={14} />
            <div
              className="w-4 h-1 rounded-sm mt-0.5"
              style={{ backgroundColor: (activeFormats.color as string) || '#000000' }}
            />
          </div>
        </button>
        {showTextColorPicker && (
          <div className="color-picker-popover animate-fade-in left-0">
            <div className="grid grid-cols-6 gap-1.5">
              {COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => handleDropdownAction(() => onTextColor(color), setShowTextColorPicker)}
                  className="color-swatch"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Background Color */}
      <div ref={bgColorRef} className="relative">
        <button
          onClick={() => handleDropdownOpen(setShowBgColorPicker, !showBgColorPicker)}
          className={cn('toolbar-button', showBgColorPicker && 'toolbar-button-active')}
          title="Highlight Color"
        >
          <div className="flex flex-col items-center">
            <Highlighter size={14} />
            <div
              className="w-4 h-1 rounded-sm mt-0.5"
              style={{ backgroundColor: (activeFormats.backgroundColor as string) || '#ffff00' }}
            />
          </div>
        </button>
        {showBgColorPicker && (
          <div className="color-picker-popover animate-fade-in left-0">
            <div className="grid grid-cols-6 gap-1.5">
              {COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => handleDropdownAction(() => onBackgroundColor(color), setShowBgColorPicker)}
                  className="color-swatch"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="toolbar-separator" />

      {/* Lists */}
      <button
        onClick={onUnorderedList}
        className={cn('toolbar-button', activeFormats.unorderedList && 'toolbar-button-active')}
        title="Bullet List"
      >
        <List size={16} />
      </button>
      <button
        onClick={onOrderedList}
        className={cn('toolbar-button', activeFormats.orderedList && 'toolbar-button-active')}
        title="Numbered List"
      >
        <ListOrdered size={16} />
      </button>

      <div className="toolbar-separator" />

      {/* Link */}
      <button
        onClick={onLink}
        className={cn('toolbar-button', activeFormats.link && 'toolbar-button-active')}
        title="Insert Link"
      >
        <Link size={16} />
      </button>
      {activeFormats.link && (
        <button
          onClick={onUnlink}
          className="toolbar-button"
          title="Remove Link"
        >
          <Unlink size={16} />
        </button>
      )}

      {/* Image */}
      <button
        onClick={onImage}
        className="toolbar-button"
        title="Insert Image"
      >
        <Image size={16} />
      </button>
    </div>
  );
};

export default Toolbar;
