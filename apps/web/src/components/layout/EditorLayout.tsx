'use client';

import { useEffect } from 'react';
import { Eye, TerminalSquare } from 'lucide-react';
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from 'react-resizable-panels';

import { AIChatPanel } from '@/components/ai-chat/AIChatPanel';
import { EditorArea } from '@/components/editor/EditorArea';
import { FileExplorer } from '@/components/explorer/FileExplorer';
import { PreviewPanel } from '@/components/preview/PreviewPanel';
import { TerminalContainer } from '@/components/terminal/TerminalContainer';
import { cn } from '@/lib/utils';
import { useAIStore } from '@/stores/ai.store';
import { useSettingsStore } from '@/stores/settings.store';

import { HeaderBar } from './HeaderBar';
import { StatusBar } from './StatusBar';

export function EditorLayout() {
  const terminalOpen = useSettingsStore((state) => state.terminalOpen);
  const bottomPanelTab = useSettingsStore((state) => state.bottomPanelTab);
  const setBottomPanelTab = useSettingsStore(
    (state) => state.setBottomPanelTab,
  );
  const toggleTerminal = useSettingsStore(
    (state) => state.toggleTerminal,
  );

  useEffect(() => {
    void useAIStore.getState().checkBackend();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.ctrlKey && event.key === '`') {
        event.preventDefault();
        toggleTerminal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleTerminal]);

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
        <Panel className="min-h-0" defaultSize={55} minSize={30}>
          <PanelGroup className="min-h-0" direction="vertical">
            <Panel
              className="min-h-0"
              defaultSize={terminalOpen ? 68 : 100}
              id="editor-panel"
              minSize={30}
            >
              <EditorArea />
            </Panel>
            {terminalOpen ? (
              <>
                <PanelResizeHandle
                  aria-label="Resize bottom panel"
                  className="panel-resize-handle-horizontal"
                />
                <Panel
                  className="min-h-0"
                  defaultSize={32}
                  id="bottom-panel"
                  maxSize={65}
                  minSize={15}
                >
                  <section className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
                    <div className="flex h-8 shrink-0 items-center border-b border-border bg-surface px-2">
                      <button
                        className={cn(
                          'flex h-full items-center gap-1.5 border-b-2 px-2 text-xs',
                          bottomPanelTab === 'terminal'
                            ? 'border-accent text-foreground'
                            : 'border-transparent text-muted hover:text-foreground',
                        )}
                        onClick={() => setBottomPanelTab('terminal')}
                        type="button"
                      >
                        <TerminalSquare size={13} />
                        Terminal
                      </button>
                      <button
                        className={cn(
                          'flex h-full items-center gap-1.5 border-b-2 px-2 text-xs',
                          bottomPanelTab === 'preview'
                            ? 'border-accent text-foreground'
                            : 'border-transparent text-muted hover:text-foreground',
                        )}
                        onClick={() => setBottomPanelTab('preview')}
                        type="button"
                      >
                        <Eye size={13} />
                        Preview
                      </button>
                    </div>
                    <div className="min-h-0 flex-1">
                      {bottomPanelTab === 'terminal' ? (
                        <TerminalContainer />
                      ) : (
                        <PreviewPanel />
                      )}
                    </div>
                  </section>
                </Panel>
              </>
            ) : null}
          </PanelGroup>
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
