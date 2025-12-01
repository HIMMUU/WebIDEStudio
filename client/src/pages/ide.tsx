import { useEffect, useCallback, useRef } from 'react';
import { FileExplorer } from '@/components/ide/FileExplorer';
import { EditorTabs } from '@/components/ide/EditorTabs';
import { MonacoEditor } from '@/components/ide/MonacoEditor';
import { TerminalPanel } from '@/components/ide/Terminal';
import { PreviewPanel } from '@/components/ide/PreviewPanel';
import { Toolbar } from '@/components/ide/Toolbar';
import { StatusBar } from '@/components/ide/StatusBar';
import { useIDEStore } from '@/lib/ide-store';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/lib/queryClient';
import type { FileNode } from '@shared/schema';
import { mountFiles, installDependencies, runScript, checkPackageJson, isNextJsProject, writeFile as writeContainerFile, isWebContainerAvailable, type ProcessOutput } from '@/lib/webcontainer';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function IDEPage() {
  const {
    files,
    setFiles,
    setProjectName,
    isLoading,
    setLoading,
    isRunning,
    setRunning,
    isSidebarOpen,
    splitView,
    previewOpen,
    setPreviewUrl,
    addTerminalOutput,
    setTerminalOpen,
    clearTerminal,
  } = useIDEStore();
  
  const { toast } = useToast();
  const runningProcessRef = useRef<{ kill: () => void } | null>(null);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'b':
            e.preventDefault();
            useIDEStore.getState().setSidebarOpen(!useIDEStore.getState().isSidebarOpen);
            break;
          case '`':
            e.preventDefault();
            useIDEStore.getState().setTerminalOpen(!useIDEStore.getState().isTerminalOpen);
            break;
          case 's':
            e.preventDefault();
            const { tabs: currentTabs, activeTabId: currentActiveId, markTabSaved: saveTab } = useIDEStore.getState();
            const currentActiveTab = currentTabs.find(t => t.id === currentActiveId);
            if (currentActiveTab && currentActiveId) {
              saveTab(currentActiveId);
              try {
                await writeContainerFile(currentActiveTab.path, currentActiveTab.content);
              } catch (error) {
                console.log('WebContainer not ready, file saved locally');
              }
              toast({
                title: 'File saved',
                description: currentActiveTab.name,
                duration: 3000,
              });
            }
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toast]);

  const handleLoadRepo = useCallback(async (url: string) => {
    setLoading(true);
    clearTerminal();
    
    try {
      const response = await apiRequest('POST', '/api/github/load', { repoUrl: url });
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to load repository');
      }

      setFiles(data.data.files);
      setProjectName(data.data.name);
      
      addTerminalOutput({
        type: 'info',
        content: `Repository "${data.data.name}" loaded successfully with ${countFiles(data.data.files)} files.`,
      });

      if (data.data.files.length > 0) {
        try {
          addTerminalOutput({
            type: 'info',
            content: 'Initializing WebContainer...',
          });
          await mountFiles(data.data.files);
          addTerminalOutput({
            type: 'info',
            content: 'Ready to run. Click "Run" to execute your project.',
          });
        } catch (err) {
          addTerminalOutput({
            type: 'info',
            content: 'WebContainer initialization skipped - attempting to run anyway.',
          });
        }
      }
    } finally {
      setLoading(false);
    }
  }, [setLoading, setFiles, setProjectName, addTerminalOutput, clearTerminal]);

  const handleRunProject = useCallback(async () => {
    if (files.length === 0) {
      toast({
        title: 'No files loaded',
        description: 'Load a repository first before running',
        variant: 'destructive',
      });
      return;
    }

    setRunning(true);
    setTerminalOpen(true);
    clearTerminal();

    try {
      const { createExecutionSession, writeFilesToSession, executeCommand: execCmd, killProcess } = await import('@/lib/execution-client');
      
      const session = await createExecutionSession();
      addTerminalOutput({ type: 'info', content: `✓ Execution environment ready\n` });

      // Write all files
      const filesToWrite: Array<{ path: string; content: string }> = [];
      const collectFiles = (nodes: FileNode[]) => {
        nodes.forEach(node => {
          if (node.type === 'file' && node.content) {
            filesToWrite.push({ path: node.path, content: node.content });
          }
          if (node.children) collectFiles(node.children);
        });
      };
      collectFiles(files);

      if (filesToWrite.length > 0) {
        await writeFilesToSession(session.sessionId, filesToWrite);
        addTerminalOutput({ type: 'info', content: `✓ Wrote ${filesToWrite.length} files\n` });
      }

      const hasPackageJson = await checkPackageJson(files);
      
      if (hasPackageJson) {
        addTerminalOutput({ type: 'command', content: 'npm install' });
        
        const installOutput = await execCmd(session.sessionId, 'npm', ['install']);
        for await (const line of installOutput) {
          addTerminalOutput({ type: 'stdout', content: line });
        }

        const isNextJs = await isNextJsProject(files);
        const scriptName = isNextJs ? 'dev' : 'start';
        
        addTerminalOutput({ type: 'command', content: `npm run ${scriptName}` });

        const output = await execCmd(session.sessionId, 'npm', ['run', scriptName]);
        let urlDetected = false;
        
        for await (const line of output) {
          addTerminalOutput({ type: 'stdout', content: line });
          
          if (!urlDetected) {
            const patterns = [
              /https?:\/\/localhost:\d+/,
              /http:\/\/[\d.]+:\d+/,
              /Local:\s+(https?:\/\/[^\s]+)/,
              /url:\s+(https?:\/\/[^\s]+)/,
              /ready.*http:\/\/localhost:\d+/i,
            ];
            
            for (const pattern of patterns) {
              const match = line.match(pattern);
              if (match) {
                const url = match[1] || match[0];
                setPreviewUrl(url);
                urlDetected = true;
                addTerminalOutput({ type: 'info', content: `\n✓ Preview: ${url}\n` });
                break;
              }
            }
          }
        }
      } else {
        addTerminalOutput({ type: 'info', content: 'Starting project...' });
        const output = await execCmd(session.sessionId, 'npm', ['start']);
        for await (const line of output) {
          addTerminalOutput({ type: 'stdout', content: line });
        }
      }

      runningProcessRef.current = { 
        kill: () => killProcess(session.sessionId).catch(() => {}) 
      };
    } catch (error) {
      addTerminalOutput({
        type: 'stderr',
        content: error instanceof Error ? error.message : 'Execution failed',
      });
    } finally {
      setRunning(false);
    }
  }, [files, setRunning, setTerminalOpen, addTerminalOutput, setPreviewUrl, clearTerminal, toast]);

  const handleStopProject = useCallback(() => {
    if (runningProcessRef.current) {
      runningProcessRef.current.kill();
      runningProcessRef.current = null;
    }
    setRunning(false);
    addTerminalOutput({
      type: 'info',
      content: 'Process stopped.',
    });
  }, [setRunning, addTerminalOutput]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
      <Toolbar
        onLoadRepo={handleLoadRepo}
        onRunProject={handleRunProject}
        onStopProject={handleStopProject}
      />

      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {isSidebarOpen && (
            <>
              <ResizablePanel defaultSize={20} minSize={15} maxSize={35}>
                <FileExplorer />
              </ResizablePanel>
              <ResizableHandle withHandle />
            </>
          )}

          <ResizablePanel defaultSize={previewOpen ? 50 : 80}>
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel defaultSize={75} minSize={30}>
                <div className="h-full flex flex-col">
                  <EditorTabs />
                  <div className="flex-1 overflow-hidden">
                    {splitView ? (
                      <ResizablePanelGroup direction="horizontal">
                        <ResizablePanel defaultSize={50}>
                          <MonacoEditor />
                        </ResizablePanel>
                        <ResizableHandle withHandle />
                        <ResizablePanel defaultSize={50}>
                          <MonacoEditor />
                        </ResizablePanel>
                      </ResizablePanelGroup>
                    ) : (
                      <MonacoEditor />
                    )}
                  </div>
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel defaultSize={25} minSize={10} maxSize={50}>
                <TerminalPanel />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          {previewOpen && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={50} minSize={20}>
                <PreviewPanel />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>

      <StatusBar />

      {isLoading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-medium">Loading repository...</p>
            <p className="text-sm text-muted-foreground">This may take a moment for larger repositories</p>
          </div>
        </div>
      )}
    </div>
  );
}

function countFiles(nodes: FileNode[]): number {
  let count = 0;
  for (const node of nodes) {
    if (node.type === 'file') {
      count++;
    }
    if (node.children) {
      count += countFiles(node.children);
    }
  }
  return count;
}
