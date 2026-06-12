import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { isAbsolute } from 'node:path';
import { realpathSync, statSync } from 'node:fs';
import * as pty from 'node-pty';
import type { Socket } from 'socket.io';

const DEFAULT_COLS = 100;
const DEFAULT_ROWS = 30;
const MAX_INPUT_LENGTH = 64 * 1024;

interface TerminalStartPayload {
  cols?: number;
  projectPath?: string;
  rows?: number;
}

interface TerminalResizePayload {
  cols?: number;
  rows?: number;
}

interface TerminalSession {
  dataDisposable: pty.IDisposable;
  exitDisposable: pty.IDisposable;
  process: pty.IPty;
}

type CorsCallback = (
  error: Error | null,
  allow?: boolean,
) => void;

function configuredOrigins(): string[] {
  return (
    process.env.CORS_ORIGIN?.trim() ||
    'http://localhost:3000,http://127.0.0.1:3000'
  )
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function isLoopbackAddress(address: string): boolean {
  const normalized = address.toLowerCase();
  return (
    normalized === '::1' ||
    normalized.startsWith('127.') ||
    normalized.startsWith('::ffff:127.')
  );
}

function allowTerminalOrigin(
  origin: string | undefined,
  callback: CorsCallback,
): void {
  if (
    origin === undefined ||
    configuredOrigins().includes(origin)
  ) {
    callback(null, true);
    return;
  }

  callback(new Error('Terminal origin is not allowed'), false);
}

@WebSocketGateway({
  namespace: '/terminal',
  cors: {
    credentials: true,
    origin: allowTerminalOrigin,
  },
})
export class TerminalGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(TerminalGateway.name);
  private readonly sessions = new Map<string, TerminalSession>();
  private readonly workingDirectories = new Map<string, string>();

  handleConnection(client: Socket): void {
    this.ensureClientAllowed(client);
  }

  handleDisconnect(client: Socket): void {
    this.killSession(client.id);
    this.workingDirectories.delete(client.id);
  }

  @SubscribeMessage('terminal:start')
  handleStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: TerminalStartPayload,
  ): void {
    if (!this.ensureClientAllowed(client)) {
      return;
    }

    try {
      this.assertTerminalEnabled();
      const cwd = this.resolveWorkingDirectory(payload?.projectPath);
      this.workingDirectories.set(client.id, cwd);
      this.killSession(client.id);
      this.spawnSession(
        client,
        cwd,
        this.clampDimension(payload?.cols, DEFAULT_COLS, 20, 500),
        this.clampDimension(payload?.rows, DEFAULT_ROWS, 5, 200),
      );
    } catch (error) {
      this.emitError(client, error);
    }
  }

  @SubscribeMessage('terminal:input')
  handleInput(
    @ConnectedSocket() client: Socket,
    @MessageBody() input: unknown,
  ): void {
    if (!this.ensureClientAllowed(client)) {
      return;
    }
    if (typeof input !== 'string') {
      this.emitError(client, new Error('Terminal input must be text.'));
      return;
    }

    const session = this.sessions.get(client.id);
    if (!session) {
      this.emitError(client, new Error('Terminal is not running.'));
      return;
    }

    session.process.write(input.slice(0, MAX_INPUT_LENGTH));
  }

  @SubscribeMessage('terminal:resize')
  handleResize(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: TerminalResizePayload,
  ): void {
    if (!this.ensureClientAllowed(client)) {
      return;
    }
    const session = this.sessions.get(client.id);
    if (!session) {
      return;
    }

    try {
      session.process.resize(
        this.clampDimension(payload?.cols, session.process.cols, 20, 500),
        this.clampDimension(payload?.rows, session.process.rows, 5, 200),
      );
    } catch (error) {
      this.logger.debug(
        `Unable to resize terminal ${client.id}: ${this.errorMessage(error)}`,
      );
    }
  }

  @SubscribeMessage('terminal:restart')
  handleRestart(@ConnectedSocket() client: Socket): void {
    if (!this.ensureClientAllowed(client)) {
      return;
    }
    try {
      this.assertTerminalEnabled();
      const cwd = this.workingDirectories.get(client.id);
      if (!cwd) {
        throw new Error('Open a project directory before restarting.');
      }

      const current = this.sessions.get(client.id);
      const cols = current?.process.cols ?? DEFAULT_COLS;
      const rows = current?.process.rows ?? DEFAULT_ROWS;
      this.killSession(client.id);
      this.spawnSession(client, cwd, cols, rows);
    } catch (error) {
      this.emitError(client, error);
    }
  }

  private ensureClientAllowed(client: Socket): boolean {
    const origin = client.handshake.headers.origin;
    if (
      origin !== undefined &&
      !configuredOrigins().includes(origin)
    ) {
      this.emitError(
        client,
        new Error('Terminal origin is not allowed.'),
      );
      client.disconnect(true);
      return false;
    }

    const remoteAccessEnabled =
      process.env.TERMINAL_ALLOW_REMOTE?.toLowerCase() === 'true';
    if (
      !remoteAccessEnabled &&
      !isLoopbackAddress(client.handshake.address)
    ) {
      this.emitError(
        client,
        new Error('Remote terminal connections are disabled.'),
      );
      client.disconnect(true);
      return false;
    }
    return true;
  }

  private spawnSession(
    client: Socket,
    cwd: string,
    cols: number,
    rows: number,
  ): void {
    const shell = this.getShell();
    const terminalProcess = pty.spawn(shell.command, shell.args, {
      cols,
      cwd,
      env: this.getEnvironment(),
      name: 'xterm-256color',
      rows,
      useConpty: process.platform === 'win32',
      useConptyDll: process.platform === 'win32',
    });

    const session = {} as TerminalSession;
    session.process = terminalProcess;
    session.dataDisposable = terminalProcess.onData((data) => {
      client.emit('terminal:output', data);
    });
    session.exitDisposable = terminalProcess.onExit(
      ({ exitCode, signal }) => {
        if (this.sessions.get(client.id) !== session) {
          return;
        }

        this.sessions.delete(client.id);
        session.dataDisposable.dispose();
        session.exitDisposable.dispose();
        client.emit('terminal:exit', { exitCode, signal });
      },
    );
    this.sessions.set(client.id, session);

    client.emit('terminal:ready', {
      cwd,
      pid: terminalProcess.pid,
      shell: shell.command,
    });
    this.logger.log(
      `Terminal ${terminalProcess.pid} started for ${client.id} in ${cwd}`,
    );
  }

  private killSession(clientId: string): void {
    const session = this.sessions.get(clientId);
    if (!session) {
      return;
    }

    this.sessions.delete(clientId);
    session.dataDisposable.dispose();
    session.exitDisposable.dispose();

    try {
      session.process.kill();
    } catch (error) {
      this.logger.debug(
        `Unable to stop terminal ${clientId}: ${this.errorMessage(error)}`,
      );
    }
  }

  private resolveWorkingDirectory(projectPath: unknown): string {
    if (
      typeof projectPath !== 'string' ||
      projectPath.trim().length === 0
    ) {
      throw new Error('A project directory is required.');
    }

    const requestedPath = projectPath.trim();
    if (!isAbsolute(requestedPath)) {
      throw new Error('The project directory must be an absolute path.');
    }

    let canonicalPath: string;
    try {
      canonicalPath = realpathSync.native(requestedPath);
    } catch {
      throw new Error('The project directory does not exist.');
    }

    if (!statSync(canonicalPath).isDirectory()) {
      throw new Error('The project path must point to a directory.');
    }

    return canonicalPath;
  }

  private assertTerminalEnabled(): void {
    const isProduction = process.env.NODE_ENV === 'production';
    if (
      isProduction &&
      process.env.TERMINAL_ENABLED?.toLowerCase() !== 'true'
    ) {
      throw new Error(
        'The integrated terminal is disabled in production.',
      );
    }
  }

  private getShell(): { args: string[]; command: string } {
    if (process.platform === 'win32') {
      return {
        args: ['-NoLogo'],
        command:
          process.env.TERMINAL_SHELL?.trim() || 'powershell.exe',
      };
    }

    return {
      args: [],
      command:
        process.env.TERMINAL_SHELL?.trim() ||
        process.env.SHELL?.trim() ||
        '/bin/bash',
    };
  }

  private getEnvironment(): Record<string, string> {
    const environment: Record<string, string> = {};

    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) {
        environment[key] = value;
      }
    }

    environment.COLORTERM = 'truecolor';
    environment.TERM = 'xterm-256color';
    return environment;
  }

  private clampDimension(
    value: unknown,
    fallback: number,
    minimum: number,
    maximum: number,
  ): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return fallback;
    }

    return Math.min(maximum, Math.max(minimum, Math.floor(value)));
  }

  private emitError(client: Socket, error: unknown): void {
    const message = this.errorMessage(error);
    this.logger.warn(`Terminal ${client.id}: ${message}`);
    client.emit('terminal:error', { message });
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Terminal error.';
  }
}
