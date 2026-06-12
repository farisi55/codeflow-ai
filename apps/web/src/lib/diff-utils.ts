export interface CodeBlock {
  language: string;
  code: string;
  lineCount: number;
  isLikelyFileContent: boolean;
}

export interface FileBlock {
  filename: string | null;
  language: string;
  code: string;
  lineCount: number;
}

export interface DeleteRequest {
  path: string;
  isDirectory: boolean;
}

const FILENAME_PATTERNS: RegExp[] = [
  /^(?:[-*]\s*)?\*\*([\w\-./\\]+\.\w+)\*\*\s*:?\s*$/,
  /^#{1,4}\s+([\w\-./\\]+\.\w+)\s*:?\s*$/,
  /^`([\w\-./\\]+\.\w+)`\s*:?\s*$/,
  /^(?:file(?:name)?|path)\s*:\s*([\w\-./\\]+\.\w+)\s*$/i,
  /^([\w\-./\\]+\.\w+)$/,
];

const DELETE_PATTERNS: Array<{
  pattern: RegExp;
  isDirectory: boolean;
}> = [
  {
    pattern:
      /(?:delete|remove|hapus)\s+(?:the\s+)?folder\s+[`"']?([\w\-./\\]+)[`"']?/gi,
    isDirectory: true,
  },
  {
    pattern:
      /(?:delete|remove|hapus)\s+(?:the\s+)?(?:old\s+)?(?:file\s+)?[`"']([\w\-./\\]+\.\w+)[`"'](?:\s+file)?/gi,
    isDirectory: false,
  },
  {
    pattern:
      /(?:delete|remove|hapus)\s+(?:the\s+)?(?:old\s+)?file\s+([\w\-./\\]+\.\w+)/gi,
    isDirectory: false,
  },
];

export function extractCodeBlocks(markdown: string): CodeBlock[] {
  const blocks: CodeBlock[] = [];
  const regex = /```([^\r\n`]*)\r?\n?([\s\S]*?)```/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(markdown)) !== null) {
    const language = match[1]?.trim().split(/\s+/)[0] || 'plaintext';
    const code = match[2] ?? '';
    const lineCount = code
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0).length;

    blocks.push({
      language,
      code,
      lineCount,
      isLikelyFileContent: lineCount >= 8,
    });
  }

  return blocks;
}

export function extractFileBlocks(markdown: string): FileBlock[] {
  const blocks: FileBlock[] = [];
  const regex = /```([^\r\n`]*)\r?\n?([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  let cursor = 0;

  while ((match = regex.exec(markdown)) !== null) {
    const language =
      match[1]?.trim().split(/\s+/)[0] || 'plaintext';
    const code = match[2] ?? '';
    const lineCount = code
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0).length;

    blocks.push({
      filename: detectFilename(
        markdown.slice(cursor, match.index),
      ),
      language,
      code,
      lineCount,
    });

    cursor = match.index + match[0].length;
  }

  return blocks;
}

export function getNamedFileBlocks(markdown: string): FileBlock[] {
  const namedBlocks = extractFileBlocks(markdown).filter(
    (block) => block.filename !== null && block.lineCount > 0,
  );
  const result: FileBlock[] = [];
  const indexes = new Map<string, number>();

  for (const block of namedBlocks) {
    const key = block.filename?.toLowerCase();
    if (!key) {
      continue;
    }

    const existingIndex = indexes.get(key);
    if (existingIndex === undefined) {
      indexes.set(key, result.length);
      result.push(block);
    } else {
      result[existingIndex] = block;
    }
  }

  return result;
}

export function getDeleteRequests(
  markdown: string,
): DeleteRequest[] {
  const prose = markdown.replace(
    /```[^\r\n`]*\r?\n?[\s\S]*?```/g,
    '',
  );
  const results: DeleteRequest[] = [];
  const seen = new Set<string>();

  for (const { pattern, isDirectory } of DELETE_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(prose)) !== null) {
      const path = normalizeDetectedPath(match[1] ?? '');
      if (!path) {
        continue;
      }

      const key = `${isDirectory ? 'directory' : 'file'}:${path.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push({ path, isDirectory });
      }
    }
  }

  return results;
}

export function getLargestFileBlock(
  markdown: string,
): CodeBlock | null {
  const candidates = extractCodeBlocks(markdown).filter(
    (block) => block.isLikelyFileContent,
  );

  if (candidates.length === 0) {
    return null;
  }

  return candidates.reduce((largest, current) =>
    current.code.length > largest.code.length ? current : largest,
  );
}

export function getAutoApplyFileBlock(
  markdown: string,
  targetLanguage?: string,
): CodeBlock | null {
  const blocks = extractCodeBlocks(markdown).filter(
    (block) => block.code.trim().length > 0,
  );

  if (blocks.length === 0) {
    return null;
  }

  if (targetLanguage) {
    const normalizedTarget = toMonacoLanguage(targetLanguage);
    const matchingBlocks = blocks.filter(
      (block) =>
        block.language !== 'plaintext' &&
        toMonacoLanguage(block.language) === normalizedTarget,
    );

    if (matchingBlocks.length === 1) {
      return matchingBlocks[0] ?? null;
    }

    if (matchingBlocks.length > 1) {
      return null;
    }
  }

  return blocks.length === 1 ? (blocks[0] ?? null) : null;
}

export function toMonacoLanguage(language: string): string {
  const languageMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    py: 'python',
    rs: 'rust',
    go: 'go',
    sh: 'shell',
    bash: 'shell',
    yml: 'yaml',
    yaml: 'yaml',
    json: 'json',
    html: 'html',
    css: 'css',
    sql: 'sql',
    md: 'markdown',
  };

  const normalized = language.toLowerCase();
  return languageMap[normalized] ?? normalized;
}

function detectFilename(precedingText: string): string | null {
  const lines = precedingText.trimEnd().split(/\r?\n/);
  let checked = 0;

  for (
    let index = lines.length - 1;
    index >= 0 && checked < 4;
    index -= 1
  ) {
    const line = lines[index]?.trim() ?? '';
    if (!line) {
      continue;
    }
    checked += 1;

    for (const pattern of FILENAME_PATTERNS) {
      const match = line.match(pattern);
      const path = normalizeDetectedPath(match?.[1] ?? '');
      if (path) {
        return path;
      }
    }

    if (line.split(/\s+/).length > 8) {
      break;
    }
  }

  return null;
}

function normalizeDetectedPath(path: string): string | null {
  const normalized = path
    .replace(/\\/g, '/')
    .replace(/^\.?\//, '')
    .replace(/\/+/g, '/')
    .replace(/[.,;:!?]+$/, '')
    .replace(/\/$/, '');
  const parts = normalized.split('/');

  if (
    !normalized ||
    parts.some(
      (part) => !part || part === '.' || part === '..',
    )
  ) {
    return null;
  }

  return normalized;
}
