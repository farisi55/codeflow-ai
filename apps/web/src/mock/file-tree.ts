export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  language?: string;
  content?: string;
}

export const MOCK_FILE_TREE: FileNode[] = [
  {
    id: 'd-001',
    name: 'codeflow-demo',
    type: 'folder',
    children: [
      {
        id: 'd-002',
        name: 'src',
        type: 'folder',
        children: [
          {
            id: 'd-003',
            name: 'app',
            type: 'folder',
            children: [
              {
                id: 'f-001',
                name: 'layout.tsx',
                type: 'file',
                language: 'typescript',
                content: `import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';

export const metadata: Metadata = {
  title: 'CodeFlow Demo',
  description: 'A focused Next.js workspace powered by CodeFlow AI.',
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100">
        {children}
      </body>
    </html>
  );
}
`,
              },
              {
                id: 'f-002',
                name: 'page.tsx',
                type: 'file',
                language: 'typescript',
                content: `import { ArrowRight, Sparkles } from 'lucide-react';

import { Button } from '@/components/Button';

const features = [
  'Navigate a real project tree',
  'Edit code with Monaco',
  'Collaborate with an AI assistant',
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-6 py-20">
      <div className="mb-5 flex items-center gap-2 text-sm font-medium text-blue-400">
        <Sparkles size={16} />
        CodeFlow Demo
      </div>
      <h1 className="max-w-2xl text-5xl font-bold tracking-tight">
        A calmer place to build ambitious software.
      </h1>
      <p className="mt-5 max-w-xl text-lg leading-8 text-slate-400">
        Explore files, refine implementation details, and keep the coding
        conversation beside the work.
      </p>
      <ul className="mt-8 grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
        {features.map((feature) => (
          <li className="rounded-lg border border-slate-800 p-4" key={feature}>
            {feature}
          </li>
        ))}
      </ul>
      <Button className="mt-10 w-fit">
        Open workspace
        <ArrowRight size={16} />
      </Button>
    </main>
  );
}
`,
              },
            ],
          },
          {
            id: 'd-004',
            name: 'components',
            type: 'folder',
            children: [
              {
                id: 'f-003',
                name: 'Button.tsx',
                type: 'file',
                language: 'typescript',
                content: `import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

const variants = {
  primary: 'bg-blue-600 text-white hover:bg-blue-500',
  secondary: 'bg-slate-800 text-slate-100 hover:bg-slate-700',
  ghost: 'bg-transparent text-slate-300 hover:bg-slate-800',
} as const;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
}

export function Button({
  children,
  className,
  type = 'button',
  variant = 'primary',
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        className,
      )}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
`,
              },
            ],
          },
          {
            id: 'd-005',
            name: 'lib',
            type: 'folder',
            children: [
              {
                id: 'f-004',
                name: 'utils.ts',
                type: 'file',
                language: 'typescript',
                content: `import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function formatDate(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
`,
              },
            ],
          },
        ],
      },
      {
        id: 'f-005',
        name: 'package.json',
        type: 'file',
        language: 'json',
        content: `{
  "name": "codeflow-demo",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "lucide-react": "^0.468.0",
    "next": "15.3.3",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.7.3"
  }
}
`,
      },
      {
        id: 'f-006',
        name: 'tsconfig.json',
        type: 'file',
        language: 'json',
        content: `{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "strict": true,
    "noEmit": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
`,
      },
      {
        id: 'f-007',
        name: 'README.md',
        type: 'file',
        language: 'markdown',
        content: `# CodeFlow Demo
This project demonstrates a focused AI-assisted coding workspace.
Explore the mock Next.js application from the file tree.
Edit files in Monaco and watch tab state update immediately.
Run \`pnpm dev\` to start the project locally.
`,
      },
    ],
  },
];
