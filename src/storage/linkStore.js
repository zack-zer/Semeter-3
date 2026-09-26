import { getDB } from './db';
import { v4 as uuidv4 } from 'uuid';
import { supabase, isSupabaseConfigured, getCurrentUser } from './supabaseClient';

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
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'link-chatgpt',
    title: 'ChatGPT',
    url: 'https://chatgpt.com',
    category: 'AI Assistant',
    description: 'AI study companion and coding assistance',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'link-google',
    title: 'Google',
    url: 'https://google.com',
    category: 'Research',
    description: 'Search engine for academic resources and documentation',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'link-youtube',
    title: 'YouTube',
    url: 'https://youtube.com',
    category: 'Video Lectures',
    description: 'Tutorials, computer science lectures, and explanations',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'link-coursera',
    title: 'Coursera',
    url: 'https://coursera.org',
    category: 'Courses',
    description: 'Online university courses and certifications',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
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
  const user = await getCurrentUser();

  if (user && isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('links')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[StudyHub] Error fetching links from Supabase:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        // Seed default links for this new user in Supabase
        const initialRecords = DEFAULT_STUDY_LINKS.map((l) => ({
          id: `${user.id}_${l.id}`,
          user_id: user.id,
          title: l.title,
          url: l.url,
          category: l.category,
          description: l.description,
          created_at: l.createdAt,
          updated_at: l.updatedAt,
        }));

        await supabase.from('links').insert(initialRecords);
        return DEFAULT_STUDY_LINKS;
      }

      return data.map((l) => ({
        id: l.id,
        title: l.title,
        url: l.url,
        category: l.category,
        description: l.description,
        createdAt: l.created_at,
        updatedAt: l.updated_at,
      }));
    } catch (err) {
      console.warn('[StudyHub] Remote links query failed, falling back:', err);
    }
  }

  // Fallback to local IndexedDB / localStorage
  try {
    const db = await getDB();
    let links = await db.getAll('links');

    const isInitialized = localStorage.getItem(INITIALIZED_KEY);

    if ((!links || links.length === 0) && !isInitialized) {
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
  const user = await getCurrentUser();
  const id = uuidv4();
  const now = new Date().toISOString();
  const cleanUrl = normalizeUrl(url);
  const cleanTitle = (title || '').trim();
  const cleanCategory = (category || 'General').trim();
  const cleanDesc = (description || '').trim();

  if (user && isSupabaseConfigured) {
    const record = {
      id,
      user_id: user.id,
      title: cleanTitle,
      url: cleanUrl,
      category: cleanCategory,
      description: cleanDesc,
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from('links')
      .insert(record)
      .select()
      .single();

    if (error) {
      console.error('[StudyHub] Error inserting link:', error);
      throw error;
    }

    return {
      id: data.id,
      title: data.title,
      url: data.url,
      category: data.category,
      description: data.description,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  // Fallback to local
  const newLink = {
    id,
    title: cleanTitle,
    url: cleanUrl,
    category: cleanCategory,
    description: cleanDesc,
    createdAt: now,
    updatedAt: now,
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
  const user = await getCurrentUser();
  const now = new Date().toISOString();
  const cleanUpdates = { ...updates, updatedAt: now };

  if (cleanUpdates.url) {
    cleanUpdates.url = normalizeUrl(cleanUpdates.url);
  }
  if (cleanUpdates.title) {
    cleanUpdates.title = cleanUpdates.title.trim();
  }

  if (user && isSupabaseConfigured) {
    const dbUpdates = { updated_at: now };
    if (cleanUpdates.title !== undefined) dbUpdates.title = cleanUpdates.title;
    if (cleanUpdates.url !== undefined) dbUpdates.url = cleanUpdates.url;
    if (cleanUpdates.category !== undefined) dbUpdates.category = cleanUpdates.category;
    if (cleanUpdates.description !== undefined) dbUpdates.description = cleanUpdates.description;

    const { data, error } = await supabase
      .from('links')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[StudyHub] Error updating link:', error);
      throw error;
    }

    return {
      id: data.id,
      title: data.title,
      url: data.url,
      category: data.category,
      description: data.description,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  // Fallback to local
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
  const idx = currentLocal.findIndex((l) => l.id === id);
  if (idx !== -1) {
    updated = { ...currentLocal[idx], ...cleanUpdates };
    currentLocal[idx] = updated;
    saveLocalLinks(currentLocal);
  }

  return updated;
}

export async function deleteLink(id) {
  const user = await getCurrentUser();

  if (user && isSupabaseConfigured) {
    const { error } = await supabase.from('links').delete().eq('id', id);
    if (error) {
      console.error('[StudyHub] Error deleting link:', error);
      throw error;
    }
    return;
  }

  // Fallback to local
  try {
    const db = await getDB();
    await db.delete('links', id);
  } catch (err) {
    console.warn('Failed to delete link in IndexedDB', err);
  }

  const currentLocal = getLocalLinks() || [];
  const filtered = currentLocal.filter((l) => l.id !== id);
  saveLocalLinks(filtered);
}
