import { useRef, useEffect, useState } from 'react';
import { useIDEStore } from '@/lib/ide-store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Terminal as TerminalIcon, ChevronUp, ChevronDown, X, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

export function TerminalPanel() {
  const { terminalOutputs, clearTerminal, isTerminalOpen, setTerminalOpen, addTerminalOutput, currentSessionId } = useIDEStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [terminalOutputs]);

  const handleExecuteCommand = async () => {
    if (!input.trim() || !currentSessionId) return;
    
    addTerminalOutput({ type: 'command', content: input });
    setInput('');
    setIsExecuting(true);

    try {
      const parts = input.split(/\s+/);
      const command = parts[0];
      const args = parts.slice(1);

      const { executeCommand } = await import('@/lib/execution-client');
      const output = await executeCommand(currentSessionId, command, args);
      for await (const line of output) {
        addTerminalOutput({ type: 'stdout', content: line });
      }
    } catch (error) {
      addTerminalOutput({
        type: 'stderr',
        content: error instanceof Error ? error.message : 'Command execution failed',
      });
    } finally {
      setIsExecuting(false);
    }
  };

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
        <div className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1" ref={scrollRef}>
            <div className="p-4 font-mono text-sm space-y-0.5">
              {terminalOutputs.length === 0 ? (
                <div className="text-muted-foreground text-xs py-8">
                  Terminal ready. Click "Run" to execute your project or type commands below.
                </div>
              ) : (
                terminalOutputs.map((output) => (
                  <div
                    key={output.id}
                    className={cn(
                      "py-0.5 px-2 hover-elevate rounded cursor-text select-all",
                      output.type === 'stderr' && "text-destructive bg-destructive/5",
                      output.type === 'info' && "text-muted-foreground",
                      output.type === 'command' && "text-primary font-medium bg-primary/5"
                    )}
                    data-testid={`terminal-output-${output.id}`}
                  >
                    <div className="whitespace-pre-wrap break-all">
                      {output.type === 'command' && (
                        <span className="text-muted-foreground mr-2">$</span>
                      )}
                      {output.content}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
          
          <div className="flex gap-2 px-4 py-2 border-t border-border bg-sidebar/50">
            <span className="text-muted-foreground font-mono text-sm flex items-center">$</span>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isExecuting) handleExecuteCommand();
              }}
              placeholder="Type command (e.g., npm install, node app.js)..."
              disabled={isExecuting}
              data-testid="terminal-input"
              className="font-mono text-sm"
            />
            <Button
              size="icon"
              onClick={handleExecuteCommand}
              disabled={isExecuting || !input.trim() || !currentSessionId}
              data-testid="button-execute-command"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
