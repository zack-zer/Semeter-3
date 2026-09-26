import { getDB } from './db';
import { supabase, isSupabaseConfigured, getCurrentUser } from './supabaseClient';

// Debounce timer registry for reading position saves
const debounceTimers = new Map();
// Local cache for immediate synchronous retrieval
const progressCache = new Map();

export async function getProgress(fileId) {
  if (progressCache.has(fileId)) {
    return progressCache.get(fileId);
  }

  const user = await getCurrentUser();
  if (user && isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('reading_progress')
        .select('*')
        .eq('file_id', fileId)
        .maybeSingle();

      if (error) {
        console.error('[StudyHub] Error fetching reading progress:', error);
      } else if (data) {
        const record = {
          fileId: data.file_id,
          currentPage: data.current_page,
          totalPages: data.total_pages,
          scrollTop: data.scroll_top,
          lastOpened: data.updated_at,
        };
        progressCache.set(fileId, record);
        return record;
      }
    } catch (err) {
      console.warn('[StudyHub] Remote progress lookup failed, falling back:', err);
    }
  }

  // Fallback to local IndexedDB
  const db = await getDB();
  const local = (await db.get('progress', fileId)) || null;
  if (local) progressCache.set(fileId, local);
  return local;
}

/**
 * Saves reading progress with remote debouncing (600ms) to avoid spamming the backend
 * during continuous scrolling or page flipping.
 */
export async function saveProgress(fileId, currentPage, totalPages, scrollTop = 0) {
  const now = new Date().toISOString();
  const record = {
    fileId,
    currentPage,
    totalPages,
    scrollTop,
    lastOpened: now,
  };

  // Immediate local cache update
  progressCache.set(fileId, record);

  // Update local IndexedDB in background
  getDB().then((db) => db.put('progress', record)).catch(() => {});

  const user = await getCurrentUser();
  if (user && isSupabaseConfigured) {
    // Clear any existing pending timer for this file
    if (debounceTimers.has(fileId)) {
      clearTimeout(debounceTimers.get(fileId));
    }

    // Set debounced remote upsert
    const timer = setTimeout(async () => {
      debounceTimers.delete(fileId);
      try {
        await supabase
          .from('reading_progress')
          .upsert(
            {
              id: `${user.id}_${fileId}`,
              user_id: user.id,
              file_id: fileId,
              current_page: currentPage,
              total_pages: totalPages,
              scroll_top: scrollTop,
              updated_at: now,
            },
            { onConflict: 'user_id,file_id' }
          );
      } catch (err) {
        console.error('[StudyHub] Failed to sync reading progress to cloud:', err);
      }
    }, 600);

    debounceTimers.set(fileId, timer);
  }

  return record;
}

export async function getRecentFiles(limit = 4) {
  const user = await getCurrentUser();
  if (user && isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('reading_progress')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (!error && data) {
        return data.map((d) => ({
          fileId: d.file_id,
          currentPage: d.current_page,
          totalPages: d.total_pages,
          scrollTop: d.scroll_top,
          lastOpened: d.updated_at,
        }));
      }
    } catch (err) {
      console.warn('[StudyHub] Remote recent files lookup failed, using local:', err);
    }
  }

  // Fallback to local IndexedDB
  const db = await getDB();
  const all = await db.getAll('progress');
  return all.sort((a, b) => new Date(b.lastOpened) - new Date(a.lastOpened)).slice(0, limit);
}

export async function clearProgress(fileId) {
  if (debounceTimers.has(fileId)) {
    clearTimeout(debounceTimers.get(fileId));
    debounceTimers.delete(fileId);
  }
  progressCache.delete(fileId);

  const user = await getCurrentUser();
  if (user && isSupabaseConfigured) {
    try {
      await supabase.from('reading_progress').delete().eq('file_id', fileId);
    } catch (err) {
      console.error('[StudyHub] Error clearing reading progress from cloud:', err);
    }
  }

  const db = await getDB();
  await db.delete('progress', fileId);
}
