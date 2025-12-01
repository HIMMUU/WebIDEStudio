import { useState } from 'react';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, FileCode, FileJson, FileText, Plus, Trash2, Edit3 } from 'lucide-react';
import { useIDEStore } from '@/lib/ide-store';
import type { FileNode } from '@shared/schema';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const getFileIcon = (name: string, isFolder: boolean, isExpanded: boolean) => {
  if (isFolder) {
    return isExpanded ? (
      <FolderOpen className="h-4 w-4 text-amber-500 shrink-0" />
    ) : (
      <Folder className="h-4 w-4 text-amber-500 shrink-0" />
    );
  }

  const ext = name.split('.').pop()?.toLowerCase() || '';
  
  switch (ext) {
    case 'js':
    case 'jsx':
      return <FileCode className="h-4 w-4 text-yellow-400 shrink-0" />;
    case 'ts':
    case 'tsx':
      return <FileCode className="h-4 w-4 text-blue-400 shrink-0" />;
    case 'json':
      return <FileJson className="h-4 w-4 text-yellow-300 shrink-0" />;
    case 'md':
    case 'txt':
      return <FileText className="h-4 w-4 text-muted-foreground shrink-0" />;
    case 'html':
      return <FileCode className="h-4 w-4 text-orange-400 shrink-0" />;
    case 'css':
    case 'scss':
      return <FileCode className="h-4 w-4 text-blue-300 shrink-0" />;
    case 'py':
      return <FileCode className="h-4 w-4 text-green-400 shrink-0" />;
    default:
      return <File className="h-4 w-4 text-muted-foreground shrink-0" />;
  }
};

interface FileTreeItemProps {
  node: FileNode;
  depth: number;
  onCreateFile: (parentPath: string, type: 'file' | 'folder') => void;
  onDelete: (path: string) => void;
  onRename: (path: string, newName: string) => void;
}

function FileTreeItem({ node, depth, onCreateFile, onDelete, onRename }: FileTreeItemProps) {
  const { openFile, expandedFolders, toggleFolder, activeTabId, tabs } = useIDEStore();
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(node.name);
  
  const isExpanded = expandedFolders.has(node.path);
  const isFolder = node.type === 'folder';
  const activeTab = tabs.find(t => t.id === activeTabId);
  const isActive = activeTab?.path === node.path;

  const handleClick = () => {
    if (isFolder) {
      toggleFolder(node.path);
    } else {
      openFile(node);
    }
  };

  const handleRenameSubmit = () => {
    if (newName && newName !== node.name) {
      onRename(node.path, newName);
    }
    setIsRenaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setNewName(node.name);
      setIsRenaming(false);
    }
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-1 py-1 px-2 cursor-pointer text-sm hover-elevate rounded-sm",
              isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
            )}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onClick={handleClick}
            data-testid={`file-tree-item-${node.path}`}
          >
            {isFolder && (
              <span className="shrink-0">
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </span>
            )}
            {!isFolder && <span className="w-3.5 shrink-0" />}
            {getFileIcon(node.name, isFolder, isExpanded)}
            {isRenaming ? (
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={handleKeyDown}
                className="h-5 py-0 px-1 text-sm"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="truncate text-[13px]">{node.name}</span>
            )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {isFolder && (
            <>
              <ContextMenuItem onClick={() => onCreateFile(node.path, 'file')}>
                <Plus className="h-4 w-4 mr-2" />
                New File
              </ContextMenuItem>
              <ContextMenuItem onClick={() => onCreateFile(node.path, 'folder')}>
                <Folder className="h-4 w-4 mr-2" />
                New Folder
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          )}
          <ContextMenuItem onClick={() => setIsRenaming(true)}>
            <Edit3 className="h-4 w-4 mr-2" />
            Rename
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onDelete(node.path)} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {isFolder && isExpanded && node.children && (
        <div>
          {node.children
            .sort((a, b) => {
              if (a.type === b.type) return a.name.localeCompare(b.name);
              return a.type === 'folder' ? -1 : 1;
            })
            .map((child) => (
              <FileTreeItem
                key={child.path}
                node={child}
                depth={depth + 1}
                onCreateFile={onCreateFile}
                onDelete={onDelete}
                onRename={onRename}
              />
            ))}
        </div>
      )}
    </>
  );
}

