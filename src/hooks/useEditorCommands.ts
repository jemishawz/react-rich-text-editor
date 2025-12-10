import { useCallback, RefObject } from 'react';
import { useEditorSelection, SelectionTarget } from './useEditorSelection';

const ALLOWED_TAGS = ['P', 'H1', 'H2', 'H3', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'PRE', 'A', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'SPAN', 'BR', 'IMG', 'DIV'];

export function useEditorCommands(
  editorRef: RefObject<HTMLDivElement>,
  saveHistory: () => void
) {
  const {
    getSelection,
    saveSelection,
    restoreSelection,
    findBlockParent,
    findFontTarget,
    getActiveFormats,
  } = useEditorSelection(editorRef);

  const wrapSelectionWithSpan = useCallback((style: Partial<CSSStyleDeclaration>) => {
    const sel = getSelection();
    if (!sel.range || sel.isCollapsed) return;

    saveHistory();
    
    const target = findFontTarget(sel);
    
    if (target.isFullBlock && target.blockElement) {
      // Apply style directly to block element
      Object.entries(style).forEach(([key, value]) => {
        if (value) {
          (target.blockElement!.style as any)[key] = value;
        }
      });
    } else {
      // Create span for partial selection
      const contents = sel.range.extractContents();
      const span = document.createElement('span');
      
      Object.entries(style).forEach(([key, value]) => {
        if (value) {
          (span.style as any)[key] = value;
        }
      });
      
      span.appendChild(contents);
      sel.range.insertNode(span);
      
      // Clean up nested spans
      cleanupNestedSpans(span);
    }
  }, [getSelection, findFontTarget, saveHistory]);

  const cleanupNestedSpans = useCallback((element: HTMLElement) => {
    const nestedSpans = element.querySelectorAll('span');
    nestedSpans.forEach(span => {
      if (span.parentElement?.tagName === 'SPAN') {
        // Merge styles with parent
        const parent = span.parentElement;
        const parentStyle = parent.style.cssText;
        const childStyle = span.style.cssText;
        parent.style.cssText = parentStyle + ' ' + childStyle;
        
        // Move children up
        while (span.firstChild) {
          parent.insertBefore(span.firstChild, span);
        }
        span.remove();
      }
    });

    // Remove empty spans
    element.querySelectorAll('span').forEach(span => {
      if (!span.textContent?.trim() && !span.querySelector('img')) {
        span.remove();
      }
    });
  }, []);

  const toggleInlineStyle = useCallback((tagName: 'B' | 'I' | 'U' | 'S') => {
    const sel = getSelection();
    if (!sel.range || sel.isCollapsed) return;

    saveHistory();

    const formats = getActiveFormats();
    const isActive = (
      (tagName === 'B' && formats.bold) ||
      (tagName === 'I' && formats.italic) ||
      (tagName === 'U' && formats.underline) ||
      (tagName === 'S' && formats.strike)
    );

    if (isActive) {
      // Remove formatting
      const styleKey = {
        'B': 'fontWeight',
        'I': 'fontStyle',
        'U': 'textDecoration',
        'S': 'textDecoration',
      }[tagName];

      // Find and unwrap the formatting element
      let node: Node | null = sel.range.startContainer;
      while (node && node !== editorRef.current) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          const tag = el.tagName;
          
          if (
            (tagName === 'B' && (tag === 'B' || tag === 'STRONG')) ||
            (tagName === 'I' && (tag === 'I' || tag === 'EM')) ||
            (tagName === 'U' && tag === 'U') ||
            (tagName === 'S' && (tag === 'S' || tag === 'STRIKE'))
          ) {
            // Unwrap element
            const parent = el.parentNode;
            while (el.firstChild) {
              parent?.insertBefore(el.firstChild, el);
            }
            el.remove();
            break;
          }
        }
        node = node.parentNode;
      }
    } else {
      // Apply formatting
      const contents = sel.range.extractContents();
      const wrapper = document.createElement(tagName);
      wrapper.appendChild(contents);
      sel.range.insertNode(wrapper);
    }
  }, [getSelection, getActiveFormats, editorRef, saveHistory]);

  const setBlockType = useCallback((tagName: 'P' | 'H1' | 'H2' | 'H3' | 'BLOCKQUOTE' | 'PRE') => {
    const sel = getSelection();
    if (!sel.range) return;

    saveHistory();

    const blockElement = findBlockParent(sel.startContainer);
    if (!blockElement) {
      // Create new block
      const newBlock = document.createElement(tagName);
      newBlock.innerHTML = '<br>';
      sel.range.insertNode(newBlock);
      
      // Move cursor inside
      const range = document.createRange();
      range.setStart(newBlock, 0);
      range.collapse(true);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      return;
    }

    // Convert existing block
    const newBlock = document.createElement(tagName);
    newBlock.innerHTML = blockElement.innerHTML;
    
    // Copy relevant styles
    if (blockElement.style.cssText) {
      newBlock.style.cssText = blockElement.style.cssText;
    }
    
    blockElement.parentNode?.replaceChild(newBlock, blockElement);

    // Restore cursor
    const range = document.createRange();
    range.selectNodeContents(newBlock);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, [getSelection, findBlockParent, saveHistory]);

  const toggleList = useCallback((listType: 'UL' | 'OL') => {
    const sel = getSelection();
    if (!sel.range) return;

    saveHistory();

    const formats = getActiveFormats();
    const currentListType = formats.unorderedList ? 'UL' : formats.orderedList ? 'OL' : null;

    if (currentListType === listType) {
      // Convert list items back to paragraphs
      let listItem = findBlockParent(sel.startContainer);
      if (listItem?.tagName === 'LI') {
        const list = listItem.parentElement;
        if (list) {
          const items = Array.from(list.children);
          const fragment = document.createDocumentFragment();
          
          items.forEach(item => {
            const p = document.createElement('p');
            p.innerHTML = item.innerHTML;
            fragment.appendChild(p);
          });
          
          list.parentNode?.replaceChild(fragment, list);
        }
      }
    } else if (currentListType && currentListType !== listType) {
      // Convert to other list type
      let node: Node | null = sel.startContainer;
      while (node && node !== editorRef.current) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          if (el.tagName === 'UL' || el.tagName === 'OL') {
            const newList = document.createElement(listType);
            newList.innerHTML = el.innerHTML;
            el.parentNode?.replaceChild(newList, el);
            break;
          }
        }
        node = node.parentNode;
      }
    } else {
      // Create new list
      const blockElement = findBlockParent(sel.startContainer);
      const list = document.createElement(listType);
      const li = document.createElement('li');
      
      if (blockElement) {
        li.innerHTML = blockElement.innerHTML;
        list.appendChild(li);
        blockElement.parentNode?.replaceChild(list, blockElement);
      } else {
        li.innerHTML = sel.range.toString() || '<br>';
        list.appendChild(li);
        sel.range.deleteContents();
        sel.range.insertNode(list);
      }

      // Move cursor inside list item
      const range = document.createRange();
      range.selectNodeContents(li);
      range.collapse(false);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, [getSelection, getActiveFormats, findBlockParent, editorRef, saveHistory]);

  const insertLink = useCallback((url: string) => {
    const sel = getSelection();
    if (!sel.range) return;

    saveHistory();

    const text = sel.isCollapsed ? url : sel.range.toString();
    
    if (!sel.isCollapsed) {
      sel.range.deleteContents();
    }

    const link = document.createElement('a');
    link.href = url;
    link.textContent = text;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    
    sel.range.insertNode(link);

    // Move cursor after link
    const range = document.createRange();
    range.setStartAfter(link);
    range.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, [getSelection, saveHistory]);

  const removeLink = useCallback(() => {
    const sel = getSelection();
    if (!sel.range) return;

    saveHistory();

    let node: Node | null = sel.startContainer;
    while (node && node !== editorRef.current) {
      if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === 'A') {
        const link = node as HTMLAnchorElement;
        const text = document.createTextNode(link.textContent || '');
        link.parentNode?.replaceChild(text, link);
        break;
      }
      node = node.parentNode;
    }
  }, [getSelection, editorRef, saveHistory]);

  const setFontSize = useCallback((size: string) => {
    wrapSelectionWithSpan({ fontSize: size });
  }, [wrapSelectionWithSpan]);

  const setFontFamily = useCallback((family: string) => {
    wrapSelectionWithSpan({ fontFamily: family });
  }, [wrapSelectionWithSpan]);

  const setTextColor = useCallback((color: string) => {
    wrapSelectionWithSpan({ color });
  }, [wrapSelectionWithSpan]);

  const setBackgroundColor = useCallback((color: string) => {
    wrapSelectionWithSpan({ backgroundColor: color });
  }, [wrapSelectionWithSpan]);

  const insertImage = useCallback((src: string, alt: string = '') => {
    const sel = getSelection();
    if (!sel.range) return;

    saveHistory();

    const img = document.createElement('img');
    img.src = src;
    img.alt = alt;
    img.className = 'max-w-full h-auto rounded-lg my-4';
    img.setAttribute('data-editor-image', 'true');
    
    // Create a wrapper paragraph for the image
    const p = document.createElement('p');
    p.appendChild(img);
    
    sel.range.insertNode(p);

    // Move cursor after image
    const range = document.createRange();
    range.setStartAfter(p);
    range.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, [getSelection, saveHistory]);

  const sanitizeHTML = useCallback((html: string): string => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    
    // Allowed styles for sanitization - expanded list for better formatting preservation
    const allowedStyles = [
      'color', 'background-color', 'background',
      'font-size', 'font-family', 'font-weight', 'font-style',
      'text-decoration', 'text-decoration-line', 'text-decoration-color', 'text-decoration-style',
      'text-align', 'text-indent', 'text-transform',
      'line-height', 'letter-spacing', 'word-spacing',
      'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
      'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
      'border', 'border-radius',
      'width', 'height', 'max-width', 'max-height',
      'display', 'vertical-align',
    ];
    
    const sanitize = (node: Node) => {
      const children = Array.from(node.childNodes);
      
      children.forEach(child => {
        if (child.nodeType === Node.ELEMENT_NODE) {
          const el = child as HTMLElement;
          
          if (!ALLOWED_TAGS.includes(el.tagName)) {
            // Check if it's a block-level element that should become a paragraph
            const blockTags = ['DIV', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'MAIN', 'NAV', 'ASIDE'];
            if (blockTags.includes(el.tagName)) {
              const p = document.createElement('p');
              p.innerHTML = el.innerHTML;
              if (el.style.cssText) {
                p.style.cssText = el.style.cssText;
              }
              node.replaceChild(p, el);
              sanitize(p);
            } else {
              // Replace with its contents or wrap in span
              const span = document.createElement('span');
              span.innerHTML = el.innerHTML;
              if (el.style.cssText) {
                span.style.cssText = el.style.cssText;
              }
              node.replaceChild(span, el);
              sanitize(span);
            }
          } else {
            // Remove unwanted attributes
            const allowedAttrs = ['href', 'src', 'alt', 'style', 'class', 'target', 'rel', 'data-editor-image'];
            Array.from(el.attributes).forEach(attr => {
              if (!allowedAttrs.includes(attr.name)) {
                el.removeAttribute(attr.name);
              }
            });
            
            // Sanitize style attribute - preserve valid CSS
            if (el.style.cssText) {
              const styleObj: Record<string, string> = {};
              
              allowedStyles.forEach(prop => {
                const value = el.style.getPropertyValue(prop);
                if (value) {
                  styleObj[prop] = value;
                }
              });
              
              // Also check for text-align on the element directly
              const computedAlign = el.style.textAlign;
              if (computedAlign) {
                styleObj['text-align'] = computedAlign;
              }
              
              el.style.cssText = Object.entries(styleObj)
                .map(([k, v]) => `${k}: ${v}`)
                .join('; ');
            }
            
            sanitize(el);
          }
        }
      });
    };

    sanitize(doc.body);
    return doc.body.innerHTML;
  }, []);

  const handlePaste = useCallback((e: ClipboardEvent) => {
    e.preventDefault();
    saveHistory();

    const html = e.clipboardData?.getData('text/html');
    const text = e.clipboardData?.getData('text/plain');

    const sel = window.getSelection();
    if (!sel?.rangeCount) return;

    const range = sel.getRangeAt(0);
    range.deleteContents();

    if (html) {
      const sanitized = sanitizeHTML(html);
      const temp = document.createElement('div');
      temp.innerHTML = sanitized;
      
      const fragment = document.createDocumentFragment();
      while (temp.firstChild) {
        fragment.appendChild(temp.firstChild);
      }
      
      range.insertNode(fragment);
    } else if (text) {
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);
      
      range.setStartAfter(textNode);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }, [sanitizeHTML, saveHistory]);

  return {
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
    sanitizeHTML,
    handlePaste,
    saveSelection,
    restoreSelection,
    getActiveFormats,
    findFontTarget,
  };
}
