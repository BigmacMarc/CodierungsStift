import type { Project } from '../types';

const KEY = 'local-codepen:project:v1';

export function loadProject(): Project | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Project;
  } catch {
    return null;
  }
}

export function saveProject(p: Project) {
  localStorage.setItem(KEY, JSON.stringify(p));
}

export const loadTheme = (): 'light' | 'dark' =>
  (localStorage.getItem('local-codepen:theme') as 'light' | 'dark') || 'dark';

export const saveTheme = (t: 'light' | 'dark') =>
  localStorage.setItem('local-codepen:theme', t);

export function loadTopSplit(): number | null {
  const v = localStorage.getItem('local-codepen:split-top');
  return v ? Number(v) : null;
}

export function saveTopSplit(v: number) {
  localStorage.setItem('local-codepen:split-top', String(v));
}