export function FileExplorer() {
  const { files, projectName, setFiles } = useIDEStore();
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [newItemType, setNewItemType] = useState<'file' | 'folder'>('file');
  const [newItemParentPath, setNewItemParentPath] = useState('');
  const [newItemName, setNewItemName] = useState('');

  const handleCreateFile = (parentPath: string, type: 'file' | 'folder') => {
    setNewItemParentPath(parentPath);
    setNewItemType(type);
    setNewItemName('');
    setShowNewFileDialog(true);
  };

  const handleCreateSubmit = () => {
    if (!newItemName) return;

    const newPath = newItemParentPath ? `${newItemParentPath}/${newItemName}` : newItemName;
    const newNode: FileNode = {
      id: `node-${Date.now()}`,
      name: newItemName,
      path: newPath,
      type: newItemType,
      content: newItemType === 'file' ? '' : undefined,
      children: newItemType === 'folder' ? [] : undefined,
    };

    const addNodeToTree = (nodes: FileNode[], parentPath: string): FileNode[] => {
      if (!parentPath) {
        return [...nodes, newNode];
      }
      
      return nodes.map(node => {
        if (node.path === parentPath && node.type === 'folder') {
          return {
            ...node,
            children: [...(node.children || []), newNode],
          };
        }
        if (node.children) {
          return {
            ...node,
            children: addNodeToTree(node.children, parentPath),
          };
        }
        return node;
      });
    };

    setFiles(addNodeToTree(files, newItemParentPath));
    setShowNewFileDialog(false);
  };

  const handleDelete = (path: string) => {
    const removeNodeFromTree = (nodes: FileNode[]): FileNode[] => {
      return nodes
        .filter(node => node.path !== path)
        .map(node => ({
          ...node,
          children: node.children ? removeNodeFromTree(node.children) : undefined,
        }));
    };

    setFiles(removeNodeFromTree(files));
  };

  const handleRename = (path: string, newName: string) => {
    const renameNodeInTree = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => {
        if (node.path === path) {
          const parentPath = path.split('/').slice(0, -1).join('/');
          const newPath = parentPath ? `${parentPath}/${newName}` : newName;
          return { ...node, name: newName, path: newPath };
        }
        if (node.children) {
          return { ...node, children: renameNodeInTree(node.children) };
        }
        return node;
      });
    };

    setFiles(renameNodeInTree(files));
  };

  return (
    <div className="h-full flex flex-col bg-sidebar border-r border-sidebar-border">
      <div className="h-10 flex items-center justify-between px-4 border-b border-sidebar-border">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {projectName || 'Explorer'}
        </span>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => handleCreateFile('', 'file')}
            data-testid="button-new-file"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => handleCreateFile('', 'folder')}
            data-testid="button-new-folder"
          >
            <Folder className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="py-2">
          {files.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted-foreground text-sm">
              No files loaded.
              <br />
              Load a GitHub repository to start.
            </div>
          ) : (
            files
              .sort((a, b) => {
                if (a.type === b.type) return a.name.localeCompare(b.name);
                return a.type === 'folder' ? -1 : 1;
              })
              .map((node) => (
                <FileTreeItem
                  key={node.path}
                  node={node}
                  depth={0}
                  onCreateFile={handleCreateFile}
                  onDelete={handleDelete}
                  onRename={handleRename}
                />
              ))
          )}
        </div>
      </ScrollArea>

      <Dialog open={showNewFileDialog} onOpenChange={setShowNewFileDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Create New {newItemType === 'file' ? 'File' : 'Folder'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder={`Enter ${newItemType} name`}
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateSubmit()}
              autoFocus
              data-testid="input-new-item-name"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFileDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSubmit} data-testid="button-create-item">
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
