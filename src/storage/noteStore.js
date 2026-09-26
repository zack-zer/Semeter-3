import { getDB } from './db';
import { v4 as uuidv4 } from 'uuid';
import { supabase, isSupabaseConfigured, getCurrentUser } from './supabaseClient';

export async function getAllNotes() {
  const user = await getCurrentUser();
  if (user && isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[StudyHub] Error fetching notes:', error);
      throw error;
    }

    return (data || []).map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      subjectId: n.subject_id,
      createdAt: n.created_at,
      updatedAt: n.updated_at,
    }));
  }

  // Fallback to local IndexedDB
  const db = await getDB();
  const notes = await db.getAll('notes');
  return notes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

export async function getNotesBySubject(subjectId) {
  const user = await getCurrentUser();
  if (user && isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('subject_id', subjectId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[StudyHub] Error fetching notes by subject:', error);
      throw error;
    }

    return (data || []).map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      subjectId: n.subject_id,
      createdAt: n.created_at,
      updatedAt: n.updated_at,
    }));
  }

  // Fallback to local IndexedDB
  const db = await getDB();
  const notes = await db.getAllFromIndex('notes', 'bySubject', subjectId);
  return notes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

export async function addNote({ title, content, subjectId }) {
  const user = await getCurrentUser();
  const id = uuidv4();
  const now = new Date().toISOString();

  if (user && isSupabaseConfigured) {
    const record = {
      id,
      user_id: user.id,
      title: title || 'Untitled Note',
      content: content || '',
      subject_id: subjectId || null,
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from('notes')
      .insert(record)
      .select()
      .single();

    if (error) {
      console.error('[StudyHub] Error inserting note:', error);
      throw error;
    }

    return {
      id: data.id,
      title: data.title,
      content: data.content,
      subjectId: data.subject_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  // Fallback to local IndexedDB
  const db = await getDB();
  const note = {
    id,
    title,
    content,
    subjectId,
    createdAt: now,
    updatedAt: now,
  };
  await db.add('notes', note);
  return note;
}

export async function updateNote(id, updates) {
  const user = await getCurrentUser();
  const now = new Date().toISOString();

  if (user && isSupabaseConfigured) {
    const dbUpdates = { updated_at: now };
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.content !== undefined) dbUpdates.content = updates.content;
    if (updates.subjectId !== undefined) dbUpdates.subject_id = updates.subjectId;

    const { data, error } = await supabase
      .from('notes')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[StudyHub] Error updating note:', error);
      throw error;
    }

    return {
      id: data.id,
      title: data.title,
      content: data.content,
      subjectId: data.subject_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  // Fallback to local IndexedDB
  const db = await getDB();
  const note = await db.get('notes', id);
  if (note) {
    const updated = { ...note, ...updates, updatedAt: now };
    await db.put('notes', updated);
    return updated;
  }
}

export async function deleteNote(id) {
  const user = await getCurrentUser();

  if (user && isSupabaseConfigured) {
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (error) {
      console.error('[StudyHub] Error deleting note:', error);
      throw error;
    }
    return;
  }

  // Fallback to local IndexedDB
  const db = await getDB();
  await db.delete('notes', id);
}
