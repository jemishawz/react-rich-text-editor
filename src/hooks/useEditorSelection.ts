import { useCallback, useRef, useState } from 'react';

export interface EditorSelection {
  range: Range | null;
  isCollapsed: boolean;
  startContainer: Node | null;
  endContainer: Node | null;
  commonAncestor: Node | null;
  text: string;
}

export interface SelectionTarget {
  node: HTMLElement | null;
  isFullBlock: boolean;
  blockElement: HTMLElement | null;
}

const BLOCK_ELEMENTS = ['H1', 'H2', 'H3', 'P', 'LI', 'BLOCKQUOTE', 'PRE'];

export function useEditorSelection(editorRef: React.RefObject<HTMLDivElement>) {
  const [selection, setSelection] = useState<EditorSelection>({
    range: null,
    isCollapsed: true,
    startContainer: null,
    endContainer: null,
    commonAncestor: null,
    text: '',
  });

  const savedRange = useRef<Range | null>(null);

  const getSelection = useCallback((): EditorSelection => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      return {
        range: null,
        isCollapsed: true,
        startContainer: null,
        endContainer: null,
        commonAncestor: null,
        text: '',
      };
    }

    const range = sel.getRangeAt(0);
    return {
      range: range.cloneRange(),
      isCollapsed: sel.isCollapsed,
      startContainer: range.startContainer,
      endContainer: range.endContainer,
      commonAncestor: range.commonAncestorContainer,
      text: sel.toString(),
    };
  }, []);

  const saveSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
  }, []);

  const restoreSelection = useCallback(() => {
    if (savedRange.current) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedRange.current);
      }
    }
  }, []);

  const findBlockParent = useCallback((node: Node | null): HTMLElement | null => {
    if (!node) return null;
    
    let current: Node | null = node;
    while (current && current !== editorRef.current) {
      if (current.nodeType === Node.ELEMENT_NODE) {
        const element = current as HTMLElement;
        if (BLOCK_ELEMENTS.includes(element.tagName)) {
          return element;
        }
      }
      current = current.parentNode;
    }
    return null;
  }, [editorRef]);

  const isFullBlockSelected = useCallback((range: Range, blockElement: HTMLElement): boolean => {
    const blockRange = document.createRange();
    blockRange.selectNodeContents(blockElement);

    const startMatch = range.startContainer === blockRange.startContainer && 
                       range.startOffset === blockRange.startOffset;
    const endMatch = range.endContainer === blockRange.endContainer && 
                     range.endOffset === blockRange.endOffset;

    if (startMatch && endMatch) return true;

    // Also check if selection covers all text content
    const blockText = blockElement.textContent || '';
    const selectedText = range.toString();
    
    return blockText.trim() === selectedText.trim() && selectedText.length > 0;
  }, []);

  const findFontTarget = useCallback((sel?: EditorSelection): SelectionTarget => {
    const currentSel = sel || getSelection();
    
    if (!currentSel.range || currentSel.isCollapsed) {
      return { node: null, isFullBlock: false, blockElement: null };
    }

    const blockElement = findBlockParent(currentSel.commonAncestor);
    
    if (!blockElement) {
      return { node: null, isFullBlock: false, blockElement: null };
    }

    const isFullBlock = isFullBlockSelected(currentSel.range, blockElement);

    return {
      node: isFullBlock ? blockElement : null,
      isFullBlock,
      blockElement,
    };
  }, [getSelection, findBlockParent, isFullBlockSelected]);

  const updateSelection = useCallback(() => {
    setSelection(getSelection());
  }, [getSelection]);

  const getActiveFormats = useCallback((): Record<string, boolean | string> => {
    const sel = getSelection();
    if (!sel.range || !editorRef.current) return {};

    const formats: Record<string, boolean | string> = {};
    let node: Node | null = sel.startContainer;

    while (node && node !== editorRef.current) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        const tagName = element.tagName.toLowerCase();
        const style = element.style;

        if (tagName === 'b' || tagName === 'strong' || style.fontWeight === 'bold' || parseInt(style.fontWeight) >= 700) {
          formats.bold = true;
        }
        if (tagName === 'i' || tagName === 'em' || style.fontStyle === 'italic') {
          formats.italic = true;
        }
        if (tagName === 'u' || style.textDecoration?.includes('underline')) {
          formats.underline = true;
        }
        if (tagName === 's' || tagName === 'strike' || style.textDecoration?.includes('line-through')) {
          formats.strike = true;
        }
        if (tagName === 'a') {
          formats.link = (element as HTMLAnchorElement).href;
        }
        if (BLOCK_ELEMENTS.includes(element.tagName)) {
          formats.block = tagName;
        }
        if (style.fontSize) {
          formats.fontSize = style.fontSize;
        }
        if (style.fontFamily) {
          formats.fontFamily = style.fontFamily;
        }
        if (style.color) {
          formats.color = style.color;
        }
        if (style.backgroundColor) {
          formats.backgroundColor = style.backgroundColor;
        }
      }
      node = node.parentNode;
    }

    // Check if inside list
    let listNode: Node | null = sel.startContainer;
    while (listNode && listNode !== editorRef.current) {
      if (listNode.nodeType === Node.ELEMENT_NODE) {
        const tagName = (listNode as HTMLElement).tagName;
        if (tagName === 'UL') formats.unorderedList = true;
        if (tagName === 'OL') formats.orderedList = true;
      }
      listNode = listNode.parentNode;
    }

    return formats;
  }, [getSelection, editorRef]);

  return {
    selection,
    savedRange,
    getSelection,
    saveSelection,
    restoreSelection,
    findBlockParent,
    findFontTarget,
    updateSelection,
    getActiveFormats,
    isFullBlockSelected,
  };
}
