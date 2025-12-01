import { useRef, useEffect, useState } from 'react';
import { useIDEStore } from '@/lib/ide-store';
import { Eye, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PreviewPanel() {
  const { tabs, activeTabId } = useIDEStore();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const isHtmlFile = activeTab?.language === 'html' || activeTab?.name.endsWith('.html');

  useEffect(() => {
    if (!isHtmlFile || !activeTab || !iframeRef.current) {
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(activeTab.content || '');
        doc.close();
        setIsLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to render preview');
      setIsLoading(false);
    }
  }, [activeTab?.content, activeTab?.id, isHtmlFile]);

  if (!isHtmlFile) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-background text-muted-foreground">
        <Eye className="h-16 w-16 mb-4 opacity-30" />
        <p className="text-lg font-medium">No Preview</p>
        <p className="text-sm mt-1 opacity-70">Open an HTML file to preview</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-white dark:bg-slate-900">
      <div className="flex-1 overflow-hidden relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-10 p-4">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-sm text-destructive text-center">{error}</p>
          </div>
        )}

        <iframe
          ref={iframeRef}
          className="h-full w-full border-0"
          title="HTML Preview"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
    </div>
  );
}
