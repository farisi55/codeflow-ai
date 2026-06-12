import { Injectable } from '@nestjs/common';
import {
  createReadStream,
  existsSync,
  realpathSync,
  statSync,
} from 'node:fs';
import type { ReadStream } from 'node:fs';
import { extname, isAbsolute, join, normalize, relative, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';

export interface PreviewDetectionResult {
  kind: 'static' | 'node' | 'unknown';
  root: string;
  entry: string;
  command?: string;
  args?: string[];
  url?: string;
}

export interface PreviewSession {
  id: string;
  root: string;
  createdAt: number;
  updatedAt: number;
}

export interface PreviewFile {
  contentType: string;
  stream: ReadStream;
}

const SESSION_TTL_MS = 6 * 60 * 60 * 1000;

const MIME_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
};

@Injectable()
export class PreviewService {
  private readonly sessions = new Map<string, PreviewSession>();
  private staticRoot: string | null = null;

  assertEnabled(): void {
    const disabled = process.env.PREVIEW_ENABLED?.toLowerCase() === 'false';
    if (disabled) {
      throw new Error('Website preview is disabled by PREVIEW_ENABLED=false.');
    }
  }

  resolveProjectPath(projectPath?: string): string {
    if (!projectPath || projectPath.trim().length === 0) {
      throw new Error('projectPath is required. Use the same absolute path as the terminal.');
    }

    const normalizedInput = projectPath.trim();
    if (!isAbsolute(normalizedInput)) {
      throw new Error('projectPath must be an absolute path.');
    }

    const realPath = realpathSync(normalizedInput);
    const stats = statSync(realPath);
    if (!stats.isDirectory()) {
      throw new Error('projectPath must point to a directory.');
    }

    return realPath;
  }

  detect(projectPath: string): PreviewDetectionResult {
    const root = this.resolveProjectPath(projectPath);

    const staticEntry = this.findStaticEntry(root);
    if (staticEntry) {
      return {
        kind: 'static',
        root,
        entry: staticEntry,
        url: '/preview/static/index.html',
      };
    }

    const packageJsonPath = join(root, 'package.json');
    if (existsSync(packageJsonPath)) {
      return {
        kind: 'node',
        root,
        entry: packageJsonPath,
        command: process.platform === 'win32' ? 'npm.cmd' : 'npm',
        args: ['run', 'dev'],
      };
    }

    return {
      kind: 'unknown',
      root,
      entry: root,
    };
  }

  setStaticRoot(root: string): void {
    this.staticRoot = this.resolveProjectPath(root);
  }

  getStaticRoot(): string {
    if (!this.staticRoot) {
      throw new Error('Static preview root is not set.');
    }

    return this.staticRoot;
  }

  clearStaticRoot(): void {
    this.staticRoot = null;
  }

  createSession(projectPath?: string): PreviewSession {
    this.assertEnabled();
    const root = this.resolveProjectPath(projectPath);
    const now = Date.now();
    this.cleanupExpiredSessions(now);

    const session: PreviewSession = {
      id: randomUUID(),
      root,
      createdAt: now,
      updatedAt: now,
    };

    this.sessions.set(session.id, session);
    this.setStaticRoot(root);
    return session;
  }

  getSession(sessionId: string): PreviewSession {
    this.cleanupExpiredSessions(Date.now());
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Preview session not found or expired.');
    }

    session.updatedAt = Date.now();
    return session;
  }

  getFileFromSession(sessionId: string, requestedPath?: string): PreviewFile {
    const session = this.getSession(sessionId);
    return this.getFile(session.root, requestedPath);
  }

  getStaticFile(requestedPath?: string): PreviewFile {
    return this.getFile(this.getStaticRoot(), requestedPath);
  }

  getFile(root: string, requestedPath?: string): PreviewFile {
    const safePath = this.resolveSafeFilePath(root, requestedPath);
    const stats = statSync(safePath);
    const finalPath = stats.isDirectory() ? join(safePath, 'index.html') : safePath;

    if (!existsSync(finalPath) || !statSync(finalPath).isFile()) {
      throw new Error('Preview file not found.');
    }

    return {
      contentType: MIME_TYPES[extname(finalPath).toLowerCase()] ?? 'application/octet-stream',
      stream: createReadStream(finalPath),
    };
  }

  private findStaticEntry(root: string): string | null {
    const candidates = [
      join(root, 'index.html'),
      join(root, 'public', 'index.html'),
      join(root, 'dist', 'index.html'),
      join(root, 'build', 'index.html'),
    ];

    return candidates.find((candidate) => existsSync(candidate)) ?? null;
  }

  private resolveSafeFilePath(root: string, requestedPath?: string): string {
    const cleanPath = (requestedPath && requestedPath.trim().length > 0
      ? requestedPath
      : 'index.html'
    )
      .replaceAll('\\', '/')
      .replace(/^\/+/, '');

    const resolvedRoot = realpathSync(root);
    const targetPath = resolve(resolvedRoot, normalize(cleanPath));
    const rel = relative(resolvedRoot, targetPath);

    if (rel.startsWith('..') || rel === '..' || rel.includes(`..${sep}`) || isAbsolute(rel)) {
      throw new Error('Invalid preview path.');
    }

    return targetPath;
  }

  private cleanupExpiredSessions(now: number): void {
    for (const [id, session] of this.sessions.entries()) {
      if (now - session.updatedAt > SESSION_TTL_MS) {
        this.sessions.delete(id);
      }
    }
  }
}
