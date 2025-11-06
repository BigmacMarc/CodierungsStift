import type { EditorFile, Language, Project } from '../types';

export function newBlankProject(): Project {
  const html: EditorFile = {
    id: crypto.randomUUID(),
    name: 'index.html',
    language: 'html',
    isEntry: true,
    content: '<div id="app">Hello, world!</div>'
  };
  const css: EditorFile = {
    id: crypto.randomUUID(),
    name: 'styles.css',
    language: 'css',
    content: 'body { font-family: system-ui; padding: 1rem; }\n#app { color: #2563eb; }'
  };
  const js: EditorFile = {
    id: crypto.randomUUID(),
    name: 'main.js',
    language: 'js',
    content: 'console.log("Hello from JS")'
  };
  return {
    files: [html, css, js],
    activeFileId: html.id,
    theme: (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') || 'dark',
    topPanelHeight: 0.55
  };
}

export function newStarterProject(): Project {
  const html: EditorFile = {
    id: crypto.randomUUID(),
    name: 'index.html',
    language: 'html',
    isEntry: true,
    content: `<!doctype html>\n<html>\n  <head>\n    <meta charset=\"utf-8\" />\n    <title>Starter</title>\n  </head>\n  <body>\n    <h1>Starter Template</h1>\n    <div id=\"root\"></div>\n  </body>\n</html>`
  };
  const css: EditorFile = {
    id: crypto.randomUUID(),
    name: 'styles.css',
    language: 'css',
    content: `:root { --brand: #2f81f7; }\nbody { margin: 0; padding: 16px; font: 16px/1.5 system-ui; }\nh1 { color: var(--brand); }`
  };
  const js: EditorFile = {
    id: crypto.randomUUID(),
    name: 'main.js',
    language: 'js',
    content: `document.getElementById('root').textContent = 'Ready!';\nconsole.info('Starter ready');`
  };
  return { files: [html, css, js], activeFileId: html.id, theme: 'dark', topPanelHeight: 0.6 };
}

export function listByLanguage(files: EditorFile[], lang: Language) {
  return files.filter((f) => f.language === lang);
}

export function findActiveFile(p: Project): EditorFile | undefined {
  return p.files.find((f) => f.id === p.activeFileId);
}

export function setActive(p: Project, id: string): Project {
  return { ...p, activeFileId: id };
}

export function addFile(p: Project, lang: Language, name?: string): Project {
  const defaultName = lang === 'html' ? 'page.html' : lang === 'css' ? 'styles.css' : 'script.js';
  const newFile: EditorFile = {
    id: crypto.randomUUID(),
    name: uniqueName(p, name || defaultName),
    language: lang,
    isEntry: lang === 'html' ? false : undefined,
    content: lang === 'html' ? '<div>New page</div>' : lang === 'css' ? '/* new styles */' : 'console.log("new file")'
  };
  return { ...p, files: [...p.files, newFile], activeFileId: newFile.id };
}

export function removeFile(p: Project, id: string): Project {
  const files = p.files.filter((f) => f.id !== id);
  const active = files[0]?.id || '';
  return { ...p, files, activeFileId: active };
}

export function renameFile(p: Project, id: string, name: string): Project {
  const files = p.files.map((f) => (f.id === id ? { ...f, name } : f));
  return { ...p, files };
}

export function updateContent(p: Project, id: string, content: string): Project {
  const files = p.files.map((f) => (f.id === id ? { ...f, content } : f));
  return { ...p, files };
}

export function setHtmlEntry(p: Project, id: string): Project {
  const files = p.files.map((f) => (f.language === 'html' ? { ...f, isEntry: f.id === id } : f));
  return { ...p, files };
}

export function uniqueName(p: Project, name: string): string {
  if (!p.files.some((f) => f.name === name)) return name;
  const [base, ext] = (() => {
    const i = name.lastIndexOf('.');
    return i === -1 ? [name, ''] : [name.slice(0, i), name.slice(i)];
  })();
  let n = 1;
  while (p.files.some((f) => f.name === `${base}-${n}${ext}`)) n++;
  return `${base}-${n}${ext}`;
}

export function buildPreviewHtml(p: Project): string {
  const htmlFiles = p.files.filter((f) => f.language === 'html');
  const entry = htmlFiles.find((f) => f.isEntry) || htmlFiles[0];
  const css = p.files
    .filter((f) => f.language === 'css')
    .map((f) => `/* ${f.name} */\n${f.content}`)
    .join('\n\n');
  const js = p.files
    .filter((f) => f.language === 'js')
    .map((f) => `// ${f.name}\n${f.content}`)
    .join('\n\n');

  // Relaxed CSP for in-iframe preview: allow inline + HTTPS for external assets.
  // Note: frame-ancestors is ignored in <meta>, so we omit it to avoid warnings.
  const csp = [
    "default-src 'none'",
    "style-src 'unsafe-inline' https:",
    "style-src-elem 'unsafe-inline' https:",
    "script-src 'unsafe-inline' https:",
    "script-src-elem 'unsafe-inline' https:",
    "img-src data: blob: https:",
    "font-src data: https:",
    "connect-src https:"
  ].join('; ') + ';';
  const consoleBridge = `(() => {\n  const send = (type, args) => parent.postMessage({ __fromPreview: true, type, args }, '*');\n  // Only forward errors to parent; no console mirroring\n  window.addEventListener('error', (e) => { send('error', [String(e.message || e.error || 'Error'), (e.error && e.error.stack) || '']); });\n  window.addEventListener('unhandledrejection', (e) => { send('error', ['Unhandled: ' + String(e.reason || 'Promise rejection')]); });\n})();`;

  const entryContent = entry?.content || '<div></div>';
  const escapedCss = escapeForStyle(css);
  const escapedJs = escapeForScript(js);

  if (/<html[\s>]/i.test(entryContent)) {
    return injectIntoFullDocument(entryContent, escapedCss, escapedJs, csp, consoleBridge);
  }

  return `<!doctype html>\n<html>\n<head>\n<meta charset=\"utf-8\"/>\n<meta http-equiv=\"Content-Security-Policy\" content=\"${csp}\"/>\n<style>${escapedCss}</style>\n</head>\n<body>\n${entryContent}\n<script>${consoleBridge}</script>\n<script>${escapedJs}</script>\n</body>\n</html>`;
}

function injectIntoFullDocument(
  original: string,
  css: string,
  js: string,
  csp: string,
  consoleBridge: string
): string {
  let doc = original;
  if (/<head[\s>]/i.test(doc)) {
    doc = doc.replace(
      /<head([^>]*)>/i,
      `<head$1>\n<meta charset=\"utf-8\"/>\n<meta http-equiv=\"Content-Security-Policy\" content=\"${csp}\"/>\n<style>${css}</style>`
    );
  } else {
    doc = doc.replace(
      /<html([^>]*)>/i,
      `<html$1><head><meta charset=\"utf-8\"/><meta http-equiv=\"Content-Security-Policy\" content=\"${csp}\"/><style>${css}</style></head>`
    );
  }

  if (/<body[\s>]/i.test(doc)) {
    doc = doc.replace(
      /<body([^>]*)>/i,
      `<body$1 data-preview-root>`
    );
    doc = doc.replace(
      /<\/body>/i,
      `<script>${consoleBridge}</script>\n<script>${js}</script></body>`
    );
  } else {
    doc = doc.replace(
      /<\/html>/i,
      `<body data-preview-root></body><script>${consoleBridge}</script><script>${js}</script></html>`
    );
  }

  return doc;
}

function escapeForScript(code: string): string {
  return code.replace(/<\/script>/gi, '<\\/script>');
}

function escapeForStyle(code: string): string {
  return code.replace(/<\/style>/gi, '<\\/style>');
}
