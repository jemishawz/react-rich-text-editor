import React, { useRef, useState, useEffect, useCallback } from 'react';
import RichTextEditor, { RichTextEditorRef } from '@/components/editor/RichTextEditor';
import { Sun, Moon, Code, Eye, Copy, Check, RefreshCw } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Index = () => {
  const editorRef = useRef<RichTextEditorRef>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [htmlOutput, setHtmlOutput] = useState('');
  const [codeViewContent, setCodeViewContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeView, setActiveView] = useState<'visual' | 'code'>('visual');
  const [isCodeModified, setIsCodeModified] = useState(false);

  useEffect(() => {
    // Check system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleEditorChange = useCallback((html: string) => {
    setHtmlOutput(html);
    // Only update code view if we're in visual mode to prevent overwriting user edits
    if (activeView === 'visual') {
      setCodeViewContent(formatHTML(html));
    }
  }, [activeView]);

  // Format HTML with proper indentation for readability
  const formatHTML = (html: string): string => {
    const formatted = html
      .replace(/></g, '>\n<')
      .replace(/(<\/?(?:p|h[1-6]|ul|ol|li|blockquote|pre|div|br)[^>]*>)/gi, '\n$1')
      .split('\n')
      .filter(line => line.trim())
      .map(line => line.trim())
      .join('\n');
    return formatted;
  };

  // Apply code changes to visual editor
  const applyCodeToEditor = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.setHTML(codeViewContent);
      setHtmlOutput(codeViewContent);
      setIsCodeModified(false);
    }
  }, [codeViewContent]);

  // Handle code view changes
  const handleCodeChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCodeViewContent(e.target.value);
    setIsCodeModified(true);
  }, []);

  // Sync when switching tabs
  const handleTabChange = useCallback((value: string) => {
    if (value === 'visual' && isCodeModified) {
      applyCodeToEditor();
    } else if (value === 'code') {
      setCodeViewContent(formatHTML(htmlOutput));
      setIsCodeModified(false);
    }
    setActiveView(value as 'visual' | 'code');
  }, [isCodeModified, applyCodeToEditor, htmlOutput]);

  const handleCopyHTML = async () => {
    try {
      await navigator.clipboard.writeText(codeViewContent || htmlOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const initialContent = `
    <h1>Welcome to the Rich Text Editor</h1>
    <p>This is a <strong>fully custom</strong> rich text editor built with <em>React</em>, using only <code>contentEditable</code>, <code>Selection API</code>, and <code>Range API</code>.</p>
    <h2>Features</h2>
    <ul>
      <li>Block elements: Headings, paragraphs, lists, blockquotes</li>
      <li>Inline formatting: Bold, italic, underline, strikethrough</li>
      <li>Font customization: Size, family, colors</li>
      <li>Image upload with resize handles</li>
      <li>Undo/redo with history stack</li>
    </ul>
    <h3>Smart Span Handling</h3>
    <p>When you select an entire block (like this paragraph) and apply formatting, styles are applied directly to the block element—<strong>no unnecessary spans!</strong></p>
    <blockquote>This editor follows best practices for clean HTML output and maintains a semantic document structure.</blockquote>
    <p>Try selecting text and formatting it, or upload an image to see the resize handles in action!</p>
  `;

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                Rich Text Editor
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Custom built with Selection & Range APIs
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyHTML}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
              >
                {copied ? (
                  <>
                    <Check size={16} className="text-green-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    Copy HTML
                  </>
                )}
              </button>
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <Tabs value={activeView} onValueChange={handleTabChange} className="w-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList className="bg-muted">
                <TabsTrigger value="visual" className="flex items-center gap-2">
                  <Eye size={16} />
                  Visual Editor
                </TabsTrigger>
                <TabsTrigger value="code" className="flex items-center gap-2">
                  <Code size={16} />
                  HTML Code
                </TabsTrigger>
              </TabsList>
              
              {activeView === 'code' && isCodeModified && (
                <button
                  onClick={applyCodeToEditor}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <RefreshCw size={14} />
                  Apply Changes
                </button>
              )}
            </div>

            <TabsContent value="visual" className="mt-0">
              <RichTextEditor
                ref={editorRef}
                initialValue={initialContent}
                onChange={handleEditorChange}
                placeholder="Start writing..."
                className="min-h-[500px]"
              />
            </TabsContent>

            <TabsContent value="code" className="mt-0">
              <div className="rounded-xl border border-editor-border bg-editor-bg overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                  <span className="text-sm font-medium text-foreground">HTML Source Code</span>
                  <span className="text-xs text-muted-foreground">
                    {isCodeModified ? (
                      <span className="text-amber-500 font-medium">● Unsaved changes</span>
                    ) : (
                      'Edit HTML directly'
                    )}
                  </span>
                </div>
                <textarea
                  value={codeViewContent}
                  onChange={handleCodeChange}
                  className="w-full min-h-[500px] p-6 bg-transparent font-mono text-sm text-foreground resize-none focus:outline-none leading-relaxed"
                  placeholder="<p>Enter your HTML here...</p>"
                  spellCheck={false}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Instructions */}
        <div className="mt-12 max-w-4xl mx-auto">
          <h2 className="text-xl font-semibold text-foreground mb-4">Keyboard Shortcuts</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { keys: 'Ctrl + B', action: 'Bold' },
              { keys: 'Ctrl + I', action: 'Italic' },
              { keys: 'Ctrl + U', action: 'Underline' },
              { keys: 'Ctrl + Z', action: 'Undo' },
              { keys: 'Ctrl + Y', action: 'Redo' },
              { keys: 'Enter', action: 'New paragraph' },
              { keys: 'Shift + Enter', action: 'Line break' },
              { keys: 'Backspace', action: 'Delete selected image' },
            ].map((shortcut) => (
              <div
                key={shortcut.keys}
                className="flex items-center gap-3 px-4 py-3 rounded-lg bg-card border border-border"
              >
                <kbd className="px-2 py-1 text-xs font-mono bg-muted text-muted-foreground rounded">
                  {shortcut.keys}
                </kbd>
                <span className="text-sm text-foreground">{shortcut.action}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
