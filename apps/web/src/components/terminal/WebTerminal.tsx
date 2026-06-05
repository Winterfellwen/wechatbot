'use client';

import { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import 'xterm/css/xterm.css';

interface WebTerminalProps {
  onCommand: (command: string) => void;
  output: string;
}

export function WebTerminal({ onCommand, output }: WebTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    const terminal = new Terminal({
      theme: {
        background: '#1a1a2e',
        foreground: '#eaeaea',
        cursor: '#00d4aa',
      },
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 14,
      cursorBlink: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);

    terminal.open(terminalRef.current);
    fitAddon.fit();

    terminal.onData((data) => {
      if (data === '\r') {
        const line = terminal.buffer.active.getLine(terminal.buffer.active.cursorY);
        const command = line?.translateToString(true) || '';
        onCommand(command);
        terminal.write('\r\n');
      } else {
        terminal.write(data);
      }
    });

    xtermRef.current = terminal;

    return () => {
      terminal.dispose();
    };
  }, [onCommand]);

  useEffect(() => {
    if (xtermRef.current && output) {
      xtermRef.current.write(output);
    }
  }, [output]);

  return (
    <div
      ref={terminalRef}
      className="w-full h-full bg-[#1a1a2e] rounded-lg overflow-hidden"
      style={{ minHeight: '400px' }}
    />
  );
}
