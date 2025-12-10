import React, { useRef, useCallback, useEffect, useState, forwardRef, useImperativeHandle, useMemo } from 'react';
import Toolbar from './Toolbar';
import LinkModal from './LinkModal';
import { useEditorSelection } from '@/hooks/useEditorSelection';
import { useEditorCommands } from '@/hooks/useEditorCommands';
import { useHistoryStack } from '@/hooks/useHistoryStack';

export interface RichTextEditorRef {
  getHTML: () => string;
  setHTML: (html: string) => void;
  focus: () => void;
}

export interface RichTextEditorProps {
  initialValue?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  className?: string;
}

const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(({
  initialValue = '',
  onChange,
  placeholder = 'Start typing...',
  className = '',
}, ref) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [activeFormats, setActiveFormats] = useState<Record<string, boolean | string>>({});
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [handlePositions, setHandlePositions] = useState<{corner: string, top: number, left: number}[]>([]);
  const resizeStartData = useRef<{ x: number; y: number; width: number; height: number; aspectRatio: number } | null>(null);

  const { saveHistory, undo, redo, canUndo, canRedo } = useHistoryStack(editorRef);
  
  const {
    toggleInlineStyle,
    setBlockType,
    toggleList,
    insertLink,
    removeLink,
    setFontSize,
    setFontFamily,
    setTextColor,
    setBackgroundColor,
    insertImage,
    handlePaste,
    saveSelection,
    restoreSelection,
    getActiveFormats,
  } = useEditorCommands(editorRef, saveHistory);

  // Initialize editor content
  useEffect(() => {
    if (editorRef.current && initialValue) {
      editorRef.current.innerHTML = initialValue;
    } else if (editorRef.current && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = '<p><br></p>';
    }
  }, []);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    getHTML: () => editorRef.current?.innerHTML || '',
    setHTML: (html: string) => {
      if (editorRef.current) {
        editorRef.current.innerHTML = html;
        saveHistory();
      }
    },
    focus: () => editorRef.current?.focus(),
  }));

  // Update active formats on selection change
  const updateFormats = useCallback(() => {
    setActiveFormats(getActiveFormats());
  }, [getActiveFormats]);

  // Handle selection change
  useEffect(() => {
    const handleSelectionChange = () => {
      if (editorRef.current?.contains(document.activeElement)) {
        updateFormats();
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [updateFormats]);

  // Handle content changes
  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange?.(editorRef.current.innerHTML);
      updateFormats();
    }
  }, [onChange, updateFormats]);

  // Handle keydown events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          toggleInlineStyle('B');
          break;
        case 'i':
          e.preventDefault();
          toggleInlineStyle('I');
          break;
        case 'u':
          e.preventDefault();
          toggleInlineStyle('U');
          break;
        case 'z':
          e.preventDefault();
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
          break;
        case 'y':
          e.preventDefault();
          redo();
          break;
      }
      return;
    }

    // Enter key handling
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Shift+Enter: insert <br>
        e.preventDefault();
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          range.deleteContents();
          const br = document.createElement('br');
          range.insertNode(br);
          range.setStartAfter(br);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      } else {
        // Regular Enter: create new paragraph (prevent browser div)
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          let node: Node | null = range.startContainer;
          
          // Find block parent
          while (node && node !== editorRef.current) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const el = node as HTMLElement;
              const tagName = el.tagName;
              
              // If in heading, create paragraph
              if (['H1', 'H2', 'H3'].includes(tagName)) {
                e.preventDefault();
                saveHistory();
                
                const p = document.createElement('p');
                p.innerHTML = '<br>';
                el.parentNode?.insertBefore(p, el.nextSibling);
                
                const newRange = document.createRange();
                newRange.setStart(p, 0);
                newRange.collapse(true);
                sel.removeAllRanges();
                sel.addRange(newRange);
                return;
              }
              
              // If in list item, check if empty
              if (tagName === 'LI') {
                if (!el.textContent?.trim()) {
                  e.preventDefault();
                  saveHistory();
                  
                  // Exit list
                  const list = el.parentElement;
                  const p = document.createElement('p');
                  p.innerHTML = '<br>';
                  
                  if (list && (list.tagName === 'UL' || list.tagName === 'OL')) {
                    list.parentNode?.insertBefore(p, list.nextSibling);
                    el.remove();
                    
                    // Remove empty list
                    if (list.children.length === 0) {
                      list.remove();
                    }
                  }
                  
                  const newRange = document.createRange();
                  newRange.setStart(p, 0);
                  newRange.collapse(true);
                  sel.removeAllRanges();
                  sel.addRange(newRange);
                  return;
                }
              }
            }
            node = node.parentNode;
          }
        }
      }
    }

    // Backspace handling for images
    if (e.key === 'Backspace' && selectedImage) {
      e.preventDefault();
      selectedImage.parentElement?.remove();
      setSelectedImage(null);
      saveHistory();
    }
  }, [toggleInlineStyle, undo, redo, saveHistory, selectedImage]);

  // Handle paste
  const handlePasteEvent = useCallback((e: React.ClipboardEvent) => {
    handlePaste(e.nativeEvent);
  }, [handlePaste]);

  // Handle image upload
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const src = event.target?.result as string;
        insertImage(src, file.name);
      };
      reader.readAsDataURL(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [insertImage]);

  // Handle click on editor (for image selection and resize)
  const handleEditorClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // Check if clicked on an image
    if (target.tagName === 'IMG') {
      e.preventDefault();
      const img = target as HTMLImageElement;
      setSelectedImage(img);
      
      // Add selected class to image
      const allImages = editorRef.current?.querySelectorAll('img');
      allImages?.forEach(i => i.classList.remove('image-selected'));
      img.classList.add('image-selected');
    } else {
      // Deselect image if clicking elsewhere
      if (selectedImage) {
        selectedImage.classList.remove('image-selected');
        setSelectedImage(null);
      }
    }
    updateFormats();
  }, [updateFormats, selectedImage]);

  // Handle blur to save history
  const handleBlur = useCallback(() => {
    saveHistory();
  }, [saveHistory]);

  // Image resize handlers
  const handleResizeMouseDown = useCallback((e: React.MouseEvent, corner: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!selectedImage) return;
    
    setIsResizing(true);
    const rect = selectedImage.getBoundingClientRect();
    resizeStartData.current = {
      x: e.clientX,
      y: e.clientY,
      width: rect.width,
      height: rect.height,
      aspectRatio: rect.width / rect.height,
    };
  }, [selectedImage]);

  const handleResizeMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !selectedImage || !resizeStartData.current) return;
    
    const deltaX = e.clientX - resizeStartData.current.x;
    let newWidth = resizeStartData.current.width + deltaX;
    
    // Constrain to min/max
    newWidth = Math.max(50, Math.min(800, newWidth));
    const newHeight = newWidth / resizeStartData.current.aspectRatio;
    
    selectedImage.style.width = `${newWidth}px`;
    selectedImage.style.height = `${newHeight}px`;
    
    // Update handle positions during resize using requestAnimationFrame
    requestAnimationFrame(() => {
      const rect = selectedImage.getBoundingClientRect();
      const positions = ['bottom-right', 'bottom-left', 'top-right', 'top-left'].map((corner) => {
        let top = 0, left = 0;
        switch (corner) {
          case 'top-left': top = rect.top - 6; left = rect.left - 6; break;
          case 'top-right': top = rect.top - 6; left = rect.right - 6; break;
          case 'bottom-left': top = rect.bottom - 6; left = rect.left - 6; break;
          case 'bottom-right': top = rect.bottom - 6; left = rect.right - 6; break;
        }
        return { corner, top, left };
      });
      setHandlePositions(positions);
    });
  }, [isResizing, selectedImage]);

  const handleResizeMouseUp = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
      resizeStartData.current = null;
      saveHistory();
    }
  }, [isResizing, saveHistory]);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMouseMove);
      document.addEventListener('mouseup', handleResizeMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleResizeMouseMove);
        document.removeEventListener('mouseup', handleResizeMouseUp);
      };
    }
  }, [isResizing, handleResizeMouseMove, handleResizeMouseUp]);

  // Calculate resize handle positions - recalculate on resize
  
  const updateHandlePositions = useCallback(() => {
    if (!selectedImage) {
      setHandlePositions([]);
      return;
    }
    
    const rect = selectedImage.getBoundingClientRect();
    const positions = ['bottom-right', 'bottom-left', 'top-right', 'top-left'].map((corner) => {
      let top = 0, left = 0;
      
      switch (corner) {
        case 'top-left':
          top = rect.top - 6;
          left = rect.left - 6;
          break;
        case 'top-right':
          top = rect.top - 6;
          left = rect.right - 6;
          break;
        case 'bottom-left':
          top = rect.bottom - 6;
          left = rect.left - 6;
          break;
        case 'bottom-right':
          top = rect.bottom - 6;
          left = rect.right - 6;
          break;
      }
      
      return { corner, top, left };
    });
    
    setHandlePositions(positions);
  }, [selectedImage]);

  // Update positions when image is selected or on scroll/resize
  useEffect(() => {
    updateHandlePositions();
    
    const handleScroll = () => updateHandlePositions();
    const handleWindowResize = () => updateHandlePositions();
    
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleWindowResize);
    
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleWindowResize);
    };
  }, [selectedImage, updateHandlePositions]);

  const resizeHandles = useMemo(() => {
    if (!selectedImage || handlePositions.length === 0) return null;
    
    return (
      <div 
        className="fixed pointer-events-none z-50"
        style={{
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }}
      >
        {handlePositions.map(({ corner, top, left }) => (
          <div
            key={corner}
            className={`resize-handle ${corner} pointer-events-auto opacity-100`}
            style={{
              position: 'fixed',
              top: `${top}px`,
              left: `${left}px`,
              width: '12px',
              height: '12px',
            }}
            onMouseDown={(e) => handleResizeMouseDown(e, corner)}
          />
        ))}
      </div>
    );
  }, [selectedImage, handlePositions, handleResizeMouseDown]);

  return (
    <div className={`rounded-xl border border-editor-border bg-editor-bg overflow-hidden shadow-sm relative ${className}`}>
      <Toolbar
        onBold={() => toggleInlineStyle('B')}
        onItalic={() => toggleInlineStyle('I')}
        onUnderline={() => toggleInlineStyle('U')}
        onStrike={() => toggleInlineStyle('S')}
        onHeading1={() => setBlockType('H1')}
        onHeading2={() => setBlockType('H2')}
        onHeading3={() => setBlockType('H3')}
        onParagraph={() => setBlockType('P')}
        onBlockquote={() => setBlockType('BLOCKQUOTE')}
        onCodeBlock={() => setBlockType('PRE')}
        onUnorderedList={() => toggleList('UL')}
        onOrderedList={() => toggleList('OL')}
        onLink={() => {
          saveSelection();
          setShowLinkModal(true);
        }}
        onUnlink={removeLink}
        onImage={() => fileInputRef.current?.click()}
        onFontSize={setFontSize}
        onFontFamily={setFontFamily}
        onTextColor={setTextColor}
        onBackgroundColor={setBackgroundColor}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        activeFormats={activeFormats}
        onSaveSelection={saveSelection}
        onRestoreSelection={restoreSelection}
      />

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className="editor-canvas focus:outline-none"
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePasteEvent}
        onClick={handleEditorClick}
        onBlur={handleBlur}
        data-placeholder={placeholder}
        style={{
          minHeight: '400px',
        }}
      />

      {selectedImage && resizeHandles}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/svg+xml,image/webp"
        onChange={handleImageUpload}
        className="hidden"
      />

      <LinkModal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        onSubmit={(url) => {
          restoreSelection();
          insertLink(url);
        }}
      />
    </div>
  );
});

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;
