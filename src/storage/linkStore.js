import { getDB } from './db';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'studyhub_links';
const INITIALIZED_KEY = 'studyhub_links_initialized';

export const DEFAULT_STUDY_LINKS = [
  {
    id: 'link-github',
    title: 'GitHub',
    url: 'https://github.com',
    category: 'Development',
    description: 'Code repositories, projects, and collaboration',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'link-chatgpt',
    title: 'ChatGPT',
    url: 'https://chatgpt.com',
    category: 'AI Assistant',
    description: 'AI study companion and coding assistance',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'link-google',
    title: 'Google',
    url: 'https://google.com',
    category: 'Research',
    description: 'Search engine for academic resources and documentation',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'link-youtube',
    title: 'YouTube',
    url: 'https://youtube.com',
    category: 'Video Lectures',
    description: 'Tutorials, computer science lectures, and explanations',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'link-coursera',
    title: 'Coursera',
    url: 'https://coursera.org',
    category: 'Courses',
    description: 'Online university courses and certifications',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export function normalizeUrl(url) {
  if (!url) return '';
  const trimmed = url.trim();
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function getLocalLinks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveLocalLinks(links) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
  } catch (e) {
    console.error('Failed to save links to localStorage', e);
  }
}

export async function getAllLinks() {
  try {
    const db = await getDB();
    let links = await db.getAll('links');

    const isInitialized = localStorage.getItem(INITIALIZED_KEY);

    if ((!links || links.length === 0) && !isInitialized) {
      // Seed default links on first run
      links = [...DEFAULT_STUDY_LINKS];
      const tx = db.transaction('links', 'readwrite');
      for (const link of links) {
        await tx.store.put(link);
      }
      await tx.done;
      localStorage.setItem(INITIALIZED_KEY, 'true');
      saveLocalLinks(links);
    } else {
      saveLocalLinks(links);
    }

    return links.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (err) {
    console.warn('IndexedDB unavailable for links, using localStorage fallback', err);
    let local = getLocalLinks();
    if (!local) {
      local = [...DEFAULT_STUDY_LINKS];
      saveLocalLinks(local);
      localStorage.setItem(INITIALIZED_KEY, 'true');
    }
    return local.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
}

export async function addLink({ title, url, category = 'General', description = '' }) {
  const now = new Date().toISOString();
  const newLink = {
    id: uuidv4(),
    title: title.trim(),
    url: normalizeUrl(url),
    category: category.trim() || 'General',
    description: (description || '').trim(),
    createdAt: now,
    updatedAt: now
  };

  try {
    const db = await getDB();
    await db.add('links', newLink);
  } catch (err) {
    console.warn('Failed to add link in IndexedDB, using localStorage', err);
  }

  const currentLocal = getLocalLinks() || [];
  currentLocal.push(newLink);
  saveLocalLinks(currentLocal);

  return newLink;
}

export async function updateLink(id, updates) {
  const now = new Date().toISOString();
  const cleanUpdates = {
    ...updates,
    updatedAt: now
  };
  if (cleanUpdates.url) {
    cleanUpdates.url = normalizeUrl(cleanUpdates.url);
  }
  if (cleanUpdates.title) {
    cleanUpdates.title = cleanUpdates.title.trim();
  }

  let updated = null;

  try {
    const db = await getDB();
    const existing = await db.get('links', id);
    if (existing) {
      updated = { ...existing, ...cleanUpdates };
      await db.put('links', updated);
    }
  } catch (err) {
    console.warn('Failed to update link in IndexedDB', err);
  }

  const currentLocal = getLocalLinks() || [];
  const idx = currentLocal.findIndex(l => l.id === id);
  if (idx !== -1) {
    updated = { ...currentLocal[idx], ...cleanUpdates };
    currentLocal[idx] = updated;
    saveLocalLinks(currentLocal);
  }

  return updated;
}

export async function deleteLink(id) {
  try {
    const db = await getDB();
    await db.delete('links', id);
  } catch (err) {
    console.warn('Failed to delete link in IndexedDB', err);
  }

  const currentLocal = getLocalLinks() || [];
  const filtered = currentLocal.filter(l => l.id !== id);
  saveLocalLinks(filtered);
}
