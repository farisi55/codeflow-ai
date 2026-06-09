const EXTENSION_MAP: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  json: 'json',
  jsonc: 'json',
  md: 'markdown',
  mdx: 'markdown',
  css: 'css',
  scss: 'scss',
  sass: 'scss',
  less: 'less',
  html: 'html',
  htm: 'html',
  xml: 'xml',
  svg: 'xml',
  py: 'python',
  rs: 'rust',
  go: 'go',
  java: 'java',
  kt: 'kotlin',
  rb: 'ruby',
  php: 'php',
  cs: 'csharp',
  cpp: 'cpp',
  c: 'c',
  h: 'cpp',
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  ps1: 'powershell',
  yml: 'yaml',
  yaml: 'yaml',
  toml: 'ini',
  env: 'plaintext',
  example: 'plaintext',
  gitignore: 'plaintext',
  prettierrc: 'json',
  eslintrc: 'json',
  sql: 'sql',
  graphql: 'graphql',
  gql: 'graphql',
  prisma: 'prisma',
  dockerfile: 'dockerfile',
};

export function detectLanguage(filename: string): string {
  const lower = filename.toLowerCase();

  if (lower === 'dockerfile') {
    return 'dockerfile';
  }

  if (lower.startsWith('.')) {
    return EXTENSION_MAP[lower.slice(1)] ?? 'plaintext';
  }

  const extension = lower.split('.').pop() ?? '';
  return EXTENSION_MAP[extension] ?? 'plaintext';
}
