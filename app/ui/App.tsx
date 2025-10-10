import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EditorFile, Language, Project } from '../types';
import { newBlankProject, newStarterProject, buildPreviewHtml, findActiveFile, addFile, removeFile, renameFile, setActive, setHtmlEntry, updateContent, listByLanguage } from '../lib/project';
import { loadProject, saveProject, loadTheme, saveTheme, loadTopSplit, saveTopSplit } from '../lib/storage';
import { MonacoEditor } from './MonacoEditor';

function useDebounced<T>(value: T, delay = 400): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export function App() {
  const initialTheme = loadTheme();
  const [project, setProject] = useState<Project>(() => loadProject() || newStarterProject());
  const [theme, setTheme] = useState<'light' | 'dark'>(project.theme || initialTheme);
  const [errorOverlay, setErrorOverlay] = useState<string | null>(null);
  const [topHeight, setTopHeight] = useState<number>(() => loadTopSplit() ?? project.topPanelHeight ?? 0.55);
  const dragging = useRef(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Apply theme attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    saveTheme(theme);
  }, [theme]);

  // Persist project
  const debouncedProject = useDebounced(project, 500);
  useEffect(() => {
    saveProject({ ...debouncedProject, theme, topPanelHeight: topHeight });
  }, [debouncedProject, theme, topHeight]);

  // Compose preview document
  const previewHtml = useMemo(() => buildPreviewHtml(project), [project]);
  const debouncedHtml = useDebounced(previewHtml, 400);
  const activeFile = findActiveFile(project);

  // Only update live preview for HTML when the current tag is closed
  const isInsideTag = (s: string) => {
    const lastLt = s.lastIndexOf('<');
    const lastGt = s.lastIndexOf('>');
    return lastLt > lastGt;
  };
  const htmlUpdateBlocked = useMemo(() => {
    if (!activeFile) return false;
    if (activeFile.language !== 'html') return false;
    return isInsideTag(activeFile.content);
  }, [activeFile?.id, activeFile?.content, activeFile?.language]);

  // Update iframe when content ready (no open tag)
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    if (htmlUpdateBlocked) return;
    iframe.srcdoc = debouncedHtml;
  }, [debouncedHtml, htmlUpdateBlocked]);

  // Receive only error messages from preview
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const data = e.data as any;
      if (!data || !data.__fromPreview) return;
      if (data.type === 'error') {
        const args = data.args as unknown[];
        setErrorOverlay(String(args && args[0] ? args[0] : 'Fehler'));
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'enter') {
        e.preventDefault();
        const iframe = iframeRef.current;
        if (iframe) iframe.src = iframe.src;
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent('format-current-editor'));
      }
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setTopHeight((h) => (h > 0.05 ? 0.05 : 0.6));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Split drag
  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragging.current = true;
  };
  const onMouseUp = () => (dragging.current = false);
  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging.current) return;
    const root = document.querySelector('.main-split') as HTMLElement;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    let ratio = (e.clientY - rect.top) / rect.height;
    ratio = Math.min(0.98, Math.max(0.02, ratio));
    setTopHeight(ratio);
    saveTopSplit(ratio);
  }, []);
  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [onMouseMove]);

  // Helpers to mutate project
  const setActiveFile = (id: string) => setProject((p) => setActive(p, id));
  const onChangeContent = (id: string, content: string) => setProject((p) => updateContent(p, id, content));
  const onAddFile = (lang: Language) => setProject((p) => addFile(p, lang));
  const onRemoveFile = (id: string) => setProject((p) => removeFile(p, id));
  const onRenameFile = (id: string) => {
    const name = prompt('Neuer Dateiname:');
    if (name) setProject((p) => renameFile(p, id, name));
  };
  const onMakeEntry = (id: string) => setProject((p) => setHtmlEntry(p, id));

  const tabs = useMemo(() =>
    project.files.filter((f) => f.language === 'html' || f.language === 'css' || f.language === 'js')
      .map((f) => ({ id: f.id, name: f.name }))
  , [project.files]);

  const newProject = (kind: 'blank' | 'starter') => {
    const p = kind === 'blank' ? newBlankProject() : newStarterProject();
    setErrorOverlay(null);
    setProject(p);
  };

  const exportZip = async () => {
    const JSZip = (await import('jszip')).default;
    const { saveAs } = await import('file-saver');
    const zip = new JSZip();
    for (const f of project.files) {
      zip.file(f.name, f.content);
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, 'project.zip');
  };

  const importZip = async (file: File) => {
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(file);
    const files: EditorFile[] = [];
    for (const path in zip.files) {
      const zf = zip.files[path];
      if (zf.dir) continue;
      const content = await zf.async('string');
      const name = path.split('/').pop() || path;
      const lang: Language = name.endsWith('.html') ? 'html' : name.endsWith('.css') ? 'css' : 'js';
      files.push({ id: crypto.randomUUID(), name, language: lang, content, isEntry: lang === 'html' && /index\.html$/i.test(name) });
    }
    if (!files.some((f) => f.language === 'html')) {
      files.push({ id: crypto.randomUUID(), name: 'index.html', language: 'html', isEntry: true, content: '<div></div>' });
    }
    const active = files.find((f) => f.language === 'html')?.id || files[0].id;
    setProject({ files, activeFileId: active, theme, topPanelHeight: topHeight });
  };

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const onLoad = () => setErrorOverlay(null);
    iframe.addEventListener('load', onLoad);
    return () => iframe.removeEventListener('load', onLoad);
  }, []);

  return (
    <div className="app-shell" aria-label="Local CodePen IDE">
      <div className="toolbar" role="toolbar" aria-label="Hauptwerkzeuge">
        <button className="btn" onClick={() => newProject('blank')}>Neu (Blank)</button>
        <button className="btn" onClick={() => newProject('starter')}>Neu (Starter)</button>
        <button className="btn" onClick={exportZip}>Export ZIP</button>
        <label className="btn" aria-label="Import ZIP">
          Import ZIP
          <input className="visually-hidden" type="file" accept=".zip" onChange={(e) => e.target.files && importZip(e.target.files[0])} />
        </label>
        <div className="spacer" />
        <button className="btn" onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))} aria-pressed={theme==='light'}>
          Theme: {theme === 'dark' ? 'Dunkel' : 'Hell'}
        </button>
        <button className="btn primary" onClick={() => {
          const iframe = iframeRef.current; if (iframe) iframe.src = iframe.src; }}>
          Neu laden (Ctrl/Cmd+Enter)
        </button>
      </div>

      <div
        className="main-split"
        style={{ gridTemplateRows: `${topHeight * 100}% 6px ${(1 - topHeight) * 100}%` }}
      >
        <section className="panel editors" aria-label="Editorbereich oben">
          <aside className="sidebar" aria-label="Dateibaum">
            <Section label="HTML" onAdd={() => onAddFile('html')}>
              {listByLanguage(project.files, 'html').map((f) => (
                <FileItem key={f.id} f={f} activeId={project.activeFileId} setActive={setActiveFile} onRemove={onRemoveFile} onRename={onRenameFile} onMakeEntry={onMakeEntry} />
              ))}
            </Section>
            <Section label="CSS" onAdd={() => onAddFile('css')}>
              {listByLanguage(project.files, 'css').map((f) => (
                <FileItem key={f.id} f={f} activeId={project.activeFileId} setActive={setActiveFile} onRemove={onRemoveFile} onRename={onRenameFile} />
              ))}
            </Section>
            <Section label="JS" onAdd={() => onAddFile('js')}>
              {listByLanguage(project.files, 'js').map((f) => (
                <FileItem key={f.id} f={f} activeId={project.activeFileId} setActive={setActiveFile} onRemove={onRemoveFile} onRename={onRenameFile} />
              ))}
            </Section>
          </aside>
          <div className="editor-area">
            <div className="tabs" role="tablist" aria-label="Datei-Tabs">
              {tabs.map((t) => (
                <div
                  key={t.id}
                  role="tab"
                  className={"tab" + (t.id === project.activeFileId ? ' active' : '')}
                  aria-selected={t.id === project.activeFileId}
                  onClick={() => setActiveFile(t.id)}
                >
                  {t.name}
                </div>
              ))}
            </div>
            <div className="editor-container">
              {activeFile && (
                <MonacoEditor
                  key={activeFile.id}
                  file={activeFile}
                  onChange={(value) => onChangeContent(activeFile.id, value)}
                />
              )}
            </div>
          </div>
        </section>
        <div className="splitter" onMouseDown={onMouseDown} aria-label="Griff zum Vergrößern/Verringern" role="separator" aria-orientation="horizontal" />
        <section className="panel preview-wrap" aria-label="Vorschau unten">
          <div className="preview" style={{ position: 'relative' }}>
            <div className={"error-overlay" + (errorOverlay ? '' : ' overlay-hidden')} role="alert" aria-live="assertive">
              <strong>Fehler</strong>
              <div>{errorOverlay}</div>
              <button className="btn" onClick={() => setErrorOverlay(null)} style={{ marginTop: 8 }}>Schließen</button>
            </div>
            <iframe
              ref={iframeRef}
              title="Sandbox Vorschau"
              className="iframe"
              sandbox="allow-scripts"
              srcDoc="<!doctype html><html><body>Loading...</body></html>"
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function Section({ label, onAdd, children }: { label: string; onAdd: () => void; children: React.ReactNode }) {
  return (
    <div>
      <h3>{label}</h3>
      <div>{children}</div>
      <button className="btn" onClick={onAdd} aria-label={`${label} Datei hinzufügen`}>+ Datei</button>
    </div>
  );
}

function FileItem({ f, activeId, setActive, onRemove, onRename, onMakeEntry }: {
  f: EditorFile;
  activeId: string;
  setActive: (id: string) => void;
  onRemove: (id: string) => void;
  onRename: (id: string) => void;
  onMakeEntry?: (id: string) => void;
}) {
  return (
    <div className={"file-item" + (activeId === f.id ? ' active' : '')} role="button" tabIndex={0} onClick={() => setActive(f.id)}>
      <div>
        {f.name} {f.language === 'html' && f.isEntry ? '★' : ''}
      </div>
      <div className="file-actions">
        {f.language === 'html' && onMakeEntry && !f.isEntry && (
          <button className="btn" onClick={(e) => { e.stopPropagation(); onMakeEntry(f.id); }}>Set Entry</button>
        )}
        <button className="btn" onClick={(e) => { e.stopPropagation(); onRename(f.id); }}>Rename</button>
        <button className="btn" onClick={(e) => { e.stopPropagation(); onRemove(f.id); }}>Del</button>
      </div>
    </div>
  );
}

