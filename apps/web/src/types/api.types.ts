export interface AIActiveFileContext {
  id: string;
  name: string;
  language: string;
  content: string;
}

export interface AIFileOperation {
  type: 'create';
  path?: string;
  multiple?: boolean;
}

export interface ProviderModelInfo {
  id: string;
  name: string;
  isFree?: boolean;
  contextLength?: number;
  ownedBy?: string;
}

export interface ProviderCatalogEntry {
  id: string;
  name: string;
  available: boolean;
  isLocal: boolean;
  defaultModel: string;
  source: 'live' | 'fallback';
  models: ProviderModelInfo[];
  updatedAt: string;
}

export interface AIStreamRequest {
  content: string;
  provider: string;
  model: string;
  activeFile?: AIActiveFileContext;
  fileOperation?: AIFileOperation;
  autoApply?: boolean;
  promptOptimize?: boolean;
  context: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

export interface OpenCodeFileContext {
  path: string;
  content: string;
  language: string;
}

export interface OpenCodeStreamRequest {
  content: string;
  projectName: string;
  activeFile: OpenCodeFileContext | null;
  openFiles: OpenCodeFileContext[];
  filePaths: string[];
  fileOperation?: AIFileOperation;
  autoApply?: boolean;
  promptOptimize?: boolean;
  context: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

export interface OpenCodeHealthResponse {
  installed: boolean;
  version?: string;
  error?: string;
}

export interface AIStreamChunk {
  type:
    | 'chunk'
    | 'done'
    | 'error'
    | 'web_search'
    | 'prompt_optimize';
  content?: string;
  provider?: string;
  model?: string;
  error?: string;
  status?:
    | 'searching'
    | 'done'
    | 'failed'
    | 'skipped'
    | 'running';
  query?: string;
  reason?: string;
  stage?: 'analysis' | 'engineering';
  preview?: string;
  optimizedPrompt?: string;
  results?: Array<{
    title: string;
    url: string;
  }>;
}

export interface HealthResponse {
  status: 'ok';
  timestamp: string;
}
