import { useState, useCallback, useRef } from 'react';

interface HistoryEntry {
  html: string;
  cursorPosition: {
    startOffset: number;
    endOffset: number;
    startPath: number[];
    endPath: number[];
  } | null;
}

const MAX_HISTORY_SIZE = 100;

export function useHistoryStack(editorRef: React.RefObject<HTMLDivElement>) {
  const [undoStack, setUndoStack] = useState<HistoryEntry[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryEntry[]>([]);
  const isUndoRedoing = useRef(false);
  const lastSaveTime = useRef(0);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  const getNodePath = useCallback((node: Node | null): number[] => {
    const path: number[] = [];
    let current = node;
    
    while (current && current !== editorRef.current && current.parentNode) {
      const parent = current.parentNode;
      const index = Array.from(parent.childNodes).indexOf(current as ChildNode);
      path.unshift(index);
      current = parent;
    }
    
    return path;
  }, [editorRef]);

  const getNodeFromPath = useCallback((path: number[]): Node | null => {
    let current: Node | null = editorRef.current;
    
    for (const index of path) {
      if (!current || !current.childNodes[index]) return null;
      current = current.childNodes[index];
    }
    
    return current;
  }, [editorRef]);

  const getCursorPosition = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;

    const range = sel.getRangeAt(0);
    return {
      startOffset: range.startOffset,
      endOffset: range.endOffset,
      startPath: getNodePath(range.startContainer),
      endPath: getNodePath(range.endContainer),
    };
  }, [getNodePath]);

  const restoreCursorPosition = useCallback((position: HistoryEntry['cursorPosition']) => {
    if (!position) return;

    const startNode = getNodeFromPath(position.startPath);
    const endNode = getNodeFromPath(position.endPath);
    
    if (!startNode || !endNode) return;

    try {
      const range = document.createRange();
      range.setStart(startNode, Math.min(position.startOffset, startNode.textContent?.length || 0));
      range.setEnd(endNode, Math.min(position.endOffset, endNode.textContent?.length || 0));
      
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    } catch (e) {
      // Cursor restoration failed, ignore
    }
  }, [getNodeFromPath]);

  const saveHistory = useCallback(() => {
    if (isUndoRedoing.current || !editorRef.current) return;

    const now = Date.now();
    // Debounce saves that are too close together
    if (now - lastSaveTime.current < 50) {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
      debounceTimeout.current = setTimeout(() => {
        saveHistory();
      }, 50);
      return;
    }

    lastSaveTime.current = now;

    const entry: HistoryEntry = {
      html: editorRef.current.innerHTML,
      cursorPosition: getCursorPosition(),
    };

    setUndoStack(prev => {
      const newStack = [...prev, entry];
      if (newStack.length > MAX_HISTORY_SIZE) {
        return newStack.slice(-MAX_HISTORY_SIZE);
      }
      return newStack;
    });

    setRedoStack([]);
  }, [editorRef, getCursorPosition]);

  const undo = useCallback(() => {
    if (!editorRef.current || undoStack.length === 0) return;

    isUndoRedoing.current = true;

    const currentEntry: HistoryEntry = {
      html: editorRef.current.innerHTML,
      cursorPosition: getCursorPosition(),
    };

    const previousEntry = undoStack[undoStack.length - 1];
    
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, currentEntry]);

    editorRef.current.innerHTML = previousEntry.html;
    restoreCursorPosition(previousEntry.cursorPosition);

    setTimeout(() => {
      isUndoRedoing.current = false;
    }, 0);
  }, [editorRef, undoStack, getCursorPosition, restoreCursorPosition]);

  const redo = useCallback(() => {
    if (!editorRef.current || redoStack.length === 0) return;

    isUndoRedoing.current = true;

    const currentEntry: HistoryEntry = {
      html: editorRef.current.innerHTML,
      cursorPosition: getCursorPosition(),
    };

    const nextEntry = redoStack[redoStack.length - 1];
    
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, currentEntry]);

    editorRef.current.innerHTML = nextEntry.html;
    restoreCursorPosition(nextEntry.cursorPosition);

    setTimeout(() => {
      isUndoRedoing.current = false;
    }, 0);
  }, [editorRef, redoStack, getCursorPosition, restoreCursorPosition]);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  return {
    saveHistory,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
