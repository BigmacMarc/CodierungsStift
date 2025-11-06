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
// Prettier (browser) for in-editor formatting
// Using Prettier 3 built-in plugins via subpath exports
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import prettier from 'prettier/standalone';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import prettierPluginBabel from 'prettier/plugins/babel';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import prettierPluginHtml from 'prettier/plugins/html';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import prettierPluginPostcss from 'prettier/plugins/postcss';
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

export function MonacoEditor({ file, onChange }: { file: EditorFile; onChange: (value: string, meta?: { commitNow?: boolean }) => void }) {
  const divRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const modelRef = useRef<monaco.editor.ITextModel | null>(null);
  const themeDefinedRef = useRef(false);

  useEffect(() => {
    // Define custom themes once (dark + light)
    if (!themeDefinedRef.current) {
      // Dark theme
      monaco.editor.defineTheme('custom-dark', {
        base: 'vs-dark',
        inherit: true,
        // Classic token rules
        rules: [
          { token: '', foreground: 'd6deeb', background: '011627' },
          { token: 'comment', foreground: '637777' },
          { token: 'string', foreground: 'ecc48d' }, // strings = orange
          { token: 'string.escape', foreground: 'addb67' },
          { token: 'regexp', foreground: '5ca7e4' },
          { token: 'number', foreground: 'f78c6c' },
          { token: 'keyword', foreground: 'c792ea', fontStyle: 'bold' }, // return/const/export = purple
          { token: 'keyword.control', foreground: 'c792ea', fontStyle: 'bold' },
          { token: 'function', foreground: '82aaff' }, // functions = blue
          { token: 'type', foreground: '7fdbca' },
          { token: 'class', foreground: 'ffcb8b' },
          { token: 'interface', foreground: '7fdbca' },
          { token: 'variable', foreground: 'd6deeb' },
          { token: 'variable.predefined', foreground: '82aaff' },
          { token: 'property', foreground: 'addb67' },
          { token: 'invalid', foreground: 'ffffff', background: 'ff2c83' }
        ],
        // Editor UI colors
        colors: {
          'editor.background': '#011627',
          'editor.foreground': '#d6deeb',
          'editorLineNumber.foreground': '#4b6479',
          'editorLineNumber.activeForeground': '#c5e4fd',
          'editorCursor.foreground': '#80a4c2',
          'editor.selectionBackground': '#1d3b53',
          'editor.inactiveSelectionBackground': '#7e57c21f',
          'editorIndentGuide.background': '#5e81ce44',
          'editorIndentGuide.activeBackground': '#5e81ceaa',
          'editorLineHighlightBackground': '#011221',
          'editorBracketMatch.border': '#5ca7e4',
          'editorOverviewRuler.border': '#011627'
        },
        // Prefer semantic highlighting so identifiers (e.g., functions) get correct colors
        semanticHighlighting: true as unknown as boolean,
        // @ts-expect-error: semanticTokenColors is supported by Monaco at runtime
        semanticTokenColors: {
          function: '#82aaff',
          method: '#82aaff',
          parameter: '#d6deeb',
          string: '#ecc48d',
          regexp: '#5ca7e4',
          number: '#f78c6c',
          keyword: '#c792ea',
          variable: '#d6deeb',
          property: '#addb67',
          class: '#ffcb8b',
          type: '#7fdbca'
        }
      });

      // Light theme
      monaco.editor.defineTheme('custom-light', {
        base: 'vs',
        inherit: true,
        rules: [
          { token: '', foreground: '24292e', background: 'ffffff' },
          { token: 'comment', foreground: '6a737d' },
          { token: 'string', foreground: 'e36209' }, // strings = orange
          { token: 'string.escape', foreground: '22863a' },
          { token: 'regexp', foreground: '005cc5' },
          { token: 'number', foreground: 'b31d28' },
          { token: 'keyword', foreground: '6f42c1', fontStyle: 'bold' }, // return/const/export = purple
          { token: 'keyword.control', foreground: '6f42c1', fontStyle: 'bold' },
          { token: 'function', foreground: '005cc5' }, // functions = blue
          { token: 'type', foreground: '0b76a6' },
          { token: 'class', foreground: '8a4600' },
          { token: 'interface', foreground: '0b76a6' },
          { token: 'variable', foreground: '24292e' },
          { token: 'variable.predefined', foreground: '005cc5' },
          { token: 'property', foreground: '22863a' },
          { token: 'invalid', foreground: 'ffffff', background: 'b31d28' }
        ],
        colors: {
          'editor.background': '#ffffff',
          'editor.foreground': '#24292e',
          'editorLineNumber.foreground': '#aeb6be',
          'editorLineNumber.activeForeground': '#57606a',
          'editorCursor.foreground': '#333333',
          'editor.selectionBackground': '#c8e1ff',
          'editor.inactiveSelectionBackground': '#c8e1ff99',
          'editorIndentGuide.background': '#d1d5da',
          'editorIndentGuide.activeBackground': '#b9c0c8',
          'editorLineHighlightBackground': '#f6f8fa',
          'editorBracketMatch.border': '#005cc5',
          'editorOverviewRuler.border': '#ffffff'
        },
        semanticHighlighting: true as unknown as boolean,
        // @ts-expect-error: semanticTokenColors is supported by Monaco at runtime
        semanticTokenColors: {
          function: '#005cc5',
          method: '#005cc5',
          parameter: '#24292e',
          string: '#e36209',
          regexp: '#005cc5',
          number: '#b31d28',
          keyword: '#6f42c1',
          variable: '#24292e',
          property: '#22863a',
          class: '#8a4600',
          type: '#0b76a6'
        }
      });
      themeDefinedRef.current = true;
    }

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
      theme: document.documentElement.getAttribute('data-theme') === 'light' ? 'custom-light' : 'custom-dark',
      bracketPairColorization: { enabled: true },
      fontLigatures: true
    });
    editorRef.current = editor;

    const sub = editor.onDidChangeModelContent((e) => {
    const value = editor.getValue();
    const commitNow = e.changes?.some((c) => c.text.includes('>')) || false;
    onChange(value, commitNow ? { commitNow: true } : undefined);
    });

    // Prettier formatting handler
    const onFormat = async () => {
      try {
        const modelLang = (model.getLanguageId && model.getLanguageId()) || 'plaintext';
        const source = editor.getValue();
        // Select parser based on language
        let parser: string | undefined;
        if (modelLang === 'javascript' || modelLang === 'typescript' || modelLang === 'jsx' || modelLang === 'tsx') {
          parser = modelLang === 'typescript' || modelLang === 'tsx' ? 'babel-ts' : 'babel';
        } else if (modelLang === 'html' || modelLang === 'handlebars') {
          parser = 'html';
        } else if (modelLang === 'css' || modelLang === 'scss' || modelLang === 'less') {
          parser = 'css';
        }

        if (!parser) {
          // Fallback to Monaco's own formatter
          await editor.getAction('editor.action.formatDocument')?.run();
          return;
        }

        const formatted = await prettier.format(source, {
          parser,
          plugins: [prettierPluginBabel, prettierPluginHtml, prettierPluginPostcss],
          singleQuote: true,
          semi: true,
          tabWidth: 2,
          trailingComma: 'es5'
        });
        if (formatted && formatted !== source) {
          const pos = editor.getPosition();
          model.pushEditOperations([], [{ range: model.getFullModelRange(), text: formatted }], () => null);
          if (pos) editor.setPosition(pos);
          onChange(formatted);
        }
      } catch (err) {
        // If Prettier fails, try Monaco default as a fallback
        // eslint-disable-next-line no-console
        console.warn('Prettier failed, falling back to Monaco format:', err);
        await editor.getAction('editor.action.formatDocument')?.run();
      }
    };
    const handler = () => void onFormat();
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
    const applyTheme = () => {
      const theme = document.documentElement.getAttribute('data-theme') === 'light' ? 'custom-light' : 'custom-dark';
      monaco.editor.setTheme(theme);
    };
    applyTheme();
    const el = document.documentElement;
    const obs = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && m.attributeName === 'data-theme') {
          applyTheme();
        }
      }
    });
    obs.observe(el, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  return <div className="editor" ref={divRef} role="textbox" aria-label={`${file.name} Editor`} />;
}
