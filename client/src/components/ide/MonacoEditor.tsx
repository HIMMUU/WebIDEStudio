import { useRef, useEffect } from 'react';
import Editor, { OnMount, OnChange } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useIDEStore } from '@/lib/ide-store';
import { Loader2, FileCode } from 'lucide-react';

export function MonacoEditor() {
  const { tabs, activeTabId, updateTabContent, theme } = useIDEStore();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    monaco.editor.defineTheme('ide-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'C586C0' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'type', foreground: '4EC9B0' },
      ],
      colors: {
        'editor.background': '#1e1e1e',
        'editor.foreground': '#d4d4d4',
        'editor.lineHighlightBackground': '#2a2d2e',
        'editorCursor.foreground': '#aeafad',
        'editor.selectionBackground': '#264f78',
        'editor.inactiveSelectionBackground': '#3a3d41',
        'editorLineNumber.foreground': '#858585',
        'editorLineNumber.activeForeground': '#c6c6c6',
        'editorIndentGuide.background1': '#404040',
        'editorIndentGuide.activeBackground1': '#707070',
        'scrollbar.shadow': '#000000',
        'scrollbarSlider.background': '#79797966',
        'scrollbarSlider.hoverBackground': '#646464b3',
        'scrollbarSlider.activeBackground': '#bfbfbf66',
      },
    });

    monaco.editor.defineTheme('ide-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '008000', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'AF00DB' },
        { token: 'string', foreground: 'A31515' },
        { token: 'number', foreground: '098658' },
        { token: 'type', foreground: '267f99' },
      ],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#000000',
        'editor.lineHighlightBackground': '#f0f0f0',
        'editorCursor.foreground': '#000000',
        'editor.selectionBackground': '#add6ff',
        'editor.inactiveSelectionBackground': '#e5ebf1',
        'editorLineNumber.foreground': '#237893',
        'editorLineNumber.activeForeground': '#0b216f',
      },
    });

    monaco.editor.setTheme(theme === 'dark' ? 'ide-dark' : 'ide-light');

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      console.log('Save triggered');
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyP, () => {
      console.log('Quick open triggered');
    });
  };

  useEffect(() => {
    if (editorRef.current) {
      import('monaco-editor').then(({ editor }) => {
        editor.setTheme(theme === 'dark' ? 'ide-dark' : 'ide-light');
      });
    }
  }, [theme]);

  const handleEditorChange: OnChange = (value) => {
    if (activeTabId && value !== undefined) {
      updateTabContent(activeTabId, value);
    }
  };

  if (!activeTab) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-background text-muted-foreground">
        <FileCode className="h-16 w-16 mb-4 opacity-30" />
        <p className="text-lg font-medium">No file open</p>
        <p className="text-sm mt-1 opacity-70">Select a file from the explorer to start editing</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        language={activeTab.language}
        value={activeTab.content}
        onChange={handleEditorChange}
        onMount={handleEditorMount}
        theme={theme === 'dark' ? 'ide-dark' : 'ide-light'}
        loading={
          <div className="flex items-center justify-center h-full bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        }
        options={{
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
          fontSize: 14,
          lineHeight: 22,
          minimap: { enabled: true, scale: 1 },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'off',
          renderWhitespace: 'selection',
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
          padding: { top: 16, bottom: 16 },
          folding: true,
          foldingHighlight: true,
          showFoldingControls: 'mouseover',
          bracketPairColorization: { enabled: true },
          guides: {
            bracketPairs: true,
            indentation: true,
          },
          suggest: {
            showMethods: true,
            showFunctions: true,
            showConstructors: true,
            showFields: true,
            showVariables: true,
            showClasses: true,
            showStructs: true,
            showInterfaces: true,
            showModules: true,
            showProperties: true,
            showEvents: true,
            showOperators: true,
            showUnits: true,
            showValues: true,
            showConstants: true,
            showEnums: true,
            showEnumMembers: true,
            showKeywords: true,
            showWords: true,
            showColors: true,
            showFiles: true,
            showReferences: true,
            showFolders: true,
            showTypeParameters: true,
            showSnippets: true,
          },
        }}
      />
    </div>
  );
}
