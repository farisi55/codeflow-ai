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
const EXPLICIT_FILE_PATTERN =
  /(?:^|[\s"'`(])((?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+\.[A-Za-z0-9]+)(?=$|[\s"'`),;:])/g;
const DIRECT_CREATE_TARGET_PATTERN =
  /\b(?:create|make|generate|buat(?:lah|kan)?|bikin(?:kan)?|ciptakan|add|tambah|tambahkan)\b[\s:,-]*(?:(?:a|an|sebuah|new|baru|file|berkas)\s+){0,4}["'`]?((?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+\.[A-Za-z0-9]+)/i;

export interface CreateFileIntent {
  type: 'create';
  path?: string;
  multiple?: boolean;
}

const LANGUAGE_KEYWORDS: Array<{
  pattern: RegExp;
  language: string;
}> = [
  { pattern: /\b(stylesheet|css)\b/i, language: 'css' },
  { pattern: /\bhtml?\b/i, language: 'html' },
  { pattern: /\btypescript|\.ts\b/i, language: 'typescript' },
  { pattern: /\bjavascript|\.js\b/i, language: 'javascript' },
  { pattern: /\btsx|react component\b/i, language: 'tsx' },
  { pattern: /\bjsx\b/i, language: 'jsx' },
  { pattern: /\bpython|\.py\b/i, language: 'python' },
  { pattern: /\bjson\b/i, language: 'json' },
  { pattern: /\bmarkdown|readme\b/i, language: 'markdown' },
  { pattern: /\bsql\b/i, language: 'sql' },
  { pattern: /\byaml|yml\b/i, language: 'yaml' },
];

export function suggestFilename(codeLanguage: string): string {
  const normalized = codeLanguage.toLowerCase().trim();
  return LANGUAGE_TO_FILENAME[normalized] ?? 'untitled.txt';
}

export function detectCreateFileIntent(
  prompt: string,
): CreateFileIntent | null {
  const explicitPaths = [...prompt.matchAll(EXPLICIT_FILE_PATTERN)]
    .map((match) => match[1])
    .filter((candidate): candidate is string => Boolean(candidate));
  const directTargetPath =
    prompt.match(DIRECT_CREATE_TARGET_PATTERN)?.[1];
  const hasDirectCreateAction =
    /\b(create|make|generate|buat(?:lah|kan)?|bikin(?:kan)?|ciptakan)\b/i.test(
      prompt,
    );
  const mentionsFile = /\b(file|berkas)\b/i.test(prompt);
  const mentionsNewFile =
    /\b(new|baru)\b[\s\S]{0,30}\b(file|berkas)\b|\b(file|berkas)\b[\s\S]{0,30}\b(new|baru)\b/i.test(
      prompt,
    );
  const hasAddNewFileAction =
    /\b(add|tambah|tambahkan)\b[\s\S]{0,40}\b(file|berkas)\b/i.test(
      prompt,
    ) && Boolean(directTargetPath || explicitPaths.length || mentionsNewFile);
  const mentionedLanguages = new Set(
    LANGUAGE_KEYWORDS.filter(({ pattern }) => pattern.test(prompt)).map(
      ({ language }) => language,
    ),
  );
  const explicitlyMultiple =
    /\b(?:multiple|several|many|beberapa|semua|all|\d+)\s+(?:files?|berkas)\b/i.test(
      prompt,
    );
  const isMultiFileRequest =
    explicitPaths.length > 1 ||
    explicitlyMultiple ||
    (hasDirectCreateAction && mentionedLanguages.size > 1);

  if (
    !(
      (hasDirectCreateAction &&
        (mentionsFile || directTargetPath || explicitPaths.length > 0)) ||
      hasAddNewFileAction ||
      mentionsNewFile ||
      isMultiFileRequest
    )
  ) {
    return null;
  }

  if (isMultiFileRequest) {
    return { type: 'create', multiple: true };
  }

  if (
    directTargetPath &&
    validateFilename(directTargetPath) === null
  ) {
    return { type: 'create', path: directTargetPath };
  }

  const language = LANGUAGE_KEYWORDS.find(({ pattern }) =>
    pattern.test(prompt),
  )?.language;
  const suggestedPath = language
    ? suggestFilename(language)
    : undefined;
  const suggestedExtension = suggestedPath
    ?.split('.')
    .at(-1)
    ?.toLowerCase();
  const matchingExplicitPath = suggestedExtension
    ? explicitPaths.find(
        (path) =>
          path.split('.').at(-1)?.toLowerCase() ===
          suggestedExtension,
      )
    : undefined;

  if (
    matchingExplicitPath &&
    validateFilename(matchingExplicitPath) === null
  ) {
    return { type: 'create', path: matchingExplicitPath };
  }

  if (!language && explicitPaths.length === 1) {
    const [explicitPath] = explicitPaths;
    if (explicitPath && validateFilename(explicitPath) === null) {
      return { type: 'create', path: explicitPath };
    }
  }

  return {
    type: 'create',
    path: suggestedPath,
  };
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
