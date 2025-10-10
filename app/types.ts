export type Language = 'html' | 'css' | 'js';

export interface EditorFile {
  id: string;
  name: string;
  language: Language;
  content: string;
  isEntry?: boolean; // only relevant for html
}

export interface Project {
  files: EditorFile[];
  activeFileId: string;
  theme: 'light' | 'dark';
  topPanelHeight: number; // ratio 0..1
}

export interface ConsoleMessage {
  type: 'log' | 'info' | 'warn' | 'error';
  args: unknown[];
  time: number;
}

