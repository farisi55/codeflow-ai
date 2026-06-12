'use client';

import {
  ChevronRight,
  File,
  FileCode,
  FileJson,
  FileText,
  Folder,
  FolderOpen,
  Trash2,
} from 'lucide-react';
import {
  type MouseEvent,
  useEffect,
  useRef,
  useState,
} from 'react';

import { cn } from '@/lib/utils';
import type { FileNode } from '@/mock/file-tree';
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
  const openFileInEditor = useExplorerStore(
    (state) => state.openFileInEditor,
  );
  const projectSource = useExplorerStore(
    (state) => state.projectSource,
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const confirmTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const isFolder = node.type === 'folder';
  const isExpanded = isFolder && expandedFolderIds.includes(node.id);
  const isSelected = selectedNodeId === node.id;

  useEffect(
    () => () => {
      if (confirmTimerRef.current) {
        clearTimeout(confirmTimerRef.current);
      }
    },
    [],
  );

  function handleClick(): void {
    if (isFolder) {
      toggleFolder(node.id);
      return;
    }

    void openFileInEditor(node.id);
  }

  function handleDeleteClick(event: MouseEvent<HTMLButtonElement>): void {
    event.stopPropagation();

    if (!confirmDelete) {
      setConfirmDelete(true);
      confirmTimerRef.current = setTimeout(() => {
        setConfirmDelete(false);
        confirmTimerRef.current = null;
      }, 3_000);
      return;
    }

    if (confirmTimerRef.current) {
      clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = null;
    }
    setConfirmDelete(false);

    void useExplorerStore
      .getState()
      .deleteEntryInProject(node.id, isFolder)
      .catch((error: unknown) => {
        console.error(
          'Delete failed:',
          error instanceof Error ? error.message : error,
        );
      });
  }

  return (
    <div>
      <div
        className={cn(
          'group flex h-6 w-full items-center overflow-hidden whitespace-nowrap text-xs text-muted transition-colors hover:bg-surface-2 hover:text-foreground',
          isSelected &&
            'bg-[rgba(47,129,247,0.2)] text-accent hover:bg-[rgba(47,129,247,0.2)] hover:text-accent',
        )}
        style={{ paddingLeft: depth * 12 + 8 }}
      >
        <button
          className="flex h-full min-w-0 flex-1 cursor-pointer items-center gap-1.5 overflow-hidden text-left"
          onClick={handleClick}
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
                <FolderOpen
                  className="shrink-0 text-accent"
                  size={14}
                />
              ) : (
                <Folder
                  className="shrink-0 text-muted"
                  size={14}
                />
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

        {projectSource === 'fsa' ? (
          <button
            aria-label={`Delete ${node.name}`}
            className={cn(
              'mr-1 shrink-0 rounded p-0.5 transition-all hover:bg-[rgba(248,81,73,0.15)] hover:text-error',
              confirmDelete
                ? 'bg-[rgba(248,81,73,0.15)] text-error opacity-100'
                : 'text-muted opacity-0 group-hover:opacity-100 focus:opacity-100',
            )}
            onClick={handleDeleteClick}
            title={
              confirmDelete
                ? 'Click again to confirm delete'
                : `Delete ${node.name}`
            }
            type="button"
          >
            <Trash2 size={11} />
          </button>
        ) : null}
      </div>
      {isExpanded
        ? node.children?.map((child) => (
            <FileTreeNode depth={depth + 1} key={child.id} node={child} />
          ))
        : null}
    </div>
  );
}
