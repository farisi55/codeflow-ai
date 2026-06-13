'use client';

import { useSettingsStore } from '@/stores/settings.store';

import { PreviewPanel } from './PreviewPanel';
import { PreviewPathPrompt } from './PreviewPathPrompt';

export function PreviewContainer() {
  const projectPath = useSettingsStore((state) => state.projectPath);

  if (!projectPath) {
    return <PreviewPathPrompt />;
  }

  return <PreviewPanel key={projectPath} />;
}
