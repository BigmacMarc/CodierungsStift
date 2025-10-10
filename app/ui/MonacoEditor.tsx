import React, { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
// Workers: Vite will bundle these via ?worker
// eslint-disable-next-line import/no-duplicates
// @ts-ignore
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
// @ts-ignore
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
// @ts-ignore
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
// @ts-ignore
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
// @ts-ignore
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import type { EditorFile } from '../types';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const self: any;

// Configure Monaco worker loader
self.MonacoEnvironment = {
  getWorker(_: any, label: string) {
    if (label === 'json') return new jsonWorker();
    if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker();
    if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker();
    if (label === 'typescript' || label === 'javascript') return new tsWorker();
    return new editorWorker();
  }
};

export function MonacoEditor({ file, onChange }: { file: EditorFile; onChange: (value: string) => void }) {
  const divRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const modelRef = useRef<monaco.editor.ITextModel | null>(null);

  useEffect(() => {
    const uri = monaco.Uri.parse(`inmemory://model/${file.id}/${file.name}`);
    const lang = file.language === 'js' ? 'javascript' : file.language;
    const existing = monaco.editor.getModel(uri);
    const model = existing || monaco.editor.createModel(file.content, lang, uri);
    modelRef.current = model;

    if (!existing) model.setValue(file.content);
    const editor = monaco.editor.create(divRef.current!, {
      model,
      automaticLayout: true,
      minimap: { enabled: false },
      theme: document.documentElement.getAttribute('data-theme') === 'light' ? 'vs' : 'vs-dark',
      bracketPairColorization: { enabled: true },
      fontLigatures: true
    });
    editorRef.current = editor;

    const sub = editor.onDidChangeModelContent(() => {
      onChange(editor.getValue());
    });

    const onFormat = () => {
      editor.getAction('editor.action.formatDocument')?.run();
    };
    const handler = () => onFormat();
    document.addEventListener('format-current-editor', handler as any);

    return () => {
      sub.dispose();
      document.removeEventListener('format-current-editor', handler as any);
      // Do not dispose model to preserve state across tab switches
      editor.dispose();
    };
  }, [file.id]);

  useEffect(() => {
    const model = modelRef.current;
    if (model && model.getValue() !== file.content) {
      const pos = editorRef.current?.getPosition();
      model.pushEditOperations([], [{ range: model.getFullModelRange(), text: file.content }], () => null);
      if (pos) editorRef.current?.setPosition(pos);
    }
  }, [file.content]);

  useEffect(() => {
    const model = modelRef.current;
    if (!model) return;
    const lang = file.language === 'js' ? 'javascript' : file.language;
    monaco.editor.setModelLanguage(model, lang);
  }, [file.language]);

  useEffect(() => {
    const theme = document.documentElement.getAttribute('data-theme') === 'light' ? 'vs' : 'vs-dark';
    monaco.editor.setTheme(theme);
  }, []);

  return <div className="editor" ref={divRef} role="textbox" aria-label={`${file.name} Editor`} />;
}
