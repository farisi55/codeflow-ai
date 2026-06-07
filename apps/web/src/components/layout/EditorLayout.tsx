'use client';

import { useEffect } from 'react';
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from 'react-resizable-panels';

import { AIChatPanel } from '@/components/ai-chat/AIChatPanel';
import { EditorArea } from '@/components/editor/EditorArea';
import { FileExplorer } from '@/components/explorer/FileExplorer';
import { useAIStore } from '@/stores/ai.store';

import { HeaderBar } from './HeaderBar';
import { StatusBar } from './StatusBar';

export function EditorLayout() {
  useEffect(() => {
    void useAIStore.getState().checkBackend();
  }, []);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      <HeaderBar />
      <PanelGroup className="min-h-0 flex-1" direction="horizontal">
        <Panel defaultSize={18} maxSize={30} minSize={12}>
          <FileExplorer />
        </Panel>
        <PanelResizeHandle
          aria-label="Resize file explorer"
          className="panel-resize-handle"
        />
        <Panel defaultSize={55} minSize={30}>
          <EditorArea />
        </Panel>
        <PanelResizeHandle
          aria-label="Resize AI assistant"
          className="panel-resize-handle"
        />
        <Panel defaultSize={27} maxSize={45} minSize={20}>
          <AIChatPanel />
        </Panel>
      </PanelGroup>
      <StatusBar />
    </div>
  );
}
