import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import type { Socket } from 'socket.io';

import {
  PreviewService,
  type PreviewDetectionResult,
} from './preview.service';

interface PreviewStartPayload {
  projectPath?: string;
  port?: number;
}

interface PreviewSession {
  process?: ChildProcessWithoutNullStreams;
}

type CorsCallback = (error: Error | null, allow?: boolean) => void;

function isLocalOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      ['localhost', '127.0.0.1', '::1'].includes(url.hostname)
    );
  } catch {
    return false;
  }
}

function allowPreviewOrigin(origin: string | undefined, callback: CorsCallback): void {
  if (origin === undefined || isLocalOrigin(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error('Preview origin is not allowed'), false);
}

@WebSocketGateway({
  namespace: '/preview',
  cors: {
    credentials: true,
    origin: allowPreviewOrigin,
  },
})
export class PreviewGateway implements OnGatewayDisconnect {
  private readonly logger = new Logger(PreviewGateway.name);
  private readonly sessions = new Map<string, PreviewSession>();

  constructor(private readonly previewService: PreviewService) {}

  handleDisconnect(client: Socket): void {
    this.stop(client);
  }

  @SubscribeMessage('preview:start')
  handleStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: PreviewStartPayload,
  ): void {
    try {
      this.previewService.assertEnabled();
      const projectPath = this.previewService.resolveProjectPath(payload?.projectPath);
      const detection = this.previewService.detect(projectPath);

      this.stop(client);

      if (detection.kind === 'static') {
        this.previewService.setStaticRoot(projectPath);
        client.emit('preview:ready', {
          kind: detection.kind,
          root: projectPath,
          url: '/preview/static/index.html',
        });
        return;
      }

      if (detection.kind === 'node' && detection.command && detection.args) {
        const child = spawn(detection.command, detection.args, {
          cwd: projectPath,
          env: {
            ...process.env,
            BROWSER: 'none',
            PORT: String(payload?.port ?? 3001),
          },
          shell: false,
        });

        this.sessions.set(client.id, { process: child });

        child.stdout.on('data', (data: Buffer) => {
          client.emit('preview:log', data.toString());
        });
        child.stderr.on('data', (data: Buffer) => {
          client.emit('preview:log', data.toString());
        });
        child.on('error', (error: Error) => {
          client.emit('preview:error', error.message);
        });
        child.on('exit', (code: number | null) => {
          client.emit('preview:exit', { code });
          this.sessions.delete(client.id);
        });

        client.emit('preview:ready', {
          kind: detection.kind,
          root: projectPath,
          url: `http://localhost:${payload?.port ?? 3001}`,
        });
        return;
      }

      client.emit('preview:error', 'Unable to detect a static index.html or Node dev server.');
    } catch (error) {
      client.emit('preview:error', error instanceof Error ? error.message : 'Preview failed.');
    }
  }

  @SubscribeMessage('preview:stop')
  handleStop(@ConnectedSocket() client: Socket): void {
    this.stop(client);
    this.previewService.clearStaticRoot();
    client.emit('preview:stopped');
  }

  private stop(client: Socket): void {
    const session = this.sessions.get(client.id);
    if (session?.process && !session.process.killed) {
      session.process.kill();
    }

    this.sessions.delete(client.id);
  }
}

export type { PreviewDetectionResult };
