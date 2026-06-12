'use client';

import type { Terminal as XTerm } from '@xterm/xterm';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';

import {
  createTerminalSocket,
  type TerminalReadyInfo,
  type TerminalSocket,
} from '@/lib/terminal-socket';

interface TerminalPanelProps {
  onError: (message: string | null) => void;
  onReady: (info: TerminalReadyInfo) => void;
  projectPath: string;
}

export interface TerminalPanelHandle {
  restart: () => void;
}

export const TerminalPanel = forwardRef<
  TerminalPanelHandle,
  TerminalPanelProps
>(function TerminalPanel(
  { onError, onReady, projectPath },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<XTerm | null>(null);
  const socketRef = useRef<TerminalSocket | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      restart: () => {
        terminalRef.current?.reset();
        socketRef.current?.emit('terminal:restart');
        terminalRef.current?.focus();
      },
    }),
    [],
  );

  useEffect(() => {
    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;
    let inputDisposable: { dispose: () => void } | null = null;
    let terminal: XTerm | null = null;
    const socket = createTerminalSocket();
    socketRef.current = socket;

    const initialize = async (): Promise<void> => {
      try {
        const [{ Terminal }, { FitAddon }] = await Promise.all([
          import('@xterm/xterm'),
          import('@xterm/addon-fit'),
        ]);
        if (disposed || !hostRef.current) {
          return;
        }

        terminal = new Terminal({
          allowProposedApi: false,
          cursorBlink: true,
          cursorStyle: 'bar',
          fontFamily:
            'Consolas, "Cascadia Code", "Courier New", monospace',
          fontSize: 13,
          scrollback: 5000,
          theme: {
            background: '#0d1117',
            black: '#161b22',
            blue: '#58a6ff',
            brightBlack: '#6e7681',
            brightBlue: '#79c0ff',
            brightCyan: '#56d4dd',
            brightGreen: '#7ee787',
            brightMagenta: '#d2a8ff',
            brightRed: '#ffa198',
            brightWhite: '#ffffff',
            brightYellow: '#e3b341',
            cursor: '#e6edf3',
            cyan: '#39c5cf',
            foreground: '#e6edf3',
            green: '#3fb950',
            magenta: '#bc8cff',
            red: '#f85149',
            selectionBackground: '#264f78',
            white: '#b1bac4',
            yellow: '#d29922',
          },
        });
        const fitAddon = new FitAddon();
        terminal.loadAddon(fitAddon);
        terminal.open(hostRef.current);
        terminalRef.current = terminal;

        const fitAndResize = (): void => {
          try {
            fitAddon.fit();
            if (socket.connected) {
              socket.emit('terminal:resize', {
                cols: terminal?.cols ?? 100,
                rows: terminal?.rows ?? 30,
              });
            }
          } catch {
            // The panel can briefly have zero dimensions while resizing.
          }
        };

        resizeObserver = new ResizeObserver(fitAndResize);
        resizeObserver.observe(hostRef.current);
        requestAnimationFrame(fitAndResize);

        inputDisposable = terminal.onData((data) => {
          if (socket.connected) {
            socket.emit('terminal:input', data);
          }
        });

        socket.on('connect', () => {
          onError(null);
          fitAndResize();
          socket.emit('terminal:start', {
            cols: terminal?.cols ?? 100,
            projectPath,
            rows: terminal?.rows ?? 30,
          });
        });
        socket.on('connect_error', (error) => {
          const message = `Connection failed: ${error.message}`;
          onError(message);
          terminal?.writeln(`\r\n\x1b[31m${message}\x1b[0m`);
        });
        socket.on('terminal:output', (data) => {
          terminal?.write(data);
        });
        socket.on('terminal:ready', (info) => {
          onReady(info);
          onError(null);
          terminal?.focus();
        });
        socket.on('terminal:error', ({ message }) => {
          onError(message);
          terminal?.writeln(`\r\n\x1b[31m${message}\x1b[0m`);
        });
        socket.on('terminal:exit', ({ exitCode }) => {
          terminal?.writeln(
            `\r\n\x1b[90mProcess exited with code ${exitCode}. Use restart to open a new shell.\x1b[0m`,
          );
        });

        socket.connect();
      } catch (error) {
        onError(
          error instanceof Error
            ? error.message
            : 'Unable to initialize the terminal.',
        );
      }
    };

    void initialize();

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      inputDisposable?.dispose();
      socket.disconnect();
      socketRef.current = null;
      terminalRef.current = null;
      terminal?.dispose();
    };
  }, [onError, onReady, projectPath]);

  return (
    <div
      aria-label="Integrated terminal"
      className="h-full min-h-0 w-full bg-background p-2"
      ref={hostRef}
    />
  );
});
