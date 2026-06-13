'use client';

import {
  Eye,
  TerminalSquare,
  X,
  type LucideIcon,
} from 'lucide-react';

import { PreviewContainer } from '@/components/preview/PreviewContainer';
import { TerminalContainer } from '@/components/terminal/TerminalContainer';
import {
  useSettingsStore,
  type BottomPanelTab,
} from '@/stores/settings.store';

interface TabButtonProps {
  active: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}

function TabButton({
  active,
  icon: Icon,
  label,
  onClick,
}: TabButtonProps) {
  return (
    <button
      aria-pressed={active}
      className={
        active
          ? 'flex h-full items-center gap-1.5 border-b-2 border-accent bg-background px-3 text-[11px] font-medium text-foreground'
          : 'flex h-full items-center gap-1.5 border-b-2 border-transparent px-3 text-[11px] font-medium text-muted hover:bg-surface-2 hover:text-foreground'
      }
      onClick={onClick}
      type="button"
    >
      <Icon size={12} />
      {label}
    </button>
  );
}

export function BottomPanel() {
  const bottomPanelTab = useSettingsStore(
    (state) => state.bottomPanelTab,
  );
  const setBottomPanelTab = useSettingsStore(
    (state) => state.setBottomPanelTab,
  );
  const toggleBottomPanel = useSettingsStore(
    (state) => state.toggleBottomPanel,
  );

  const selectTab = (tab: BottomPanelTab): void => {
    setBottomPanelTab(tab);
  };

  return (
    <section className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex h-7 shrink-0 items-center border-b border-border bg-surface">
        <TabButton
          active={bottomPanelTab === 'terminal'}
          icon={TerminalSquare}
          label="Terminal"
          onClick={() => selectTab('terminal')}
        />
        <TabButton
          active={bottomPanelTab === 'preview'}
          icon={Eye}
          label="Preview"
          onClick={() => selectTab('preview')}
        />
        <button
          aria-label="Close bottom panel"
          className="ml-auto mr-2 rounded p-1 text-muted hover:bg-surface-2 hover:text-foreground"
          onClick={() => toggleBottomPanel(bottomPanelTab)}
          title="Close panel"
          type="button"
        >
          <X size={13} />
        </button>
      </div>
      <div className="min-h-0 flex-1">
        {bottomPanelTab === 'terminal' ? (
          <TerminalContainer />
        ) : (
          <PreviewContainer />
        )}
      </div>
    </section>
  );
}
