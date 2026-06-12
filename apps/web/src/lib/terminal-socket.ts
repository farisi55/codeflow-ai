import { io, type Socket } from 'socket.io-client';

export interface TerminalReadyInfo {
  cwd: string;
  pid: number;
  shell: string;
}

interface TerminalError {
  message: string;
}

interface TerminalExit {
  exitCode: number;
  signal?: number;
}

interface ServerToClientEvents {
  'terminal:error': (error: TerminalError) => void;
  'terminal:exit': (result: TerminalExit) => void;
  'terminal:output': (data: string) => void;
  'terminal:ready': (info: TerminalReadyInfo) => void;
}

interface ClientToServerEvents {
  'terminal:input': (data: string) => void;
  'terminal:resize': (size: { cols: number; rows: number }) => void;
  'terminal:restart': () => void;
  'terminal:start': (options: {
    cols: number;
    projectPath: string;
    rows: number;
  }) => void;
}

export type TerminalSocket = Socket<
  ServerToClientEvents,
  ClientToServerEvents
>;

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export function createTerminalSocket(): TerminalSocket {
  return io(`${apiUrl}/terminal`, {
    autoConnect: false,
    reconnection: true,
    transports: ['websocket'],
    withCredentials: true,
  });
}
