import { useIDEStore } from '@/lib/ide-store';
import { GitBranch, Circle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StatusBar() {
  const { tabs, activeTabId, isLoading, isRunning, projectName } = useIDEStore();
  const activeTab = tabs.find((t) => t.id === activeTabId);

  return (
    <div className="h-6 flex items-center justify-between px-4 bg-primary text-primary-foreground text-xs">
      <div className="flex items-center gap-4">
        {projectName && (
          <div className="flex items-center gap-1.5">
            <GitBranch className="h-3 w-3" />
            <span>{projectName}</span>
          </div>
        )}
        {activeTab && (
          <span className="text-primary-foreground/80">{activeTab.path}</span>
        )}
      </div>

      <div className="flex items-center gap-4">
        {isLoading && (
          <div className="flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Loading...</span>
          </div>
        )}
        {isRunning && (
          <div className="flex items-center gap-1.5">
            <Circle className="h-2 w-2 fill-green-400 text-green-400 animate-pulse" />
            <span>Running</span>
          </div>
        )}
        {activeTab && (
          <>
            <span className="text-primary-foreground/80">{activeTab.language}</span>
            <span className="text-primary-foreground/80">UTF-8</span>
          </>
        )}
      </div>
    </div>
  );
}
