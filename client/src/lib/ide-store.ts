import { create } from 'zustand';
import type { FileNode, Tab, TerminalOutput } from '@shared/schema';

interface IDEState {
  // File system
  files: FileNode[];
  setFiles: (files: FileNode[]) => void;
  
  // Tabs
  tabs: Tab[];
  activeTabId: string | null;
  openFile: (file: FileNode) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateTabContent: (tabId: string, content: string) => void;
  markTabSaved: (tabId: string) => void;
  
  // File explorer
  expandedFolders: Set<string>;
  toggleFolder: (path: string) => void;
  
  // Terminal
  terminalOutputs: TerminalOutput[];
  addTerminalOutput: (output: Omit<TerminalOutput, 'id' | 'timestamp'>) => void;
  clearTerminal: () => void;
  isTerminalOpen: boolean;
  setTerminalOpen: (open: boolean) => void;
  
  // Project
  projectName: string | null;
  setProjectName: (name: string | null) => void;
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  
  // Theme
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  
  // Sidebar
  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  
  // Execution
  isRunning: boolean;
  setRunning: (running: boolean) => void;
  currentSessionId: string | null;
  setCurrentSessionId: (id: string | null) => void;
  
  // Split view
  splitView: boolean;
  toggleSplitView: () => void;

  // Preview
  previewUrl: string | null;
  setPreviewUrl: (url: string | null) => void;
  previewOpen: boolean;
  setPreviewOpen: (open: boolean) => void;
}

const getLanguageFromPath = (path: string): string => {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const languageMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    html: 'html',
    css: 'css',
    scss: 'scss',
    json: 'json',
    md: 'markdown',
    yaml: 'yaml',
    yml: 'yaml',
    xml: 'xml',
    sh: 'shell',
    bash: 'shell',
    sql: 'sql',
    go: 'go',
    rs: 'rust',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    h: 'c',
    hpp: 'cpp',
    rb: 'ruby',
    php: 'php',
    swift: 'swift',
    kt: 'kotlin',
    vue: 'vue',
    svelte: 'svelte',
  };
  return languageMap[ext] || 'plaintext';
};

export const useIDEStore = create<IDEState>((set, get) => ({
  // File system
  files: [],
  setFiles: (files) => set({ files }),
  
  // Tabs
  tabs: [],
  activeTabId: null,
  openFile: (file) => {
    if (file.type !== 'file') return;
    
    const { tabs } = get();
    const existingTab = tabs.find(t => t.path === file.path);
    
    if (existingTab) {
      set({ activeTabId: existingTab.id });
    } else {
      const newTab: Tab = {
        id: `tab-${Date.now()}`,
        path: file.path,
        name: file.name,
        content: file.content || '',
        language: getLanguageFromPath(file.path),
        isModified: false,
        isActive: true,
      };
      
      set({
        tabs: [...tabs.map(t => ({ ...t, isActive: false })), newTab],
        activeTabId: newTab.id,
      });
    }
  },
  closeTab: (tabId) => {
    const { tabs, activeTabId } = get();
    const tabIndex = tabs.findIndex(t => t.id === tabId);
    const newTabs = tabs.filter(t => t.id !== tabId);
    
    let newActiveId = activeTabId;
    if (activeTabId === tabId) {
      if (newTabs.length > 0) {
        const newIndex = Math.min(tabIndex, newTabs.length - 1);
        newActiveId = newTabs[newIndex].id;
      } else {
        newActiveId = null;
      }
    }
    
    set({ tabs: newTabs, activeTabId: newActiveId });
  },
  setActiveTab: (tabId) => {
    set({
      tabs: get().tabs.map(t => ({ ...t, isActive: t.id === tabId })),
      activeTabId: tabId,
    });
  },
  updateTabContent: (tabId, content) => {
    set({
      tabs: get().tabs.map(t =>
        t.id === tabId ? { ...t, content, isModified: true } : t
      ),
    });
  },
  markTabSaved: (tabId) => {
    set({
      tabs: get().tabs.map(t =>
        t.id === tabId ? { ...t, isModified: false } : t
      ),
    });
  },
  
  // File explorer
  expandedFolders: new Set<string>(),
  toggleFolder: (path) => {
    const { expandedFolders } = get();
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    set({ expandedFolders: newExpanded });
  },
  
  // Terminal
  terminalOutputs: [],
  addTerminalOutput: (output) => {
    const newOutput: TerminalOutput = {
      ...output,
      id: `output-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    set({ terminalOutputs: [...get().terminalOutputs, newOutput] });
  },
  clearTerminal: () => set({ terminalOutputs: [] }),
  isTerminalOpen: true,
  setTerminalOpen: (open) => set({ isTerminalOpen: open }),
  
  // Project
  projectName: null,
  setProjectName: (name) => set({ projectName: name }),
  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),
  
  // Theme
  theme: 'dark',
  toggleTheme: () => {
    const newTheme = get().theme === 'dark' ? 'light' : 'dark';
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('ide-theme', newTheme);
    set({ theme: newTheme });
  },
  
  // Sidebar
  isSidebarOpen: true,
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  
  // Execution
  isRunning: false,
  setRunning: (running) => set({ isRunning: running }),
  currentSessionId: null,
  setCurrentSessionId: (id) => set({ currentSessionId: id }),
  
  // Split view
  splitView: false,
  toggleSplitView: () => set({ splitView: !get().splitView }),
  
  // Preview
  previewUrl: null,
  setPreviewUrl: (url) => set({ previewUrl: url }),
  previewOpen: false,
  setPreviewOpen: (open) => set({ previewOpen: open }),
}));

// Initialize theme from localStorage
if (typeof window !== 'undefined') {
  const savedTheme = localStorage.getItem('ide-theme') as 'dark' | 'light' | null;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
  
  if (initialTheme === 'dark') {
    document.documentElement.classList.add('dark');
  }
  useIDEStore.setState({ theme: initialTheme });
}
