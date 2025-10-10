import { describe, it, expect } from 'vitest';
import { newStarterProject, buildPreviewHtml } from '../project';

describe('preview generation', () => {
  it('bundles html, css and js', () => {
    const p = newStarterProject();
    const html = buildPreviewHtml(p);
    expect(html).toContain('<style>');
    expect(html).toContain('<script>');
    expect(html).toContain('<!doctype html>');
  });

  it('injects assets into full HTML documents', () => {
    const project = newStarterProject();
    const htmlFile = project.files.find((f) => f.language === 'html');
    if (htmlFile) {
      htmlFile.content = '<!doctype html><html><head><title>Test</title></head><body><h1>Hi</h1></body></html>';
      htmlFile.isEntry = true;
    }
    const html = buildPreviewHtml(project);
    expect(html).toMatch(/Content-Security-Policy/);
    expect(html).toMatch(/console/);
    expect(html).toMatch(/<style>/);
  });
});
