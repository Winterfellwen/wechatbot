'use client';

import { useEffect, useRef } from 'react';
import { Terminal as XTerminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import 'xterm/css/xterm.css';

export default function Terminal() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerminal | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    const terminal = new XTerminal({
      theme: {
        background: '#1e1e1e',
        foreground: '#f0f0f0',
        cursor: '#f0f0f0',
      },
      fontSize: 14,
      fontFamily: 'monospace',
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(new WebLinksAddon());

    terminal.open(terminalRef.current);
    fitAddon.fit();

    terminal.writeln('Welcome to Cloud Manager Terminal');
    terminal.writeln('$ ');
    terminal.write('> ');

    terminal.onData((data) => {
      terminal.write(data);
    });

    xtermRef.current = terminal;

    return () => {
      terminal.dispose();
    };
  }, []);

  return (
    <div
      ref={terminalRef}
      className="h-64 bg-gray-900 rounded"
    />
  );
}
