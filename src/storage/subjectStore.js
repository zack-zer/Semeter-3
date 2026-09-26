import { getDB } from './db';
import { v4 as uuidv4 } from 'uuid';
import { deleteFile, deleteFolder } from './fileStore';
import { deleteTask } from './taskStore';
import { deleteNote } from './noteStore';
import { supabase, isSupabaseConfigured, getCurrentUser } from './supabaseClient';

export async function getAllSubjects() {
  const user = await getCurrentUser();
  if (user && isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[StudyHub] Error fetching subjects from Supabase:', error);
      throw error;
    }

    return (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      icon: row.icon,
      color: row.color,
      semester: row.semester,
      moduleType: row.module_type,
      code: row.code,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  // Fallback to local IndexedDB
  const db = await getDB();
  const subjects = await db.getAll('subjects');
  return subjects.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

export async function getSubjectById(id) {
  const user = await getCurrentUser();
  if (user && isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('[StudyHub] Error fetching subject by id:', error);
      throw error;
    }
    if (!data) return null;

    return {
      id: data.id,
      name: data.name,
      icon: data.icon,
      color: data.color,
      semester: data.semester,
      moduleType: data.module_type,
      code: data.code,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  // Fallback to local IndexedDB
  const db = await getDB();
  return await db.get('subjects', id);
}

export async function addSubject(name, icon, extra = {}) {
  const user = await getCurrentUser();
  const id = uuidv4();
  const now = new Date().toISOString();

  if (user && isSupabaseConfigured) {
    const record = {
      id,
      user_id: user.id,
      name,
      icon: icon || '📚',
      color: extra.color || null,
      semester: extra.semester || 'Semester 3',
      module_type: extra.moduleType || null,
      code: extra.code || null,
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from('subjects')
      .insert(record)
      .select()
      .single();

    if (error) {
      console.error('[StudyHub] Error inserting subject:', error);
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      icon: data.icon,
      color: data.color,
      semester: data.semester,
      moduleType: data.module_type,
      code: data.code,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  // Fallback to local IndexedDB
  const db = await getDB();
  const subject = {
    id,
    name,
    icon,
    createdAt: now,
    ...extra,
  };
  await db.add('subjects', subject);
  return subject;
}

export async function updateSubject(id, updates) {
  const user = await getCurrentUser();
  const now = new Date().toISOString();

  if (user && isSupabaseConfigured) {
    const dbUpdates = { updated_at: now };
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.icon !== undefined) dbUpdates.icon = updates.icon;
    if (updates.color !== undefined) dbUpdates.color = updates.color;
    if (updates.semester !== undefined) dbUpdates.semester = updates.semester;
    if (updates.moduleType !== undefined) dbUpdates.module_type = updates.moduleType;
    if (updates.code !== undefined) dbUpdates.code = updates.code;

    const { data, error } = await supabase
      .from('subjects')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[StudyHub] Error updating subject:', error);
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      icon: data.icon,
      color: data.color,
      semester: data.semester,
      moduleType: data.module_type,
      code: data.code,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  // Fallback to local IndexedDB
  const db = await getDB();
  const subject = await db.get('subjects', id);
  if (!subject) return null;
  const updated = { ...subject, ...updates };
  await db.put('subjects', updated);
  return updated;
}

export async function deleteSubject(id) {
  const user = await getCurrentUser();

  if (user && isSupabaseConfigured) {
    // Find all files in subject to delete from storage
    const { data: files } = await supabase
      .from('files')
      .select('id')
      .eq('subject_id', id);

    if (files && files.length > 0) {
      await Promise.all(files.map((f) => deleteFile(f.id)));
    }

    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[StudyHub] Error deleting subject:', error);
      throw error;
    }
    return;
  }

  // Fallback to local IndexedDB
  const db = await getDB();
  const fileIndex = db.transaction('files').store.index('bySubject');
  const files = await fileIndex.getAll(id);

  const folderIndex = db.transaction('folders').store.index('bySubject');
  const folders = await folderIndex.getAll(id);

  const taskIndex = db.transaction('tasks').store.index('bySubject');
  const tasks = await taskIndex.getAll(id);

  const noteIndex = db.transaction('notes').store.index('bySubject');
  const notes = await noteIndex.getAll(id);

  await Promise.all([
    ...files.map((f) => deleteFile(f.id)),
    ...folders.map((f) => deleteFolder(f.id)),
    ...tasks.map((t) => deleteTask(t.id)),
    ...notes.map((n) => deleteNote(n.id)),
  ]);

  await db.delete('subjects', id);
}
