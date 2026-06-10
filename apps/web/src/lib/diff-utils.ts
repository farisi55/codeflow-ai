export interface CodeBlock {
  language: string;
  code: string;
  lineCount: number;
  isLikelyFileContent: boolean;
}

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
