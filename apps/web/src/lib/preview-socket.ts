import { io, type Socket } from 'socket.io-client';

export type PreviewPhase =
  | 'detecting'
  | 'error'
  | 'idle'
  | 'ready'
  | 'starting'
  | 'stopped';

export interface PreviewStatus {
  command?: string;
  message?: string;
  mode?: 'dev-server' | 'static';
  phase: PreviewPhase;
  port?: number;
  url?: string;
}

interface ServerToClientEvents {
  'preview:status': (status: PreviewStatus) => void;
}

interface ClientToServerEvents {
  'preview:restart': (payload: { projectPath: string }) => void;
  'preview:start': (payload: { projectPath: string }) => void;
  'preview:stop': () => void;
}

export type PreviewSocket = Socket<
  ServerToClientEvents,
  ClientToServerEvents
>;

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export function createPreviewSocket(): PreviewSocket {
  return io(`${apiUrl}/preview`, {
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 3,
    reconnectionDelay: 1000,
    transports: ['websocket'],
    withCredentials: true,
  });
}
