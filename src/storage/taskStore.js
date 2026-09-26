import { getDB } from './db';
import { v4 as uuidv4 } from 'uuid';
import { supabase, isSupabaseConfigured, getCurrentUser } from './supabaseClient';

export async function getAllTasks() {
  const user = await getCurrentUser();
  if (user && isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[StudyHub] Error fetching tasks:', error);
      throw error;
    }

    return (data || []).map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      subjectId: t.subject_id,
      deadline: t.deadline,
      done: t.done,
      createdAt: t.created_at,
    }));
  }

  // Fallback to local IndexedDB
  const db = await getDB();
  const tasks = await db.getAll('tasks');
  return tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function getTasksBySubject(subjectId) {
  const user = await getCurrentUser();
  if (user && isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('subject_id', subjectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[StudyHub] Error fetching tasks by subject:', error);
      throw error;
    }

    return (data || []).map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      subjectId: t.subject_id,
      deadline: t.deadline,
      done: t.done,
      createdAt: t.created_at,
    }));
  }

  // Fallback to local IndexedDB
  const db = await getDB();
  const tasks = await db.getAllFromIndex('tasks', 'bySubject', subjectId);
  return tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function addTask({ title, description, subjectId, deadline }) {
  const user = await getCurrentUser();
  const id = uuidv4();
  const now = new Date().toISOString();

  if (user && isSupabaseConfigured) {
    const record = {
      id,
      user_id: user.id,
      title,
      description: description || '',
      subject_id: subjectId || null,
      deadline: deadline || null,
      done: false,
      created_at: now,
    };

    const { data, error } = await supabase
      .from('tasks')
      .insert(record)
      .select()
      .single();

    if (error) {
      console.error('[StudyHub] Error inserting task:', error);
      throw error;
    }

    return {
      id: data.id,
      title: data.title,
      description: data.description,
      subjectId: data.subject_id,
      deadline: data.deadline,
      done: data.done,
      createdAt: data.created_at,
    };
  }

  // Fallback to local IndexedDB
  const db = await getDB();
  const task = {
    id,
    title,
    description,
    subjectId,
    deadline,
    done: false,
    createdAt: now,
  };
  await db.add('tasks', task);
  return task;
}

export async function updateTask(id, updates) {
  const user = await getCurrentUser();

  if (user && isSupabaseConfigured) {
    const dbUpdates = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.subjectId !== undefined) dbUpdates.subject_id = updates.subjectId;
    if (updates.deadline !== undefined) dbUpdates.deadline = updates.deadline;
    if (updates.done !== undefined) dbUpdates.done = updates.done;

    const { data, error } = await supabase
      .from('tasks')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[StudyHub] Error updating task:', error);
      throw error;
    }

    return {
      id: data.id,
      title: data.title,
      description: data.description,
      subjectId: data.subject_id,
      deadline: data.deadline,
      done: data.done,
      createdAt: data.created_at,
    };
  }

  // Fallback to local IndexedDB
  const db = await getDB();
  const task = await db.get('tasks', id);
  if (task) {
    const updated = { ...task, ...updates };
    await db.put('tasks', updated);
    return updated;
  }
}

export async function deleteTask(id) {
  const user = await getCurrentUser();

  if (user && isSupabaseConfigured) {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) {
      console.error('[StudyHub] Error deleting task:', error);
      throw error;
    }
    return;
  }

  // Fallback to local IndexedDB
  const db = await getDB();
  await db.delete('tasks', id);
}

export async function toggleTaskDone(id) {
  const user = await getCurrentUser();

  if (user && isSupabaseConfigured) {
    // Fetch current state
    const { data: current } = await supabase
      .from('tasks')
      .select('done')
      .eq('id', id)
      .single();

    if (current) {
      return await updateTask(id, { done: !current.done });
    }
    return null;
  }

  // Fallback to local IndexedDB
  const db = await getDB();
  const task = await db.get('tasks', id);
  if (task) {
    task.done = !task.done;
    await db.put('tasks', task);
    return task;
  }
}

export async function getTaskStats() {
  const tasks = await getAllTasks();
  const total = tasks.length;
  const done = tasks.filter((t) => t.done).length;
  return { total, done, pending: total - done };
}
