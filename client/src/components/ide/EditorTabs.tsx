import { X, Circle } from 'lucide-react';
import { useIDEStore } from '@/lib/ide-store';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function EditorTabs() {
  const { tabs, activeTabId, setActiveTab, closeTab } = useIDEStore();

  if (tabs.length === 0) {
    return null;
  }

  const handleClose = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    closeTab(tabId);
  };

  return (
    <div className="h-10 bg-sidebar border-b border-border flex items-center">
      <ScrollArea className="w-full">
        <div className="flex items-center h-10">
          {tabs.map((tab) => (
            <Tooltip key={tab.id}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "group flex items-center gap-2 h-10 px-4 border-r border-border cursor-pointer text-sm transition-colors",
                    tab.id === activeTabId
                      ? "bg-background text-foreground"
                      : "bg-sidebar text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                  onClick={() => setActiveTab(tab.id)}
                  data-testid={`tab-${tab.id}`}
                >
                  <span className="truncate max-w-32 text-[13px]">{tab.name}</span>
                  {tab.isModified && (
                    <Circle className="h-2 w-2 fill-current text-primary shrink-0" />
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleClose(e, tab.id)}
                    data-testid={`button-close-tab-${tab.id}`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="font-mono text-xs">{tab.path}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
