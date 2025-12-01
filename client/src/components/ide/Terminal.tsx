import { useRef, useEffect } from 'react';
import { useIDEStore } from '@/lib/ide-store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Trash2, Terminal as TerminalIcon, ChevronUp, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function TerminalPanel() {
  const { terminalOutputs, clearTerminal, isTerminalOpen, setTerminalOpen } = useIDEStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [terminalOutputs]);

  return (
    <div className={cn(
      "flex flex-col bg-sidebar border-t border-border transition-all duration-200",
      isTerminalOpen ? "h-64" : "h-10"
    )}>
      <div className="h-10 flex items-center justify-between px-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <TerminalIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Terminal
          </span>
          {terminalOutputs.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {terminalOutputs.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={clearTerminal}
            data-testid="button-clear-terminal"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => setTerminalOpen(!isTerminalOpen)}
            data-testid="button-toggle-terminal"
          >
            {isTerminalOpen ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {isTerminalOpen && (
        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="p-4 font-mono text-sm space-y-1">
            {terminalOutputs.length === 0 ? (
              <div className="text-muted-foreground text-xs">
                Terminal ready. Click "Run" to execute your project.
              </div>
            ) : (
              terminalOutputs.map((output) => (
                <div
                  key={output.id}
                  className={cn(
                    "whitespace-pre-wrap break-all",
                    output.type === 'stderr' && "text-destructive",
                    output.type === 'info' && "text-muted-foreground",
                    output.type === 'command' && "text-primary font-medium"
                  )}
                  data-testid={`terminal-output-${output.id}`}
                >
                  {output.type === 'command' && (
                    <span className="text-muted-foreground mr-2">$</span>
                  )}
                  {output.content}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
