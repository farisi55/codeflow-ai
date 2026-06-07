'use client';

import {
  ChevronRight,
  File,
  FileCode,
  FileJson,
  FileText,
  Folder,
  FolderOpen,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import type { FileNode } from '@/mock/file-tree';
import { useEditorStore } from '@/stores/editor.store';
import { useExplorerStore } from '@/stores/explorer.store';

interface FileTreeNodeProps {
  node: FileNode;
  depth: number;
}

function FileTypeIcon({ name }: { name: string }) {
  const extension = name.split('.').pop()?.toLowerCase();
  if (extension === 'ts' || extension === 'tsx') {
    return <FileCode className="shrink-0 text-accent" size={14} />;
  }
  if (extension === 'json') {
    return <FileJson className="shrink-0 text-warning" size={14} />;
  }
  if (extension === 'md') {
    return <FileText className="shrink-0 text-muted" size={14} />;
  }
  return <File className="shrink-0 text-muted" size={14} />;
}

export function FileTreeNode({ node, depth }: FileTreeNodeProps) {
  const expandedFolderIds = useExplorerStore(
    (state) => state.expandedFolderIds,
  );
  const selectedNodeId = useExplorerStore((state) => state.selectedNodeId);
  const toggleFolder = useExplorerStore((state) => state.toggleFolder);
  const selectNode = useExplorerStore((state) => state.selectNode);
  const openFile = useEditorStore((state) => state.openFile);
  const isFolder = node.type === 'folder';
  const isExpanded = isFolder && expandedFolderIds.includes(node.id);
  const isSelected = selectedNodeId === node.id;

  function handleClick(): void {
    if (isFolder) {
      toggleFolder(node.id);
      return;
    }

    selectNode(node.id);
    openFile(node);
  }

  return (
    <div>
      <button
        className={cn(
          'flex h-6 w-full cursor-pointer items-center gap-1.5 overflow-hidden whitespace-nowrap pr-2 text-left text-xs text-muted transition-colors hover:bg-surface-2 hover:text-foreground',
          isSelected &&
            'bg-[rgba(47,129,247,0.2)] text-accent hover:bg-[rgba(47,129,247,0.2)] hover:text-accent',
        )}
        onClick={handleClick}
        style={{ paddingLeft: depth * 12 + 8 }}
        title={node.name}
        type="button"
      >
        {isFolder ? (
          <>
            <ChevronRight
              className={cn(
                'shrink-0 transition-transform',
                isExpanded && 'rotate-90',
              )}
              size={10}
            />
            {isExpanded ? (
              <FolderOpen className="shrink-0 text-accent" size={14} />
            ) : (
              <Folder className="shrink-0 text-muted" size={14} />
            )}
          </>
        ) : (
          <>
            <span className="w-2.5 shrink-0" />
            <FileTypeIcon name={node.name} />
          </>
        )}
        <span
          className={cn(
            'truncate',
            isFolder ? 'font-sans' : 'font-mono',
          )}
        >
          {node.name}
        </span>
      </button>
      {isExpanded
        ? node.children?.map((child) => (
            <FileTreeNode depth={depth + 1} key={child.id} node={child} />
          ))
        : null}
    </div>
  );
}
