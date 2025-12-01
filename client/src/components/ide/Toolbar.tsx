import { useState, useEffect } from 'react';
import { GitBranch, Play, Square, Sun, Moon, Loader2, Code2, PanelLeftClose, PanelLeft, Columns, AlertCircle } from 'lucide-react';
import { SiGithub } from 'react-icons/si';
import { Button } from '@/components/ui/button';
import { useIDEStore } from '@/lib/ide-store';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface ToolbarProps {
  onLoadRepo: (url: string) => Promise<void>;
  onRunProject: () => Promise<void>;
  onStopProject: () => void;
}

export function Toolbar({ onLoadRepo, onRunProject, onStopProject }: ToolbarProps) {
  const {
    theme,
    toggleTheme,
    isLoading,
    isRunning,
    isSidebarOpen,
    setSidebarOpen,
    splitView,
    toggleSplitView,
    projectName,
  } = useIDEStore();
  
  const [repoUrl, setRepoUrl] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [webContainerAvailable, setWebContainerAvailable] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const checkWebContainer = async () => {
      try {
        const { isWebContainerAvailable } = await import('@/lib/webcontainer');
        setWebContainerAvailable(isWebContainerAvailable());
      } catch {
        setWebContainerAvailable(false);
      }
    };
    
    checkWebContainer();
    const interval = setInterval(checkWebContainer, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLoadRepo = async () => {
    if (!repoUrl.trim()) {
      toast({
        title: 'Invalid URL',
        description: 'Please enter a valid GitHub repository URL',
        variant: 'destructive',
      });
      return;
    }

    try {
      await onLoadRepo(repoUrl.trim());
      setIsDialogOpen(false);
      setRepoUrl('');
      toast({
        title: 'Repository loaded',
        description: 'Files have been loaded into the explorer',
      });
    } catch (error) {
      toast({
        title: 'Failed to load repository',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleRun = async () => {
    try {
      await onRunProject();
    } catch (error) {
      toast({
        title: 'Execution failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="h-12 flex items-center justify-between px-4 bg-sidebar border-b border-border">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Code2 className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">CodeForge</span>
        </div>
        
        <Separator orientation="vertical" className="h-6" />
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setSidebarOpen(!isSidebarOpen)}
              data-testid="button-toggle-sidebar"
            >
              {isSidebarOpen ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeft className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Toggle Sidebar (Ctrl+B)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleSplitView}
              data-testid="button-split-view"
            >
              <Columns className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Toggle Split View</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="flex items-center gap-2">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={isLoading} data-testid="button-open-github-dialog">
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <SiGithub className="h-4 w-4 mr-2" />
              )}
              {isLoading ? 'Loading...' : 'Load Repo'}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                Load GitHub Repository
              </DialogTitle>
              <DialogDescription>
                Enter a GitHub repository URL to load its files into the editor.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="repo-url">Repository URL</Label>
                <Input
                  id="repo-url"
                  placeholder="https://github.com/username/repo"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLoadRepo()}
                  data-testid="input-repo-url"
                />
              </div>
              <div className="text-xs text-muted-foreground">
                Example: https://github.com/facebook/react
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleLoadRepo} disabled={isLoading} data-testid="button-load-repo">
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load Repository'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {isRunning ? (
          <Button
            variant="destructive"
            size="sm"
            onClick={onStopProject}
            data-testid="button-stop"
          >
            <Square className="h-4 w-4 mr-2" />
            Stop
          </Button>
        ) : webContainerAvailable ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="default"
                size="sm"
                onClick={handleRun}
                disabled={isLoading}
                data-testid="button-run"
              >
                <Play className="h-4 w-4 mr-2" />
                Run
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Run Project (Ctrl+Enter)</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="sm"
                disabled
                data-testid="button-run-unavailable"
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                Not Available
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Code execution not available in this environment</p>
            </TooltipContent>
          </Tooltip>
        )}

        <Separator orientation="vertical" className="h-6" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleTheme}
              data-testid="button-toggle-theme"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Toggle Theme</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
