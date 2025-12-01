import { useIDEStore } from '@/lib/ide-store';
import { Chrome, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function PreviewPanel() {
  const { previewUrl, previewOpen, setPreviewOpen } = useIDEStore();

  if (!previewOpen) {
    return null;
  }

  return (
    <div className="h-full w-full flex flex-col bg-background border-l border-border overflow-hidden">
      <div className="h-10 flex items-center justify-between px-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Chrome className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Preview
          </span>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={() => setPreviewOpen(false)}
          data-testid="button-close-preview"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        {previewUrl ? (
          <iframe
            src={previewUrl}
            className="h-full w-full border-0"
            title="React App Preview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-4">
            <Chrome className="h-16 w-16 mb-4 opacity-30" />
            <p className="text-sm">No preview available</p>
            <p className="text-xs opacity-70 mt-1 text-center">Run a React or Next.js app to see preview</p>
          </div>
        )}
      </div>
    </div>
  );
}
