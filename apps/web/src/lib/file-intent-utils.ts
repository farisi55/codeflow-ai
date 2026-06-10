const LANGUAGE_TO_FILENAME: Record<string, string> = {
  html: 'index.html',
  htm: 'index.html',
  css: 'styles.css',
  scss: 'styles.scss',
  sass: 'styles.sass',
  less: 'styles.less',
  ts: 'index.ts',
  typescript: 'index.ts',
  tsx: 'Component.tsx',
  js: 'index.js',
  javascript: 'index.js',
  jsx: 'Component.jsx',
  py: 'main.py',
  python: 'main.py',
  rs: 'main.rs',
  rust: 'main.rs',
  go: 'main.go',
  java: 'Main.java',
  kt: 'Main.kt',
  kotlin: 'Main.kt',
  cs: 'Program.cs',
  csharp: 'Program.cs',
  rb: 'main.rb',
  ruby: 'main.rb',
  php: 'index.php',
  swift: 'main.swift',
  json: 'data.json',
  yaml: 'config.yml',
  yml: 'config.yml',
  toml: 'config.toml',
  md: 'README.md',
  markdown: 'README.md',
  sql: 'query.sql',
  sh: 'script.sh',
  bash: 'script.sh',
  shell: 'script.sh',
  ps1: 'script.ps1',
  dockerfile: 'Dockerfile',
  graphql: 'schema.graphql',
  gql: 'schema.graphql',
  prisma: 'schema.prisma',
  xml: 'data.xml',
  svg: 'icon.svg',
};

const WINDOWS_RESERVED_NAME =
  /^(CON|PRN|AUX|NUL|COM[0-9]|LPT[0-9])(\.|$)/i;
const ALLOWED_EXTENSIONLESS_FILENAMES = new Set(['dockerfile']);

export function suggestFilename(codeLanguage: string): string {
  const normalized = codeLanguage.toLowerCase().trim();
  return LANGUAGE_TO_FILENAME[normalized] ?? 'untitled.txt';
}

export function validateFilename(filename: string): string | null {
  const trimmed = filename.trim();

  if (!trimmed) {
    return 'Filename cannot be empty';
  }
  if (trimmed.length > 255) {
    return 'Filename too long';
  }

  // Forward slashes are allowed for nested relative paths.
  // eslint-disable-next-line no-control-regex
  if (/[<>:"\\|?*\x00-\x1F]/.test(trimmed)) {
    return 'Filename contains invalid characters';
  }

  const pathParts = trimmed.split('/');
  if (
    pathParts.some(
      (part) =>
        !part ||
        part === '.' ||
        part === '..' ||
        part.endsWith('.') ||
        part.endsWith(' ') ||
        WINDOWS_RESERVED_NAME.test(part),
    )
  ) {
    return pathParts.some((part) => WINDOWS_RESERVED_NAME.test(part))
      ? 'Reserved filename on Windows'
      : 'Filename contains an invalid path segment';
  }

  const nameOnly = pathParts.at(-1) ?? trimmed;
  const extension = nameOnly.split('.').at(-1) ?? '';
  if (
    (!nameOnly.includes('.') || !extension) &&
    !ALLOWED_EXTENSIONLESS_FILENAMES.has(nameOnly.toLowerCase())
  ) {
    return 'Filename must include an extension (e.g. index.html)';
  }

  return null;
}
